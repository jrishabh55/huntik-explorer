import { useState } from "react";
import { Upload, FileJson, ShieldCheck, BookOpen } from "lucide-react";
import type { Catalog, Supplement } from "../types";
import { parseSupplements } from "../domain";
import { useData } from "../data";
import { PageHeading, Loading, SourceLink } from "./Common";
export function Info({
  catalog,
  supplements,
  onImport,
}: {
  catalog: Catalog;
  supplements: Supplement[];
  onImport: (s: Supplement[]) => void;
}) {
  const { data: info, error } = useData<any>("info.json");
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function readFile(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > 250_000_000)
        throw Error(
          "This file is too large. Use the smaller local-supplements.json file.",
        );
      const rows = parseSupplements(
        JSON.parse(await file.text()),
        new Set(catalog.episodes),
      );
      onImport(rows);
      setMessage(
        `Imported ${rows.length} notes and transcripts. Open an episode’s My notes tab to read them.`,
      );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Unable to read this JSON file.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!info) return <Loading error={error} />;
  return (
    <>
      <PageHeading
        eyebrow="A REFERENCE WORTH EXPLORING"
        title="About the archive"
        description="A complete public wiki snapshot, with sources close at hand."
      />
      <div className="info-grid">
        <section className="info-card">
          <BookOpen />
          <h2>The collection</h2>
          <p>
            Captured on <strong>26 October 2026</strong> from Huntik Wiki.
            Browse {info.public_pages.toLocaleString()} pages, 1,075 aliases, 52
            regular episodes plus 2 extras, 228 character profiles, 233 Titans
            and Void separately.
          </p>
          <p>
            The visual archive includes 10,024 downloaded image records and four
            missing source references. Identical files share a preview; each
            file retains its source identity and attribution.
          </p>
          <p>
            Relationships are derived from public infobox fields. Their
            direction and original field labels are preserved. General article
            links remain navigation.
          </p>
        </section>
        <section className="info-card">
          <ShieldCheck />
          <h2>Sources & rights</h2>
          <p>
            Text is adapted from{" "}
            <SourceLink href={info.source}>Huntik Wiki contributors</SourceLink>{" "}
            under{" "}
            <SourceLink href={info.text_license.url}>
              {info.text_license.label}
            </SourceLink>
            . Each record links to its source revision and contributor history.
          </p>
          <p>{info.image_rights_note}</p>
          <p>
            This application reformats and links the source material. Images are
            resized for browsing; the gallery links to their public
            full-resolution sources.
          </p>
        </section>
      </div>
      <section className="import-panel">
        <div>
          <p className="eyebrow">YOUR PRIVATE READING LAYER</p>
          <h2>Bring your notes along</h2>
          <p>
            Open <strong>local-supplements.json</strong> or your full{" "}
            <strong>reference.json</strong> to add notes and automatic captions
            to episode pages. The file is read only in this browser and is never
            uploaded. Imported text stays in memory until you reload or clear
            it.
          </p>
          <p>
            Automatic captions retain their quality labels. They may contain
            incorrect names, words or timing.
          </p>
        </div>
        <div className="import-controls">
          <label className="button primary file-button">
            <Upload size={18} />
            {busy ? "Reading your file…" : "Choose local JSON"}
            <input
              type="file"
              accept=".json,application/json"
              disabled={busy}
              onChange={(e) => {
                void readFile(e.target.files?.[0]);
                e.target.value = "";
              }}
              aria-label="Import local notes and transcripts"
            />
          </label>
          {supplements.length > 0 && (
            <button
              onClick={() => {
                onImport([]);
                setMessage("Imported notes cleared from this session.");
              }}
            >
              Clear {supplements.length} imported records
            </button>
          )}
          <p className="muted">
            <FileJson size={15} /> No upload. No account.
          </p>
        </div>
        {message && (
          <p role="status" className="notice import-message">
            {message}
          </p>
        )}
      </section>
      <section className="info-section">
        <h2>Reading the data</h2>
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Meaning</th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                "Stable ID",
                "Every public record keeps its original huntik:page ID. Aliases resolve to canonical entries.",
              ],
              [
                "Profiles & sections",
                "All available public sections and structured fields are preserved. Raw source and JSON downloads are available on every record.",
              ],
              [
                "Titan stats",
                "Base and Powerbonded values stay separate. Missing numbers are Unknown, never zero.",
              ],
              [
                "Images",
                "Portraits come from source primary-image assignments. Missing or generic source placeholders are explicitly labeled.",
              ],
              [
                "Relationships",
                "Derived from source fields with subject, predicate, object and wiki revision. Generic fields are labeled source field links.",
              ],
              [
                "Personal collection",
                "Bookmarks and comparison IDs are stored in this browser. JSON/CSV exports contain the current filtered results.",
              ],
              [
                "Known source gaps",
                "4 missing image references, 64 missing internal link targets and 12 unresolved citation labels remain documented rather than invented.",
              ],
            ].map(([k, v]) => (
              <tr key={k}>
                <th>{k}</th>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="notice">
        All 2,539 public pages are reachable through search and All collections,
        including supporting lore. Categories preserve the source taxonomy.
        Local notes, captions and unrelated private files are not included in
        the public archive.
      </p>
    </>
  );
}
