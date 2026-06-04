---
description: 'Register or update a term in the Marhiv taxonomy (docs/taxonomy.md). Use when the user wants to define project vocabulary so Claude and contributors share precise meaning for a component or concept.'
---

# Register Term

Add a new term — or update an existing one — in the project taxonomy at
`docs/taxonomy.md`. The taxonomy is the shared vocabulary for reasoning about
Marhiv's components; keeping it precise lets humans and agents mean the same
thing when they use a word.

## Input

Arguments: $ARGUMENTS

Interpret the arguments flexibly:

- **`Term: definition`** or **`Term - definition`** — register `Term` with the
  given definition.
- **A bare term** (e.g. `Content Script Host`) — register it; if no definition
  is supplied, draft a concise one from the current codebase, `CLAUDE.md`, and
  conversation context, then confirm it with the user before writing.
- **No arguments** — ask the user which term to register and what it means.

## Execution

### Step 1: Read the current taxonomy

Read `docs/taxonomy.md`. If it does not exist, create it using the structure
described in Step 4 (heading, intro, `## Conventions`, `## Terms`).

### Step 2: Resolve the term

- Determine the **canonical term name** in Title Case (e.g. `Enhancement API`).
- Check whether it (or an obvious synonym) already exists under `## Terms`.
  - **Exists** → this is an update: refine the definition, preserving any still-accurate notes and "see also" links.
  - **New** → this is an addition.
- Craft a **one-line definition** (a single sentence). Keep it concrete and
  free of marketing language. If the user gave a longer explanation, put the
  extra detail in a short notes paragraph below the definition.
- Identify related terms already in the taxonomy to cross-link via _see also_.

### Step 3: Confirm when inferring

If you drafted or substantially reworded the definition yourself (rather than
using text the user gave verbatim), show the proposed entry and ask for
confirmation before writing. If the user supplied the definition explicitly,
write it directly.

### Step 4: Write the entry

Each entry follows this format:

```markdown
### Term Name

One-sentence definition.

Optional notes paragraph for nuance, only when it adds value.

_See also: [Other Term](#other-term)._
```

Insert the entry under `## Terms` in **alphabetical order** by term name. When
updating an existing term, replace its entry in place. Keep the rest of the file
untouched.

If the file had to be created in Step 1, seed it with this skeleton before
inserting the term:

```markdown
# Marhiv Taxonomy

A shared vocabulary for reasoning about Marhiv's components. Add or update terms
with the `/register-term` skill.

## Conventions

- Terms are listed alphabetically.
- Each term has a one-line definition, optional notes, and optional _see also_ links.

## Terms
```

### Step 5: Report

Print a short confirmation noting whether the term was **added** or **updated**,
and show the final entry. Remind the user that `docs/taxonomy.md` is the
canonical reference and that Claude will use these definitions going forward.
