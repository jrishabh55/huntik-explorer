import { X, Plus, Scale } from "lucide-react";
import type { Catalog } from "../types";
import { PageHeading, Picture } from "./Common";
import { profileHref } from "../domain";
export function Compare({
  catalog,
  ids,
  onCompare,
}: {
  catalog: Catalog;
  ids: string[];
  onCompare: (id: string) => void;
}) {
  const entries = ids
    .map((id) => catalog.entries.find((e) => e.id === id))
    .filter((e) => e?.kind === "titan");
  return (
    <>
      <PageHeading
        eyebrow="UNDERSTAND THEIR POWER"
        title="Compare Titans"
        description="Up to four Titans, side by side. Unknown values stay unknown."
      />
      <div className="compare-picker">
        <label>
          Add a Titan
          <select
            aria-label="Add Titan to comparison"
            value=""
            disabled={entries.length >= 4}
            onChange={(e) => e.target.value && onCompare(e.target.value)}
          >
            <option value="">Choose a Titan…</option>
            {catalog.entries
              .filter((e) => e.kind === "titan" && !ids.includes(e.id))
              .sort((a, b) => a.title.localeCompare(b.title))
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
          </select>
        </label>
        <a href="#/browse?kind=titan" className="button">
          <Plus size={16} />
          Browse all Titans
        </a>
        <span>{entries.length} / 4 selected</span>
      </div>
      {entries.length ? (
        <div className="table-scroll compare-table">
          <table>
            <thead>
              <tr>
                <th>Field</th>
                {entries.map((e) => (
                  <th key={e!.id}>
                    <button
                      className="remove-compare"
                      aria-label={"Remove " + e!.title}
                      onClick={() => onCompare(e!.id)}
                    >
                      <X size={16} />
                    </button>
                    <Picture src={e!.image} alt={e!.title} />
                    <a href={profileHref(e!.id)}>{e!.title}</a>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Type", "type"],
                ["Size", "size"],
                ["Base attack", "attack"],
                ["Base defense", "defense"],
                ["Powerbonded attack", "powerbonded_attack"],
                ["Powerbonded defense", "powerbonded_defense"],
                ["Base ability", "special_ability"],
                ["Powerbonded ability", "powerbonded_special_ability"],
                ["Height", "height"],
                ["Weight", "weight"],
                ["Known users", "users"],
                ["Source classes / factions", "class"],
              ].map(([label, key]) => (
                <tr
                  key={key}
                  className={
                    [
                      "attack",
                      "defense",
                      "powerbonded_attack",
                      "powerbonded_defense",
                    ].includes(key)
                      ? "numeric-row"
                      : ""
                  }
                >
                  <th>{label}</th>
                  {entries.map((e) => (
                    <td key={e!.id}>
                      {String(
                        e!.stats[key] ??
                          e!.facets[key]?.join(", ") ??
                          "Unknown",
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <Scale size={36} />
          <h2>Build your Titan lineup</h2>
          <p>Add Titans above, or use Compare on any Titan card.</p>
        </div>
      )}
      <p className="notice">
        Base and Powerbonded figures are separate source values. A question mark
        or “Unknown” means the source does not provide a numeric value.
      </p>
    </>
  );
}
