import type { Entry, Edge, Supplement } from "./types";
export const labels: Record<string, string> = {
  character: "Characters",
  titan: "Titans",
  episode: "Episodes",
  tcg_card: "Trading cards",
  spell: "Spells",
  faction: "Factions",
  location: "Locations",
  artifact: "Artifacts",
  item: "Items",
  supporting_page: "More lore",
  nullifier: "Nullifiers",
};
export function filterEntries(
  entries: Entry[],
  query: string,
  filters: Record<string, string>,
  fullText: Record<string, string> = {},
): Entry[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return entries
    .filter((e) => {
      if (filters.kind && filters.kind !== "all" && e.kind !== filters.kind)
        return false;
      if (filters.category && !e.categories.includes(filters.category))
        return false;
      if (
        filters.season &&
        (filters.season === "extras"
          ? !e.extra
          : String(e.season) !== filters.season)
      )
        return false;
      for (const key of [
        "type",
        "size",
        "group",
        "users",
        "class",
        "rarity",
        "deck",
        "gender",
      ])
        if (filters[key] && !e.facets[key]?.includes(filters[key]))
          return false;
      const haystack = [
        e.title,
        e.subtitle,
        ...(e.aliases || []),
        e.summary,
        fullText[e.id] || "",
      ]
        .join(" ")
        .toLowerCase();
      return words.every((w) => haystack.includes(w));
    })
    .sort((a, b) => {
      if (filters.sort === "attack" || filters.sort === "defense") {
        const key = filters.sort,
          av = a.stats[key],
          bv = b.stats[key];
        return (
          (typeof bv === "number" ? bv : -Infinity) -
            (typeof av === "number" ? av : -Infinity) ||
          a.title.localeCompare(b.title)
        );
      }
      if (filters.sort === "episode" || filters.kind === "episode")
        return (
          (a.season || 9) * 100 +
            (a.number || 99) -
            ((b.season || 9) * 100 + (b.number || 99)) ||
          a.title.localeCompare(b.title)
        );
      if (query) {
        const rank = (e: Entry) =>
          e.title.toLowerCase() === query.toLowerCase()
            ? 0
            : e.title.toLowerCase().startsWith(query.toLowerCase())
              ? 1
              : 2;
        const d = rank(a) - rank(b);
        if (d) return d;
      }
      return a.title.localeCompare(b.title);
    });
}
export function compareIds(ids: string[], id: string): string[] {
  return ids.includes(id)
    ? ids.filter((x) => x !== id)
    : ids.length < 4
      ? [...ids, id]
      : ids;
}
export function parseSupplements(
  input: unknown,
  validEpisodeIds: Set<string>,
): Supplement[] {
  const rows = Array.isArray(input)
    ? input
    : input && typeof input === "object"
      ? (input as { local_supplements?: unknown }).local_supplements
      : undefined;
  if (!Array.isArray(rows))
    throw Error(
      "Choose local-supplements.json or a reference.json containing local_supplements.",
    );
  const valid: Supplement[] = [];
  for (const row of rows) {
    if (
      !row ||
      typeof row !== "object" ||
      !validEpisodeIds.has(row.episode_id) ||
      !["episode_note", "transcript"].includes(row.kind)
    )
      continue;
    const text =
      typeof row.text === "string"
        ? row.text
        : Array.isArray(row.segments)
          ? row.segments
              .filter(
                (s: unknown) =>
                  s &&
                  typeof s === "object" &&
                  typeof (s as { text?: unknown }).text === "string",
              )
              .map(
                (s: { start_seconds?: number; text: string }) =>
                  `${Number.isFinite(s.start_seconds) ? "[" + Math.floor(s.start_seconds! / 60) + ":" + String(Math.floor(s.start_seconds! % 60)).padStart(2, "0") + "] " : ""}${s.text}`,
              )
              .join("\n")
          : "";
    if (text)
      valid.push({
        episode_id: row.episode_id,
        kind: row.kind,
        text,
        quality:
          row.kind === "transcript"
            ? String(row.caption_type || "Automatic captions") +
              " — " +
              String(
                row.quality_note ||
                  "Names, spelling and timing may be incorrect.",
              )
            : "Personal episode notes",
      });
  }
  if (!valid.length)
    throw Error(
      "No supported notes or transcripts matched an episode in this collection.",
    );
  return valid;
}
export function safeUrl(value?: string): string | undefined {
  try {
    const url = new URL(value || "");
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const columns = Array.from(new Set(rows.flatMap(Object.keys)));
  const escape = (v: unknown) => {
    let s = typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
    if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return (
    "\ufeff" +
    [
      columns.map(escape).join(","),
      ...rows.map((row) => columns.map((k) => escape(row[k])).join(",")),
    ].join("\r\n")
  );
}
export const semanticPredicates = new Set([
  "users",
  "user",
  "user(s)",
  "owner",
  "father",
  "mother",
  "brothers",
  "sisters",
  "siblings",
  "children",
  "grandchildren",
  "grandmother",
  "grandfather",
  "husband",
  "wife",
  "group",
  "groups",
  "group(s)",
  "group affiliation(s)",
  "group affiliations",
  "members",
  "notable members",
  "leader",
  "leaders",
  "leader(s)",
  "founder",
  "founders",
  "founder(s)",
  "residence",
  "past residence",
  "base",
  "headquarters",
  "guardian",
  "guard titan",
  "signature titans",
  "signature titan",
  "signature titan(s)",
  "pets",
  "inhabitants",
]);
const familyPredicates = new Set([
  "father",
  "mother",
  "brothers",
  "sisters",
  "siblings",
  "children",
  "grandchildren",
  "grandmother",
  "grandfather",
  "husband",
  "wife",
]);
const entityKinds = new Set([
  "character",
  "titan",
  "faction",
  "location",
  "artifact",
  "item",
  "nullifier",
]);
export function neighborhood(
  edges: Edge[],
  id: string,
  predicate = "",
  limit = 16,
  kinds?: Map<string, string>,
): Edge[] {
  return edges
    .filter(
      (e) =>
        (e.subject_id === id || e.object_id === id) &&
        (predicate
          ? e.predicate === predicate
          : semanticPredicates.has(e.predicate) &&
            (!kinds ||
              (entityKinds.has(kinds.get(e.subject_id) || "") &&
                entityKinds.has(kinds.get(e.object_id) || "")))),
    )
    .sort((a, b) => {
      const priority = (e: Edge) =>
        (e.subject_id === id ? 0 : 10) +
        (familyPredicates.has(e.predicate) ? 0 : 2);
      return priority(a) - priority(b);
    })
    .slice(0, limit);
}
export function download(
  name: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function profileHref(id: string) {
  return "#/entry/" + encodeURIComponent(id);
}
