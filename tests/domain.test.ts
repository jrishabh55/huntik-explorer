import { describe, it, expect } from "vitest";
import {
  filterEntries,
  compareIds,
  parseSupplements,
  toCsv,
  safeUrl,
  neighborhood,
} from "../src/domain";
const entries: any[] = [
  {
    id: "1",
    title: "Caliban",
    kind: "titan",
    aliases: ["Warrior"],
    summary: "Ancient",
    categories: ["Meso-Titans"],
    facets: { size: ["Average"] },
    stats: { attack: 8 },
  },
  {
    id: "2",
    title: "Sabriel",
    kind: "titan",
    aliases: [],
    summary: "",
    categories: [],
    facets: { size: ["Average"] },
    stats: { attack: null },
  },
];
describe("reference interactions", () => {
  it("finds aliases and full article text with all query words", () => {
    expect(filterEntries(entries, "warrior", {}).map((x) => x.id)).toEqual([
      "1",
    ]);
    expect(
      filterEntries(entries, "truth shield", {}, { "2": "a truth shield" }).map(
        (x) => x.id,
      ),
    ).toEqual(["2"]);
  });
  it("filters actual categories and sorts unknown stats after known", () => {
    expect(filterEntries(entries, "", { category: "Meso-Titans" }).length).toBe(
      1,
    );
    expect(
      filterEntries(entries, "", { sort: "attack" }).map((x) => x.id),
    ).toEqual(["1", "2"]);
  });
  it("limits comparisons to four without discarding existing selection", () => {
    expect(compareIds(["1", "2", "3", "4"], "5")).toEqual(["1", "2", "3", "4"]);
    expect(compareIds(["1", "2"], "1")).toEqual(["2"]);
  });
  it("imports only valid episode supplements and preserves automatic quality", () => {
    const result = parseSupplements(
      {
        local_supplements: [
          {
            kind: "transcript",
            episode_id: "ep",
            caption_type: "Auto-generated",
            segments: [{ text: "Hello", start_seconds: 1 }],
          },
        ],
      },
      new Set(["ep"]),
    );
    expect(result[0].quality).toContain("Auto-generated");
    expect(result[0].text).toContain("Hello");
    expect(() => parseSupplements({ pages: [] }, new Set(["ep"]))).toThrow();
    expect(() =>
      parseSupplements(
        [{ episode_id: "unknown", kind: "episode_note", text: "x" }],
        new Set(["ep"]),
      ),
    ).toThrow();
  });
  it("keeps imported HTML as inert text and prevents CSV formulas", () => {
    expect(
      parseSupplements(
        [
          {
            episode_id: "ep",
            kind: "episode_note",
            text: "<script>bad()</script>",
          },
        ],
        new Set(["ep"]),
      )[0].text,
    ).toBe("<script>bad()</script>");
    expect(toCsv([{ title: "=1+1", summary: 'a,b\n"c"' }])).toContain("'=1+1");
    expect(toCsv([{ title: "a", summary: "a,b" }])).toContain('"a,b"');
  });
  it("rejects unsafe source URLs", () => {
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("https://huntik.fandom.com")).toBeTruthy();
  });
  it("bounds graph and distinguishes navigation fields from semantic relationships", () => {
    const edges: any[] = [
      { subject_id: "1", object_id: "2", predicate: "users" },
      { subject_id: "1", object_id: "3", predicate: "flavor text" },
    ];
    expect(neighborhood(edges, "1", "", 12).length).toBe(1);
    expect(neighborhood(edges, "1", "flavor text", 12).length).toBe(1);
  });
});
