import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
const root = process.cwd(),
  source =
    process.env.HUNTIK_SOURCE ||
    path.resolve(root, "../reference-export-2026-10-26");
const jobs = JSON.parse(await readFile(".cache/image-jobs.json", "utf8"));
const max = Number(process.env.IMAGE_MAX || 720),
  quality = Number(process.env.IMAGE_QUALITY || 72);
let metadata = {};
try {
  metadata = JSON.parse(await readFile(".cache/media.json", "utf8"));
} catch {}
let cursor = 0,
  done = 0,
  failed = [];
await mkdir("public/media", { recursive: true });
sharp.concurrency(1);
async function worker() {
  while (cursor < jobs.length) {
    const job = jobs[cursor++];
    try {
      const dest = path.join(root, "public", job.target),
        key = `${job.sha256}:${max}:${quality}`;
      if (
        !metadata[job.target] ||
        metadata[job.target].key !== key ||
        !(await stat(dest).catch(() => null))
      ) {
        let input = path.join(source, job.source);
        if (job.source.toLowerCase().endsWith(".ico"))
          input = execFileSync(
            process.env.IMAGE_PYTHON || ".cache/image-env/bin/python",
            [
              "-c",
              "from PIL import Image; import sys; Image.open(sys.argv[1]).save(sys.stdout.buffer,format='PNG')",
              input,
            ],
          );
        const original = await sharp(input, {
          limitInputPixels: 150000000,
        }).metadata();
        await sharp(input, { limitInputPixels: 150000000 })
          .rotate()
          .resize(max, max, { fit: "inside", withoutEnlargement: true })
          .webp({ quality, alphaQuality: 100 })
          .toFile(dest);
        const output = await sharp(dest).metadata();
        if (
          output.format !== "webp" ||
          output.width > max ||
          output.height > max
        )
          throw Error("Invalid converted image");
        metadata[job.target] = {
          key,
          width: output.width,
          height: output.height,
          sourceWidth: original.width,
          sourceHeight: original.pageHeight || original.height,
          alpha: output.hasAlpha,
          sourceAlpha: original.hasAlpha,
          animated: (original.pages || 1) > 1,
          bytes: (await stat(dest)).size,
        };
      }
      if (metadata[job.target].sourceTransparent === undefined) {
        metadata[job.target].sourceTransparent = metadata[job.target]
          .sourceAlpha
          ? metadata[job.target].alpha ||
            !(await sharp(path.join(source, job.source)).stats()).isOpaque
          : false;
      }
      done++;
      if (done % 500 === 0) {
        console.log(`${done}/${jobs.length} verified previews`);
        await writeFile(".cache/media.json", JSON.stringify(metadata));
      }
    } catch (error) {
      failed.push({ source: job.source, error: String(error) });
    }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
await writeFile(".cache/media.json", JSON.stringify(metadata));
await writeFile(
  "public/data/media-info.json",
  JSON.stringify(
    Object.fromEntries(
      Object.entries(metadata).map(([k, { key, ...v }]) => [k, v]),
    ),
  ),
);
const bytes = Object.values(metadata).reduce((n, m) => n + m.bytes, 0);
console.log(
  JSON.stringify({ previews: done, bytes, failures: failed }, null, 2),
);
if (failed.length) process.exitCode = 1;
