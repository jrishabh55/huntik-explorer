import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import sharp from "sharp";
const root = process.argv[2] || "public";
async function json(p) {
  return JSON.parse(await readFile(path.join(root, "data", p), "utf8"));
}
const catalog = await json("catalog.json"),
  gallery = await json("gallery/index.json"),
  media = await json("media-info.json"),
  edges = await json("relationships.json");
assert.equal(catalog.entries.length, 2539);
assert.equal(catalog.aliases.length, 1075);
assert.equal(catalog.episodes.length, 52);
assert.equal(new Set(catalog.episodes).size, 52);
assert.equal(catalog.extras.length, 2);
assert.equal(edges.length, 5495);
const expected = { character: 228, titan: 233, tcg_card: 448 };
for (const [kind, count] of Object.entries(expected))
  assert.equal(catalog.entries.filter((e) => e.kind === kind).length, count);
for (const season of [1, 2])
  assert.deepEqual(
    catalog.entries
      .filter((e) => e.season === season)
      .map((e) => e.number)
      .sort((a, b) => a - b),
    Array.from({ length: 26 }, (_, i) => i + 1),
  );
const ids = new Set(catalog.entries.map((e) => e.id));
for (const a of catalog.aliases)
  if (a.target_id)
    assert.ok(
      ids.has(a.target_id) ||
        a.href?.startsWith("#/categories?") ||
        a.href?.startsWith("https://huntik.fandom.com/"),
      `Missing alias target ${a.title}`,
    );
assert.equal(gallery.length, 10028);
assert.equal(gallery.filter((i) => i.preview).length, 10024);
assert.equal(
  new Set(gallery.filter((i) => i.preview).map((i) => i.preview)).size,
  10018,
);
assert.equal(Object.keys(media).length, 10018);
let verified = 0;
const mediaKeys = Object.keys(media);
let cursor = 0;
const errors = [];
async function worker() {
  while (cursor < mediaKeys.length) {
    const p = mediaKeys[cursor++];
    try {
      const meta = await sharp(path.join(root, p)).metadata(),
        saved = media[p];
      assert.equal(meta.format, "webp");
      assert.ok(meta.width <= 720 && meta.height <= 720);
      assert.equal(meta.width, saved.width);
      assert.equal(meta.height, saved.height);
      if (saved.sourceTransparent)
        assert.ok(meta.hasAlpha, `Transparency lost: ${p}`);
      const cross = Math.abs(
        saved.width * saved.sourceHeight - saved.height * saved.sourceWidth,
      );
      assert.ok(
        cross <= Math.max(saved.sourceWidth, saved.sourceHeight) * 1.1,
        `Aspect ratio changed: ${p}`,
      );
      verified++;
    } catch (e) {
      errors.push(String(e));
    }
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
assert.equal(errors.length, 0, errors.slice(0, 12).join("\n"));
for (const entry of catalog.entries) {
  const record = await json("detail/" + entry.id.split(":").at(-1) + ".json");
  assert.equal(record.id, entry.id);
  assert.ok(record.raw_wikitext !== undefined);
  assert.ok(
    record.provenance?.source_url?.startsWith("https://huntik.fandom.com/"),
  );
  if (entry.image) assert.ok(media[entry.image]);
}
let bytes = 0,
  files = 0;
async function auditTree(dir) {
  for (const name of await readdir(dir)) {
    const p = path.join(dir, name),
      s = await stat(p);
    if (s.isDirectory()) {
      assert.ok(
        !["originals", "sources", "node_modules", ".git", "local"].includes(
          name,
        ),
        `Forbidden directory ${p}`,
      );
      await auditTree(p);
    } else {
      bytes += s.size;
      files++;
      assert.ok(
        !/local-supplements|reference\.json|\.zip$|\.db$|\.md$|\.py$/.test(
          name,
        ),
        `Forbidden publication file ${p}`,
      );
      if (name.endsWith(".json")) {
        const text = await readFile(p, "utf8");
        assert.ok(
          !/"(?:local_supplement_ids|original_path|packaged_path|diagnostic_rejected_source)"|\/Users\/|huntik:local-note:|huntik:transcript:/.test(
            text,
          ),
          `Private data in ${p}`,
        );
      }
    }
  }
}
await auditTree(root);
assert.ok(bytes < 750_000_000, `Publication is too large: ${bytes}`);
const report = {
  passed: true,
  publicPages: 2539,
  aliases: 1075,
  episodes: 52,
  characters: 228,
  titans: 233,
  cards: 448,
  relationships: 5495,
  imageRecords: 10028,
  downloadedImageRecords: 10024,
  sourceImageFiles: 10019,
  deduplicatedPreviews: verified,
  missingSourceImageReferences: 4,
  bytes,
  files,
  privacyAudit: "passed",
  imageSignaturesDimensionsTransparencyAspectRatios: "passed",
  checkedAt: new Date().toISOString(),
};
await writeFile("validation-report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
