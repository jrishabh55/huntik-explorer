import { useMemo, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  Grid2X2,
  List,
  Download,
  ArrowUpRight,
  ArrowRight,
  Bookmark,
  Scale,
} from "lucide-react";
import type { Catalog as CatalogData, Entry, Category } from "../types";
import { filterEntries, labels, download, toCsv, profileHref } from "../domain";
import { useData, setParams } from "../data";
import { EntryCard, PageHeading, Pagination, Picture, Loading } from "./Common";
export type CollectionActions = {
  saved: string[];
  compared: string[];
  onSave: (id: string) => void;
  onCompare: (id: string) => void;
};
export function Home({
  catalog,
  ...actions
}: { catalog: CatalogData } & CollectionActions) {
  const featured = [
    "Lok Lambert",
    "Sophie Casterwill",
    "Dante Vale",
    "Zhalia Moon",
  ]
    .map((t) => catalog.entries.find((e) => e.title === t)!)
    .filter(Boolean);
  const titans = ["Caliban", "Sabriel", "Metagolem"]
    .map((t) => catalog.entries.find((e) => e.title === t)!)
    .filter(Boolean);
  return (
    <div className="home">
      <div className="home-intro">
        <p className="eyebrow">SECRETS. SEEKERS. STORIES.</p>
        <span className="edition">THE COMPLETE REFERENCE · 2026</span>
      </div>
      <section className="hero">
        <div className="hero-orbit" aria-hidden="true" />
        <div className="hero-copy">
          <span className="hero-label">ENTER THE WORLD OF HUNTIK</span>
          <h1>
            Every legend.
            <br />
            One <em>Holotome.</em>
          </h1>
          <p>
            Discover the Seekers, summon the Titans, and trace the stories that
            connect them all.
          </p>
          <a className="button primary" href="#/browse">
            Explore the archive
            <ArrowRight size={17} />
          </a>
          <a className="hero-secondary" href="#/browse?kind=episode">
            Start with episode one <ArrowUpRight size={15} />
          </a>
        </div>
        <div className="hero-art" aria-label="Featured Titans">
          {titans.map((e, i) => (
            <a
              className={"hero-titan titan-" + i}
              key={e.id}
              href={profileHref(e.id)}
            >
              <Picture src={e.image} alt={e.title} eager />
              <span>
                {e.title}
                <small>{e.facets.type?.[0]}</small>
              </span>
            </a>
          ))}
          <span className="hero-art-caption">
            ANCIENT POWER. ENDLESS DISCOVERY.
          </span>
        </div>
      </section>
      <div className="stats-strip">
        {[
          ["2,539", "Reference pages", "/browse"],
          ["228", "Characters", "/browse?kind=character"],
          ["233", "Titans", "/browse?kind=titan"],
          ["52", "Episodes", "/browse?kind=episode"],
          ["10,024", "Images", "/gallery"],
        ].map(([n, l, u]) => (
          <a href={"#" + u} key={l}>
            <strong>{n}</strong>
            <span>
              {l}
              <ArrowUpRight size={13} />
            </span>
          </a>
        ))}
      </div>
      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">FOLLOW THEIR JOURNEY</p>
            <h2>Meet the Seekers</h2>
          </div>
          <a href="#/browse?kind=character">
            All characters <ArrowRight size={16} />
          </a>
        </div>
        <div className="card-grid featured-grid">
          {featured.map((e) => (
            <EntryCard
              key={e.id}
              entry={e}
              saved={actions.saved.includes(e.id)}
              selected={actions.compared.includes(e.id)}
              onSave={actions.onSave}
              onCompare={actions.onCompare}
            />
          ))}
        </div>
      </section>
      <div className="discovery-row">
        <a href="#/graph">
          <span className="mini-symbol">⌘</span>
          <div>
            <p className="eyebrow">EVERY STORY IS CONNECTED</p>
            <h3>Follow the connections</h3>
            <p>Explore families, factions and Titan users.</p>
          </div>
          <ArrowUpRight />
        </a>
        <a href="#/browse?kind=tcg_card">
          <span className="mini-symbol">▱</span>
          <div>
            <p className="eyebrow">448 CARDS TO DISCOVER</p>
            <h3>Open the card archive</h3>
            <p>Stats, powers, rarity and the stories behind them.</p>
          </div>
          <ArrowUpRight />
        </a>
      </div>
    </div>
  );
}
export function Catalog({
  catalog,
  params,
  bookmarks = false,
  ...actions
}: {
  catalog: CatalogData;
  params: URLSearchParams;
  bookmarks?: boolean;
} & CollectionActions) {
  const [expanded, setExpanded] = useState(false);
  const query = params.get("q") || "",
    kind = params.get("kind") || "";
  const filters = Object.fromEntries(params);
  const { data: fullText, error: searchError } = useData<
    Record<string, string>
  >(query ? "search.json" : null);
  const pool = bookmarks
    ? catalog.entries.filter((e) => actions.saved.includes(e.id))
    : params.get("season") === "extras"
      ? catalog.entries.filter((e) => catalog.extras.includes(e.id))
      : kind === "episode"
        ? catalog.entries.filter((e) => catalog.episodes.includes(e.id))
        : catalog.entries;
  const activeFilters = {
    ...filters,
    ...(params.get("season") === "extras" ? { kind: "" } : {}),
  };
  const results = useMemo(
    () => filterEntries(pool, query, activeFilters, fullText),
    [pool, query, params.toString(), fullText],
  );
  const page = Math.min(
      Math.max(1, Number(params.get("page")) || 1),
      Math.max(1, Math.ceil(results.length / 24)),
    ),
    list = params.get("view") === "list";
  const update = (key: string, value: string, replace = false) =>
    setParams(params, { [key]: value, page: "" }, replace);
  const facetPool = catalog.entries.filter((e) => !kind || e.kind === kind);
  const facetKeys =
    kind === "titan"
      ? ["type", "size", "users", "class"]
      : kind === "character"
        ? ["group", "gender"]
        : kind === "tcg_card"
          ? ["type", "rarity", "deck"]
          : ["group", "type"];
  const exportRows = results.map((e) => ({
    id: e.id,
    title: e.title,
    kind: e.kind,
    summary: e.summary,
    aliases: e.aliases.join("; "),
    ...e.stats,
  }));
  return (
    <>
      <PageHeading
        eyebrow={
          bookmarks ? "YOUR PERSONAL HOLOTOME" : "THE COMPLETE REFERENCE"
        }
        title={
          bookmarks ? "My collection" : labels[kind] || "Explore the archive"
        }
        description={
          bookmarks
            ? "Your saved discoveries, kept in this browser."
            : "Follow your curiosity. Every collected story is here."
        }
      >
        <span className="record-count">
          {results.length.toLocaleString()} records
        </span>
      </PageHeading>
      <div className="catalog-tools">
        <label className="search-field">
          <Search size={20} />
          <input
            autoComplete="off"
            aria-label="Search the archive"
            placeholder="Search names, aliases, stories…"
            value={query}
            onChange={(e) => update("q", e.target.value, true)}
          />
          {query && (
            <button
              aria-label="Clear search"
              onClick={() => update("q", "", true)}
            >
              ×
            </button>
          )}
        </label>
        <button
          className={expanded ? "selected" : ""}
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          <SlidersHorizontal size={17} />
          Filters
        </button>
        <div className="view-switch">
          <button
            aria-label="Grid view"
            aria-pressed={!list}
            onClick={() => update("view", "")}
          >
            <Grid2X2 size={18} />
          </button>
          <button
            aria-label="List view"
            aria-pressed={list}
            onClick={() => update("view", "list")}
          >
            <List size={18} />
          </button>
        </div>
      </div>
      <div className="filter-bar">
        <label>
          Collection
          <select
            value={kind}
            onChange={(e) =>
              setParams(params, {
                kind: e.target.value,
                page: "",
                season: "",
                type: "",
                size: "",
                users: "",
                class: "",
                group: "",
                rarity: "",
                deck: "",
              })
            }
          >
            <option value="">All collections</option>
            {Object.entries(labels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort by
          <select
            value={params.get("sort") || ""}
            onChange={(e) => update("sort", e.target.value)}
          >
            <option value="">{query ? "Relevance" : "Name A–Z"}</option>
            {kind === "titan" && (
              <>
                <option value="attack">Attack · high to low</option>
                <option value="defense">Defense · high to low</option>
              </>
            )}
            <option value="episode">Episode order</option>
          </select>
        </label>
        {kind === "episode" && (
          <label>
            Season
            <select
              value={params.get("season") || ""}
              onChange={(e) => update("season", e.target.value)}
            >
              <option value="">All seasons · 52 episodes</option>
              <option value="1">Season 1 · 26 episodes</option>
              <option value="2">Season 2 · 26 episodes</option>
              <option value="extras">Extras · 2 entries</option>
            </select>
          </label>
        )}
        <div className="export-menu">
          <Download size={15} />
          <button
            onClick={() =>
              download(
                "huntik-selection.json",
                JSON.stringify(exportRows, null, 2),
              )
            }
          >
            JSON
          </button>
          <button
            onClick={() =>
              download("huntik-selection.csv", toCsv(exportRows), "text/csv")
            }
          >
            CSV
          </button>
        </div>
      </div>
      {expanded && (
        <div className="facet-panel">
          {facetKeys.map((key) => {
            const options = [
              ...new Set(facetPool.flatMap((e) => e.facets[key] || [])),
            ].sort();
            return options.length ? (
              <label key={key}>
                {key === "users" ? "Titan user" : key}
                <select
                  value={params.get(key) || ""}
                  onChange={(e) => update(key, e.target.value)}
                >
                  <option value="">Any {key}</option>
                  {options.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            ) : null;
          })}
          <label>
            Category
            <select
              value={params.get("category") || ""}
              onChange={(e) => update("category", e.target.value)}
            >
              <option value="">All categories</option>
              {[...new Set(facetPool.flatMap((e) => e.categories))]
                .sort()
                .map((v) => (
                  <option key={v}>{v}</option>
                ))}
            </select>
          </label>
          <button
            onClick={() =>
              (location.hash = bookmarks
                ? "#/bookmarks"
                : "#/browse" + (kind ? "?kind=" + kind : ""))
            }
          >
            Reset filters
          </button>
        </div>
      )}
      {params.get("category") && (
        <p className="notice">
          Category: {params.get("category")}{" "}
          <button onClick={() => update("category", "")}>Clear</button>
        </p>
      )}
      {query && (
        <div className="link-cloud">
          {catalog.aliases
            .filter(
              (a) =>
                !catalog.entries.some((e) => e.id === a.target_id) &&
                a.title.toLowerCase().includes(query.toLowerCase()),
            )
            .slice(0, 20)
            .map((a) => (
              <a key={a.title} href={a.href}>
                {a.title} → {a.target_title}
              </a>
            ))}
        </div>
      )}
      {query && !fullText && (
        <p role="status">
          {searchError || "Loading article text for a complete search…"}
        </p>
      )}
      {results.length ? (
        list ? (
          <div className="table-scroll">
            <table className="entry-table">
              <thead>
                <tr>
                  <th>Record</th>
                  <th>Collection</th>
                  <th>Summary / type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.slice((page - 1) * 24, page * 24).map((e) => (
                  <tr key={e.id}>
                    <td>
                      <a href={profileHref(e.id)}>
                        <Picture src={e.image} alt="" />
                        <strong>{e.title}</strong>
                      </a>
                    </td>
                    <td>{labels[e.kind] || e.kind}</td>
                    <td>
                      {e.subtitle || e.facets.type?.join(", ") || e.summary}
                    </td>
                    <td>
                      <button
                        aria-label={"Bookmark " + e.title}
                        aria-pressed={actions.saved.includes(e.id)}
                        onClick={() => actions.onSave(e.id)}
                      >
                        <Bookmark size={17} />
                      </button>
                      {e.kind === "titan" && (
                        <button
                          aria-label={"Compare " + e.title}
                          aria-pressed={actions.compared.includes(e.id)}
                          onClick={() => actions.onCompare(e.id)}
                        >
                          <Scale size={17} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card-grid">
            {results.slice((page - 1) * 24, page * 24).map((e) => (
              <EntryCard
                key={e.id}
                entry={e}
                saved={actions.saved.includes(e.id)}
                selected={actions.compared.includes(e.id)}
                onSave={actions.onSave}
                onCompare={actions.onCompare}
              />
            ))}
          </div>
        )
      ) : (
        <div className="empty-state">
          <Search size={32} />
          <h2>
            {bookmarks ? "Start your collection" : "No discoveries here yet"}
          </h2>
          <p>
            {bookmarks
              ? "Use Save on any entry to keep it here."
              : "Try a different search or clear a filter."}
          </p>
          <a href="#/browse" className="button">
            Explore all entries
          </a>
        </div>
      )}
      <Pagination
        page={page}
        total={results.length}
        onPage={(p) => {
          setParams(params, { page: String(p) });
          document.getElementById("main")?.scrollIntoView();
        }}
      />
    </>
  );
}
export function Categories({
  catalog,
  params,
}: {
  catalog: CatalogData;
  params: URLSearchParams;
}) {
  const { data: categories, error } = useData<Category[]>("categories.json");
  const [q, setQ] = useState("");
  if (!categories) return <Loading error={error} />;
  const selected = params.get("name"),
    category = categories.find((c) => c.title === "Category:" + selected),
    children = selected
      ? categories.filter((c) =>
          c.categories.some((p) => p.title === "Category:" + selected),
        )
      : [];
  const filtered = (selected ? children : categories).filter((c) =>
    c.title.toLowerCase().includes(q.toLowerCase()),
  );
  const members = category
    ? catalog.entries.filter(
        (e) =>
          e.categories.includes(selected!) ||
          category.member_page_ids.includes(e.id),
      )
    : [];
  return (
    <>
      <PageHeading
        eyebrow="ORGANIZE YOUR DISCOVERY"
        title={selected || "Lore & categories"}
        description={
          category?.description ||
          "Explore the original wiki taxonomy, from ancient artifacts to familiar places."
        }
      />
      <div className="collection-chips">
        {[
          "spell",
          "faction",
          "location",
          "artifact",
          "item",
          "supporting_page",
          "nullifier",
        ].map((k) => (
          <a href={"#/browse?kind=" + k} key={k}>
            {labels[k]}
            <ArrowUpRight size={14} />
          </a>
        ))}
      </div>
      {selected && (
        <p className="parent-links">
          <a href="#/categories">All categories</a>
          {category?.categories.map((p) => (
            <a
              href={
                "#/categories?name=" +
                encodeURIComponent(p.title.replace("Category:", ""))
              }
              key={p.title}
            >
              ↑ {p.title.replace("Category:", "")}
            </a>
          ))}
          <a href={"#/browse?category=" + encodeURIComponent(selected)}>
            Browse {members.length} articles →
          </a>
          <a href={"#/gallery?category=" + encodeURIComponent(selected)}>
            Browse associated images →
          </a>
        </p>
      )}
      <label className="search-field">
        <Search />
        <input
          aria-label="Search categories"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find a category…"
        />
      </label>
      <h2 className="subheading">
        {selected ? "Subcategories" : "All categories"}{" "}
        <small>{filtered.length}</small>
      </h2>
      <div className="category-grid">
        {filtered.map((c) => (
          <a
            key={c.id}
            href={
              "#/categories?name=" +
              encodeURIComponent(c.title.replace("Category:", ""))
            }
          >
            {c.title.replace("Category:", "")}
            <small>{c.member_page_ids.length} entries</small>
            <ArrowUpRight size={14} />
          </a>
        ))}
      </div>
      {!filtered.length && (
        <p className="muted">
          No subcategories. Explore the articles or images above.
        </p>
      )}
      {selected && members.length > 0 && (
        <div className="link-cloud">
          {members.map((e) => (
            <a key={e.id} href={profileHref(e.id)}>
              {e.title}
            </a>
          ))}
        </div>
      )}
    </>
  );
}
