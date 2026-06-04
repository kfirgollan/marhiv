# Marhiv Taxonomy

A shared vocabulary for reasoning about Marhiv's components. When a term is
defined here, use it precisely — in code, docs, commits, and conversation — so
that everyone (humans and agents) means the same thing.

Add or update terms with the `/register-term` skill rather than editing this
file by hand, so entries stay consistently formatted.

## Conventions

- Terms are listed **alphabetically**.
- Each term has a one-line **definition**, optional **notes**, and optional
  **see also** links to related terms.
- Prefer the canonical term over synonyms; list synonyms under the canonical
  entry so they remain searchable.

## Terms

### Enhancement API

The shared contract that both **Plugins** and **Userscripts** use to read and
modify the chat UI, register commands, add UI, and persist settings. The
keystone abstraction of the project — anything a Plugin can do should be
expressible through it.

_See also: [Plugin](#plugin), [Userscript](#userscript)._

### Menu Ball

The circular control that appears when a supported page loads; it is the user's
primary entry point for interacting with Marhiv.

On hover it reveals a handle bar. As the main interaction surface, it is where
user-facing enhancement controls are surfaced.

### Plugin

A curated, first-party enhancement that lives in this repo and is published to
the **Registry**. Each Plugin declares the AI sites it targets and the behavior
it adds. The "Oh My Zsh" half of the model: vetted, installable, configurable.

_See also: [Userscript](#userscript), [Registry](#registry), [Enhancement API](#enhancement-api)._

### Registry

The format and tooling for publishing and installing community **Plugins**.

_See also: [Plugin](#plugin)._

### Userscript

A sandboxed, user-authored, site-matched script for cases curated **Plugins**
don't cover. The "Tampermonkey" half of the model: an escape hatch for power
users, treated as untrusted and run through the **Enhancement API**.

_See also: [Plugin](#plugin), [Enhancement API](#enhancement-api)._
