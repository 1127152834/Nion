# Notebook Benchmark: Storage and Authoring Patterns

## Goal

Benchmark several notebook / knowledge-base systems from the perspective of:

- local storage ownership
- authoring ergonomics
- Markdown friendliness
- attachment layout
- long-term maintainability

This benchmark is intentionally scoped to storage and writing.

It does **not** benchmark:

- retrieval UX
- AI retrieval quality
- memory extraction
- OpenViking internals

## Evaluation Lens

Nion's target is:

- personal desktop second brain
- notebook root at `~/.nion-data/notebook`
- user-owned files
- Markdown as canonical format
- agent-assisted writing, but no autonomous mutation without user intent
- long-term maintainability outside Nion

That means the key question is not "which app is most powerful?"

The key question is:

**Which patterns preserve user file ownership and remain easy to maintain after years of use?**

## Systems Reviewed

- Obsidian
- Logseq
- SiYuan
- AppFlowy
- AFFiNE

## Benchmark Summary

| System | Local-first | File-first | Markdown-first | Attachment strategy | Best takeaway for Nion | Main mismatch for Nion |
|---|---|---|---|---|---|---|
| Obsidian | Yes | Yes | Yes | User-configurable attachment location, including same folder or subfolder under current note | Strongest model for file ownership and maintainability | Needs plugins to enforce stricter attachment consistency at scale |
| Logseq | Yes | Historically yes / now hybrid | Supports Markdown and Org-mode | Graph-oriented, page/block workflow | Good inspiration for local-first knowledge workflows and link culture | Current product direction is not as purely file-first and stable-path-oriented as Nion should be |
| SiYuan | Yes | No | Markdown WYSIWYG, but internal docs are not plain `.md` files | Global `assets` folder plus notebook-specific `.sy` JSON docs | Strong block model and rich PKM semantics | Internal storage is app-managed, not user-owned Markdown files |
| AppFlowy | Yes | No | Markdown import/export is possible, but storage is AppFlowy-managed data folder | App-managed data directory | Good lesson for configurable local data root | Workspace is app data, not notebook files as user truth source |
| AFFiNE | Yes | No | Supports Markdown import/export, but product is workspace/page/block-first | Workspace-centric | Strong writing + docs/canvas fusion ideas | Better thought of as a local-first workspace app than a filesystem-native notebook |

## Detailed Notes

### Obsidian

Obsidian is the strongest direct reference for Nion's notebook layer.

Why:

- attachments are regular files in the vault
- the default location for new attachments is configurable
- users can choose:
  - vault root
  - fixed folder
  - same folder as current note
  - subfolder under current folder

This is the closest match to the Nion requirement that notebook content remain human-owned and maintainable outside the app.

Official source:

- [Obsidian Help: Attachments](https://obsidian.md/help/attachments)

Important supporting ecosystem signals:

- community plugins exist specifically to make attachment placement and link maintenance more consistent
- that indicates Obsidian's file-first model scales well, but people eventually want stronger automation around consistency

Useful references:

- [obsidian-attachment-management](https://github.com/trganda/obsidian-attachment-management)
- [consistent-attachments-and-links](https://github.com/dy-sh/obsidian-consistent-attachments-and-links)

Most relevant ideas for Nion:

- configurable attachment placement
- note-local or note-adjacent attachment strategy
- relative links
- automatic link maintenance on rename/move
- optional "consistency pass" rather than mandatory storage rigidity

### Logseq

Logseq remains a useful product reference for local-first thinking and linked-note culture.

The current README presents it as:

- privacy-first
- knowledge management / collaboration
- support for Markdown and Org-mode
- local-first

Official source:

- [logseq/logseq](https://github.com/logseq/logseq)

The useful takeaway is not its exact storage model.
The useful takeaway is:

- notes should stay close to plain text
- linking and structure should feel natural during writing
- local-first matters

For Nion, Logseq is more useful as a workflow and philosophy reference than as a storage-contract reference.

### SiYuan

SiYuan is very strong in PKM features, but its storage model is not a match for Nion's notebook contract.

Its README explicitly states:

- it is local-first
- it supports block-level reference and Markdown WYSIWYG
- inserted assets go into `assets`
- notebook folders contain `.sy` files whose document data format is JSON
- third-party sync disks are not supported because data may be damaged

Official source:

- [SiYuan README](https://github.com/uptonking/siyuan-go)

What Nion should learn:

- block semantics can be powerful
- assets need a clear storage strategy
- delete/history semantics need to be explicit

What Nion should **not** copy:

- internal JSON document format
- app-managed workspace contract
- sync assumptions that reduce direct filesystem confidence

### AppFlowy

AppFlowy is useful as a lesson in configurable local storage roots, but it is not a good template for notebook-file ownership.

The official docs emphasize:

- a configurable local AppFlowy data folder
- importing and switching data folders
- app-managed internal storage structure

Official source:

- [AppFlowy Docs: Data Storage](https://docs.appflowy.io/docs/appflowy/product/data-storage)

This makes AppFlowy more like "local app data you control" than "files that remain your canonical notebook corpus".

For Nion, the good lesson is:

- let the user know where data lives
- make the root configurable when appropriate
- support import from an existing local store

But the storage philosophy is still more app-owned than what Nion wants.

### AFFiNE

AFFiNE is useful for writing experience inspiration, not for storage contract inspiration.

Current official materials position it as:

- privacy-focused
- local-first
- workspace-oriented
- docs + canvas + tables merged together

Official sources:

- [AFFiNE GitHub README](https://github.com/toeverything/AFFiNE)
- [AFFiNE Markdown import tutorial](https://affine.pro/blog/import-your-data-from-notion-into-affine)

Historical AFFiNE blog material also shows that Markdown import/export mattered because earlier internal formats were too AFFiNE-specific:

- [AFFiNE Alpha is coming!](https://affine.pro/blog/affine-alpha-is-coming)

That is a warning for Nion:

- once the storage model stops being plain files, export/import becomes a migration problem

AFFiNE is therefore best used as inspiration for:

- writing surface quality
- document organization feel
- docs/canvas duality as a future exploration

But not as a direct storage model.

## Plugins And Extension Ideas Worth Borrowing

The Obsidian plugin ecosystem is the most directly relevant.

### 1. Attachment Management

Reference:

- [obsidian-attachment-management](https://github.com/trganda/obsidian-attachment-management)

Relevant capabilities:

- attachment path templates based on note path/name
- automatic renaming
- folder-level or note-level overrides

Borrowable idea for Nion:

- keep a simple default attachment rule, but leave room for advanced future attachment policies

### 2. Consistent Attachments And Links

Reference:

- [consistent-attachments-and-links](https://github.com/dy-sh/obsidian-consistent-attachments-and-links)

Relevant capabilities:

- keep attachments near their notes
- maintain relative links
- move attachments with notes
- delete unused attachments carefully

Borrowable idea for Nion:

- note move / rename should be treated as knowledge-base consistency operations, not just filesystem moves

## Adopt / Adapt / Reject

### Adopt

- Obsidian-style file ownership
- Obsidian-style configurable attachment placement
- relative links for note and attachment references
- note-local attachment philosophy
- explicit history / consistency tooling rather than hidden magic

### Adapt

- Logseq's local-first and link-rich writing mindset
- AFFiNE's emphasis on writing experience and multi-surface knowledge work
- AppFlowy's configurable local data root concept
- SiYuan's seriousness about edit history and strong PKM semantics

### Reject

- app-owned proprietary document formats for notebook truth
- global attachment dumps as the only strategy
- requiring the app to be the sole safe editor of notebook data
- designs that make the notebook unreadable outside Nion
- storage models that require export to recover portability

## Final Recommendation For Nion v1

Nion should follow a file-first notebook model closest to Obsidian, with stronger built-in consistency guarantees inspired by its plugin ecosystem.

Recommended v1 posture:

- notebook files are plain Markdown
- folder structure is user-defined
- each note has a stable frontmatter `id`
- new attachments default to note-adjacent hidden asset folders
- links stay relative
- history and rollback are built into Nion instead of being left to plugins
- delete is recoverable and confirm-gated

In short:

- **Obsidian for storage philosophy**
- **Obsidian plugin ecosystem for consistency mechanics**
- **Logseq / AFFiNE / SiYuan for selective UX inspiration**
- **not** AppFlowy/AFFiNE/SiYuan-style app-owned workspace formats
