# Huntik Explorer

An unofficial visual Holotome for Huntik: Secrets & Seekers, built from a verified public wiki snapshot dated 26 October 2026.

## Use

Search names, aliases and full article text; filter real source fields; save bookmarks in this browser; compare up to four Titans. Open profiles for every source section, appearances, galleries, citations and exact raw records. The Connections view follows labeled infobox relationships. The image gallery provides source attribution and original-resolution links. JSON/CSV buttons export the currently filtered records.

**Private supplements:** About the archive → Choose local JSON accepts `local-supplements.json` or a full `reference.json`. Notes and automatic captions appear under each episode’s My notes tab. Import is entirely local, makes no upload and is held in memory until reload/clear. Public build assets exclude private supplements.

## Run locally

Node 22.12+ or Node 24, Python 3.9+ for data preparation and tests.

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
npm ci
npm test
npm run build
npm run preview
```

The committed `public/` directory contains the prepared public data and optimized previews. No source archive is needed to build or deploy. GitHub Actions installs the pinned Python dependency before running tests. `npm run build` audits readable prose for leaked wiki delimiters, counts, alias routes, every preview’s image signature/dimensions/transparency/aspect ratio, forbidden private fields and a strict 750MB site budget. The browser loads a compact catalog at startup, article text only when searching, individual profiles on demand, and paginated images.

## Reproduce the public snapshot assets

Set `HUNTIK_SOURCE` to the verified archive directory (defaults to the sibling `reference-export-2026-10-26`). The preparation step reads specific public collections only; it never opens `reference.json`, local supplements, ZIPs or private workspace files.

```sh
python3 -m venv .cache/image-env
.cache/image-env/bin/pip install Pillow==11.3.0
npm run prepare:data
npm run audit
```

Pillow handles the single ICO source image; Sharp handles all other formats. `IMAGE_PYTHON` can point to an existing Python with Pillow. `IMAGE_MAX` and `IMAGE_QUALITY` default to 720 and 72. `.cache/` stores conversion results keyed by content hash and settings. All 10,019 local source image files are represented by 10,018 distinct byte-content previews; 10,024 image records retain separate source identities. Four further image references are missing at source. Animated images use static previews and link to their public original.

## Architecture

- `scripts/prepare.py`: public allowlist, source fidelity, prose cleanup, source-aware links, compact catalogs, lazy detail/gallery chunks.
- `scripts/wiki_text.py`: syntax-tree rendering with mwparserfromhell; nested links, image captions, citations and content tables are rebuilt from preserved wikitext.
- `scripts/images.mjs`: cached image conversion and metadata.
- `scripts/audit.mjs`: full publication verification and `validation-report.json`.
- `src/domain.ts`: search/filter/sort, comparison, import validation, exports and relationship semantics.
- `src/data.ts`: cached on-demand requests and hash routes.
- `src/components/`: independent archive, profile, image, graph, comparison and information views.
- `tests/`: substantive source/transformation and interaction regression checks.

Hash routes and Vite’s relative base preserve fresh loads, deep links and back navigation under a GitHub Pages repository subpath. All rendered source/import content is React text, never executable HTML. HTTP(S) source links are validated. Local storage contains bookmark and comparison IDs only.

## Deploy

The GitHub Actions workflow builds and audits the committed public assets on pushes to `codex/huntik-explorer`. Configure the repository’s Pages publishing source as **GitHub Actions**. It uploads only `dist/`.

## Attribution

Wiki text: [Huntik Wiki contributors](https://huntik.fandom.com), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Individual profiles preserve source revisions, contributors and original wikitext. Presentation and text cleanup are adaptations.

Images retain their individual rights and source file-page assertions; they do not inherit the wiki text license. Inspect each gallery image’s file page and rights metadata. This is an unofficial fan reference, not an official Huntik product.
