# Release verification — 26 October 2026

The initial release received one fresh independent source review. Its template-rendering, hidden-filter and mobile-focus findings were addressed. Focused regressions were observed failing before the corresponding fixes. No review findings remain deferred.

## Automated verification

- 15 TypeScript interaction/domain tests and 6 Python transformation/source tests pass.
- TypeScript typecheck and Vite production build pass.
- Publication audit validates every public detail record and all 10,018 deduplicated WebP previews: signatures, dimensions, meaningful transparency, aspect ratios, source references and missingness.
- Public data: 2,539 pages, 1,075 aliases, 228 characters, 233 Titans plus Void, 52 ordered regular episodes plus 2 extras, 448 cards, 5,495 relationship records.
- Images: 10,024 downloaded records represent 10,019 local source paths and 10,018 distinct byte-content previews. Four further references are missing at source.
- Measured production site: 285,048,892 bytes. Previews: 215,167,236 bytes. Startup catalog: 1,286,216 bytes. Full article search is a separate, lazy 4,201,620-byte asset.
- Publication scan rejects private supplements, notes, transcripts, original local paths, source archive folders, ZIPs and databases. Only the isolated app repository is pushed.

## Actual browser verification

Tested the built production preview with the supported in-app browser:

- Desktop 1280px: home, real Titan cards, Caliban profile and source links, gallery, graph and comparison rendered correctly with no browser console errors.
- Mobile 390×844: no document horizontal overflow; closed sidebar is hidden from keyboard focus; menu opens and navigates to episodes.
- Caliban 8/4 base and 7/7 Powerbonded; Sabriel 3/2 base with unknown Powerbonded values displayed correctly side by side.
- Caliban’s 296-image gallery is paginated 36 at a time. Lightbox displays file rights and original-resolution links. ArrowRight changes image; Escape closes it.
- Graph default shows Lok’s actual family, residences and factions. Recenter to Caliban shows its three source-listed users. General mission membership fields are available only through an explicit source-field selection.
- Imported all 54 local notes/transcripts entirely in browser memory; episode one shows two local records and the automatic-caption quality label. Reload clears the import as documented.
- Exported Titan CSV was parsed back and contains 233 rows, including exact Caliban base/Powerbonded fields.
- Germany alias opens its local category, parent categories, subcategory, articles and associated-image links.
- Episode browser defaults to chronological order. The home episode-one action opens A Seeker Is Born directly; browser Back restores the home view.
- Lok’s Bonded Titans section retains 20 readable source rows; international episode titles and template-based profile tables are rendered as readable content.

## Scope and source limitations

Source facts and missing values remain those of the public wiki snapshot. Raw records and source revisions allow inspection. Animated files use static previews linked to animated originals. Private supplements remain opt-in and are never included in published assets. Image copyright is separate from the wiki text’s CC BY-SA 3.0 license.

## Verified publication

- Live app: https://jrishabh55.github.io/huntik-explorer/
- Repository: https://github.com/jrishabh55/huntik-explorer
- Release commit: `38e168bae3b503a9a57e5add1b08f2d5ed19b57e`
- GitHub Actions run40318379932: build, tests, complete payload audit, artifact upload and deployment succeeded. The Pages environment allows the exact app branch.
- Live browser loaded the home page and all three hero previews, opened episode one, reloaded its repository-subpath deep link successfully and rendered its international titles. Browser error log was empty.

## Wiki prose parser repair — 26 October 2026

The production Lok Lambert page displayed `for the first time]]` under History; Dante Vale and The Spiral Mark reproduced the same failure. Both the archive's lossy text projection and the app's regex stopped an outer File link at an inner link's closing delimiter. React rendered the already-malformed generated JSON.

The app now uses pinned `mwparserfromhell==0.7.2` to render complete syntax nodes from preserved raw source. Captions, nested display links, source citations, lists and content-table parameters remain readable. The source archive is unchanged. Narrow source-typo handling covers a duplicated category closer, two malformed Source citations and a stray international-name brace; original wikitext remains exact.

- Before: 96 article records, 232 readable fields, 384 leaked wiki delimiters; 93 records affected in visible prose.
- After: 2,539 article records, 43,638 readable fields and 2,539 search entries audited with zero unintended delimiter leaks. Three category-help fields contain explicitly allowed literal syntax examples; raw-source fields are deliberately excluded.
- Retention audit: all 55,432 checked semantic spans across 4,757 sections survive, including 253 inline image captions, 2,735 gallery captions and 607 content templates. Layout templates and image filenames/options are excluded. All 227 substantially shorter sections are explained by removing gallery filenames/options while retaining captions.
- All 15 TypeScript tests and 18 Python tests pass. New cases reproduce the original failures, piped caption links, gallery options, table cells, citations, literal nowiki examples, pronunciation apostrophes and the complete data-preparation path. Failing regressions were observed before their fixes.
- Production build and publication/privacy/image audits pass; site size is 282,630,150 bytes. Image binaries, image metadata and relationship data have no diff. Raw article/section source, factual stats, IDs, categories and image associations match the archive. Recorded SHA-256 checks confirm the source inputs and private supplements are unchanged.
- Actual local browser checks: Lok, Dante and The Spiral Mark show complete captions without dangling delimiters; History remains a real heading; A Seeker Is Born retains international titles; source/citation controls remain available. The independent code review found no important issues.
- CI explicitly sets up Python and installs requirements before `npm test`. `npm run build` runs both the readable-field scan and source-span retention audit against `dist/`.
