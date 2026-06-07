---
description: "Audit Marhiv against the Chrome Web Store Developer Program Policies before publishing — checks the manifest, permissions, remote-code surface, userscript handling, single purpose, and the dashboard/privacy fields against Google's rules and reports findings by severity. Use before a store submission, after touching the manifest/permissions, or when adding anything that loads or runs external code (plugins registry, userscripts)."
---

# Extension Review

Run a pre-submission compliance audit of Marhiv against the **Chrome Web Store
Developer Program Policies**. The goal is to catch the things that get an
extension **rejected at review** or **removed after listing** — before we submit
— and to produce an actionable report with severities and `file:line`
references.

This skill is the standing checklist so we don't re-research the policies each
time. The embedded rules reflect Google's policies as of mid-2025; **policies
change**, so Step 1 re-verifies the high-risk ones against the live docs.

## Input

Arguments: $ARGUMENTS

Interpret flexibly:

- **No arguments** — run the full audit across every section below.
- **A section name** (e.g. `permissions`, `remote-code`, `userscripts`,
  `single-purpose`, `privacy`, `listing`) — audit just that section.
- **`--fix`** — additionally apply safe, mechanical fixes (e.g. remove a
  provably-unused permission) and note each change. Never weaken a quality gate
  or broaden a permission to "fix" a finding.
- **`--report`** — write the findings to `docs/extension-review.md` (overwrite)
  in addition to printing them.

## Why this matters for Marhiv specifically

Marhiv's design (a **plugin framework**, a **userscript escape hatch**, and a
planned community **registry**) sits directly on top of Google's two strictest
policies — **remotely hosted code** and the **User Scripts API**. Most generic
extensions never touch these; Marhiv's core value proposition does. Weight the
audit accordingly: the remote-code and userscript sections are the ones most
likely to block a launch.

## The policy model (what reviewers enforce)

Five pillars, each a rejection vector:

1. **Single purpose** — one narrow, discernible purpose; permissions and
   behavior must serve it.
2. **Minimum permissions** — request the narrowest permission that works; if two
   could do it, pick the lower-access one; declare nothing you don't use.
3. **No remotely hosted code (MV3)** — all executable logic ships in the package
   and is reviewable. External resources may carry **data/config, never logic**.
   The **only** sanctioned ways to run external logic are the **`chrome.debugger`**
   and **`chrome.userScripts`** APIs.
4. **User data / Limited Use** — disclose collection, get consent, post the
   Limited Use statement; no selling/transferring data, no personalized ads, no
   human review (narrow exceptions only). A privacy policy URL is required if you
   collect _anything_, including error logs.
5. **Transparency & quality** — accurate listing/metadata, real utility, no
   deception, no review manipulation, tested (packed) build.

## Execution

### Step 1: Re-verify the volatile policies (live)

Policies drift. Before auditing, fetch the current text for the two areas that
change most and most affect Marhiv, and reconcile any drift with the rules
embedded below:

- Remotely hosted code: `https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements`
- User Scripts API state: `https://developer.chrome.com/blog/chrome-userscript`
  and `https://developer.chrome.com/docs/extensions/reference/api/userScripts`

If a fetch fails (offline), proceed with the embedded rules and **flag in the
report that live verification was skipped**. Note the date of any policy text you
rely on.

### Step 2: Gather the evidence

Read and grep the real code — never assume. At minimum:

- `manifest.config.ts` — the source of truth for `permissions`,
  `host_permissions`, `content_scripts[].matches`, `web_accessible_resources`,
  `content_security_policy`. Read it fully.
- `package.json` — `name`, `version`, `description`, homepage; the listing must
  match reality.
- `src/content/*` — what each content script actually does and where it runs.
- The plugin/registry surface — `src/plugins/registry.ts`,
  `src/plugins/manager.ts`, `src/plugins/context.ts`, `src/plugins/builtin/*`.
- Any userscript surface, if it exists yet.

Targeted greps across `src/` and config (record hits with `file:line`):

- Remote code / network: `eval(`, `new Function(`, `<script`, `import(` with a
  non-relative/URL specifier, `fetch(`, `XMLHttpRequest`, `WebSocket`,
  `.innerHTML`/`insertAdjacentHTML` with non-constant input, `setAttribute('src'`,
  injecting `<script src=…>`.
- Userscripts: `chrome.userScripts`, `userScripts` permission, `world: 'MAIN'`,
  references to executing user-authored code.
- Permission usage: for each declared permission/API, grep for the
  corresponding `chrome.*` call that justifies it.
- Data handling: `chrome.storage`, `cookies`, `history`, analytics/telemetry
  endpoints, logging that ships data off-device.

### Step 3: Evaluate each section against the criteria

For every finding assign a **severity**:

- **🔴 Blocker** — will be rejected at review or removed after listing (e.g.
  runtime-fetched plugin logic, an unused broad host permission, missing privacy
  policy while collecting data, undeclared remote code).
- **🟡 Warning** — likely to draw scrutiny, slow review, or fail under a stricter
  reviewer (e.g. vague single-purpose text, `.innerHTML` with dynamic input,
  permission broader than needed but used).
- **🔵 Info** — not a violation now, but a dashboard field to fill, a doc to
  write, or a design decision to confirm before submitting.

**Permissions.** Build a table: each declared permission / host permission →
the code that uses it (`file:line`) → verdict. Flag any permission with no
corresponding usage (Blocker — over-permissioning is the #1 rejection reason).
Flag any host permission broader than the content scripts' `matches`. Confirm
no `<all_urls>` unless every narrower option is genuinely insufficient.

**Remote code (MV3).** This is Marhiv's highest-risk area. Determine, from the
code, whether any **executable logic** originates outside the package:

- Does the registry / plugin loader **fetch and run** plugin code at runtime?
  → Blocker. Plugins must ship in the package (reviewable) or run via
  `chrome.userScripts`. A registry that ships new versions _through CWS releases_
  (catalog/updater, not a runtime code loader) is fine.
- Any `<script src=remote>`, `eval`/`new Function` on fetched strings, or an
  interpreter that executes remote "data" as logic → Blocker.
- `fetch`/network for **data/config/images only** is allowed — confirm the
  response is never executed as logic.

**Userscripts.** If a userscript feature exists or is planned:

- It must run through **`chrome.userScripts`** (the sanctioned exception), with
  the `"userScripts"` permission and matching `host_permissions`.
- Account for the **Chrome 138 (2025)** change: users must enable a per-extension
  **"Allow user scripts"** toggle; new installs default it **OFF**. The UX must
  guide users to the toggle or the feature silently no-ops — flag if onboarding
  doesn't.
- Remote code must be **declared and justified** in the dashboard — flag as an
  Info item to complete.

**Single purpose.** Marhiv reads as a "framework for anything," which can trip
the single-purpose and minimum-utility checks. Confirm there's a tight
single-purpose statement framing it as enhancing AI-chat UX (not "a platform for
arbitrary code"), and that host permissions match that purpose.

**User data / privacy.** Determine what data (if any) leaves the device or is
stored. Then check the **dashboard fields** that must be filled before publish:
single-purpose description, per-permission justification, remote-code
declaration, data-usage checkboxes + certification, and a **privacy policy URL**
(required if _any_ data — including error logs — is collected). If the Limited
Use statement isn't posted, flag it. These are mostly **Info** (dashboard work),
but a missing privacy policy while collecting data is a **Blocker**.

**Listing & quality.** Listing metadata matches the build (name, description,
version, screenshots); no misleading claims, keyword stuffing, or review
manipulation; the **packed** build has been tested. Flag gaps as Warning/Info.

### Step 4: Report

Print a structured report. Lead with a one-line **verdict**
(_submittable / blockers present / needs dashboard work_), then findings grouped
by severity, each with: the policy it touches, the evidence (`file:line` or
manifest field), why it's a problem, and the concrete fix. End with a
**pre-submission checklist** of the dashboard fields and the Limited Use
statement (the parts that live outside the code and can't be auto-verified).

If `--report` was passed, also write the same content to
`docs/extension-review.md`. If `--fix` was passed, list each applied fix and
re-run the affected check.

Be honest about confidence: distinguish "verified against the code" from
"requires a human/dashboard check." Don't claim the extension is submittable —
only that the code-checkable parts pass and which manual steps remain.

## Sources (re-verify; policies change)

- [Developer Program Policies](https://developer.chrome.com/docs/webstore/program-policies)
- [Additional Requirements for Manifest V3](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)
- [Best Practices and Guidelines](https://developer.chrome.com/docs/webstore/program-policies/best-practices)
- [Fill out the privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Limited Use policy](https://developer.chrome.com/docs/webstore/program-policies/limited-use)
- [Deal with remote hosted code violations](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code)
- [chrome.userScripts API](https://developer.chrome.com/docs/extensions/reference/api/userScripts)
- [Enabling chrome.userScripts is changing (Chrome 138)](https://developer.chrome.com/blog/chrome-userscript)
