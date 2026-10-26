import { useState, useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Network,
  Download,
  Scale,
} from "lucide-react";
import type { Catalog, Detail, Entry, Link, Supplement } from "../types";
import { useData } from "../data";
import { profileHref, labels, download } from "../domain";
import { Loading, Picture, SourceLink } from "./Common";
import { Gallery } from "./Gallery";
import type { CollectionActions } from "./Catalog";
function LinkedText({ text, links = [] }: { text: string; links?: Link[] }) {
  const { pattern, map } = useMemo(() => {
    const map = new Map<string, Link>();
    for (const link of links) {
      if (link.target_id && link.label.length > 2) map.set(link.label, link);
    }
    const keys = [...map.keys()].sort((a, b) => b.length - a.length);
    return {
      map,
      pattern: keys.length
        ? new RegExp(
            "(" +
              keys
                .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
                .join("|") +
              ")",
            "g",
          )
        : null,
    };
  }, [links]);
  return (
    <>
      {text.split(/\n\n+/).map((para, i) => (
        <p key={i}>
          {pattern
            ? para.split(pattern).map((part, j) => {
                const link = map.get(part);
                return link ? (
                  <a
                    key={j}
                    href={
                      link.href?.startsWith("#/")
                        ? link.href
                        : link.href?.startsWith("https://")
                          ? link.href
                          : profileHref(link.target_id!)
                    }
                  >
                    {part}
                  </a>
                ) : (
                  part
                );
              })
            : para}
        </p>
      ))}
    </>
  );
}
export function Profile({
  id,
  catalog,
  supplements,
  ...actions
}: {
  id: string;
  catalog: Catalog;
  supplements: Supplement[];
} & CollectionActions) {
  const entry = catalog.entries.find((e) => e.id === id);
  const { data: detail, error } = useData<Detail>(
    entry ? "detail/" + id.split(":").at(-1) + ".json" : null,
  );
  const [tab, setTab] = useState("overview");
  if (!entry)
    return (
      <Loading error="This record is not in the archive. Use search to find its title or alias." />
    );
  if (!detail) return <Loading error={error} />;
  const saved = actions.saved.includes(id),
    compared = actions.compared.includes(id),
    episodeIndex = catalog.episodes.indexOf(id),
    local = supplements.filter((s) => s.episode_id === id),
    byId = new Map(catalog.entries.map((e) => [e.id, e]));
  const fields = Object.entries(detail.profile).filter(
    ([key, value]) =>
      value.text?.trim() &&
      !["image", "powerbonded", "1", "2", "link", "caption"].includes(key) &&
      !key.includes("image"),
  );
  const sectionLinks = [
    ...detail.links,
    ...(detail.citations || []).map((c) => ({
      ...c,
      label: c.label || c.target_title,
    })),
  ];
  const sections = (detail.sections || []).filter(
    (s) => s.text?.trim() && !/^gallery$/i.test(s.heading),
  );
  return (
    <div className="profile">
      <a className="back-link" href={"#/browse?kind=" + entry.kind}>
        <ArrowLeft size={15} />
        Back to {labels[entry.kind]?.toLowerCase() || "archive"}
      </a>
      <header className="profile-hero">
        <div className="profile-portrait">
          <Picture src={entry.image} alt={entry.title} eager />
        </div>
        <div className="profile-intro">
          <p className="eyebrow">
            {entry.season
              ? `SEASON ${entry.season} / EPISODE ${String(entry.number).padStart(2, "0")}`
              : labels[entry.kind] || entry.kind}
          </p>
          <h1>{entry.title}</h1>
          {entry.subtitle && <h2>{entry.subtitle}</h2>}
          <p className="profile-summary">
            {detail.summary || "A record from the world of Huntik."}
          </p>
          <div className="profile-actions">
            <button
              className={saved ? "button selected" : "button primary"}
              onClick={() => actions.onSave(id)}
            >
              <Bookmark size={17} fill={saved ? "currentColor" : "none"} />
              {saved ? "Saved to collection" : "Save to collection"}
            </button>
            {entry.kind === "titan" && (
              <button
                aria-pressed={compared}
                onClick={() => actions.onCompare(id)}
              >
                <Scale size={17} />
                {compared ? "In comparison" : "Compare Titan"}
              </button>
            )}
            <a className="button" href={"#/graph?id=" + encodeURIComponent(id)}>
              <Network size={17} />
              Connections
            </a>
          </div>
          {entry.kind === "titan" && (
            <div className="profile-stats">
              {[
                ["Base attack", "attack"],
                ["Base defense", "defense"],
                ["PB attack", "powerbonded_attack"],
                ["PB defense", "powerbonded_defense"],
              ].map(([label, key]) => (
                <div key={key}>
                  <small>{label}</small>
                  <strong>{entry.stats[key] ?? "Unknown"}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>
      {episodeIndex >= 0 && (
        <nav className="episode-nav" aria-label="Episode navigation">
          {episodeIndex > 0 ? (
            <a href={profileHref(catalog.episodes[episodeIndex - 1])}>
              <ArrowLeft size={16} />
              {byId.get(catalog.episodes[episodeIndex - 1])?.title}
            </a>
          ) : (
            <span />
          )}
          <span>{episodeIndex + 1} / 52</span>
          {episodeIndex < 51 ? (
            <a href={profileHref(catalog.episodes[episodeIndex + 1])}>
              {byId.get(catalog.episodes[episodeIndex + 1])?.title}
              <ArrowRight size={16} />
            </a>
          ) : (
            <span />
          )}
        </nav>
      )}
      <nav className="tabs" aria-label="Record sections">
        {[
          ["overview", "Overview"],
          ["gallery", `Gallery · ${detail.image_ids.length}`],
          ["related", "Appearances & links"],
          ["source", "Sources & raw record"],
          ...(episodeIndex >= 0
            ? [["local", `My notes${local.length ? " · " + local.length : ""}`]]
            : []),
        ].map(([key, label]) => (
          <button
            key={key}
            aria-current={tab === key ? "page" : undefined}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "overview" && (
        <div className="profile-content">
          <article className="article-prose">
            {sections.length > 0 ? (
              <>
                {sections.map((section, i) => (
                  <section key={i} id={"section-" + i}>
                    {section.level > 2 ? (
                      <h3>{section.heading}</h3>
                    ) : (
                      <h2>{section.heading}</h2>
                    )}
                    <LinkedText text={section.text} links={sectionLinks} />
                  </section>
                ))}
              </>
            ) : (
              <section>
                <h2>About this record</h2>
                <LinkedText
                  text={
                    detail.summary ||
                    detail.full_text ||
                    "See the structured facts and source record for the available details."
                  }
                  links={sectionLinks}
                />
              </section>
            )}
            <div className="article-credit">
              Adapted from{" "}
              <SourceLink href={detail.provenance.source_url}>
                Huntik Wiki contributors
              </SourceLink>
              ,{" "}
              <SourceLink href={detail.provenance.text_license.url}>
                {detail.provenance.text_license.label}
              </SourceLink>
              . Text has been reformatted for reading.{" "}
              <SourceLink href={detail.provenance.revision_url}>
                Source revision
              </SourceLink>
            </div>
          </article>
          <aside className="facts-column">
            {sections.length > 0 && (
              <div className="contents-panel">
                <p className="eyebrow">ON THIS PAGE</p>
                {sections.map((s, i) => (
                  <button
                    className={s.level > 2 ? "indent" : ""}
                    key={i}
                    onClick={() =>
                      document
                        .getElementById("section-" + i)
                        ?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                  >
                    {s.heading}
                  </button>
                ))}
              </div>
            )}
            <div className="facts-panel">
              <h2>Field notes</h2>
              <dl>
                {fields.map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>
                      <LinkedText text={value.text} links={value.links} />
                    </dd>
                  </div>
                ))}
              </dl>
              {!fields.length && <p>No structured fields are recorded.</p>}
            </div>
          </aside>
        </div>
      )}
      {tab === "gallery" && (
        <Gallery
          catalog={catalog}
          params={new URLSearchParams()}
          entityId={id}
          embedded
        />
      )}
      {tab === "related" && (
        <div className="related-sections">
          <h2>
            {episodeIndex >= 0 ? "Cast & appearances" : "Episode appearances"}
          </h2>
          <EntryLinks
            ids={
              episodeIndex >= 0
                ? detail.appearance_entity_ids || []
                : detail.appearance_episode_ids || []
            }
            entries={byId}
          />
          <h2>Related entries</h2>
          <EntryLinks
            ids={[
              ...new Set(
                detail.links
                  .map((l) => l.target_id)
                  .filter((x): x is string => !!x),
              ),
            ]}
            entries={byId}
          />
          {detail.supplement_page_ids?.length && (
            <>
              <h2>Supporting pages</h2>
              <EntryLinks ids={detail.supplement_page_ids} entries={byId} />
            </>
          )}
          <h2>Categories</h2>
          <div className="link-cloud">
            {entry.categories.map((c) => (
              <a key={c} href={"#/categories?name=" + encodeURIComponent(c)}>
                {c}
              </a>
            ))}
          </div>
        </div>
      )}
      {tab === "source" && (
        <div className="source-panel">
          <h2>Follow the source</h2>
          <p>
            Public wiki snapshot · 26 October 2026. Unknown fields remain
            unknown. Exact public source text is preserved below.
          </p>
          <div className="source-links">
            <SourceLink href={detail.provenance.source_url}>
              Original article
            </SourceLink>
            <SourceLink href={detail.provenance.revision_url}>
              Archived revision
            </SourceLink>
            <SourceLink href={detail.provenance.contributors_url}>
              Contributors & history
            </SourceLink>
          </div>
          <h3>Citations</h3>
          <div className="link-cloud">
            {detail.citations?.map((c, i) =>
              c.target_id ? (
                <a key={i} href={c.href || profileHref(c.target_id)}>
                  {c.label || c.target_title}
                </a>
              ) : (
                <span key={i}>
                  {c.label || c.target_title} · unresolved source label
                </span>
              ),
            )}
          </div>
          {!detail.citations?.length && (
            <p>
              No separate citation labels were extracted for this record. See
              the article and revision above.
            </p>
          )}
          <p className="notice">
            Source gaps:{" "}
            {typeof detail.missing_fields === "object"
              ? JSON.stringify(detail.missing_fields)
              : String(
                  detail.missing_fields ||
                    "No specific missing fields recorded.",
                )}
          </p>
          <button
            onClick={() =>
              download(
                entry.title.replace(/[^a-z0-9 -]/gi, "") + ".json",
                JSON.stringify(detail, null, 2),
              )
            }
          >
            <Download size={17} />
            Download public record
          </button>
          <details>
            <summary>Exact source wikitext</summary>
            <pre>{detail.raw_wikitext}</pre>
          </details>
        </div>
      )}
      {tab === "local" && (
        <section className="local-notes">
          <h2>Your episode notes</h2>
          {local.length ? (
            local.map((s, i) => (
              <article key={i}>
                <p className="notice">{s.quality}</p>
                <pre>{s.text}</pre>
              </article>
            ))
          ) : (
            <div className="empty-state">
              <Bookmark size={30} />
              <p>
                Import your local notes or captions to read them alongside this
                episode.
              </p>
              <a className="button" href="#/info">
                Import a local file
              </a>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
function EntryLinks({
  ids,
  entries,
}: {
  ids: string[];
  entries: Map<string, Entry>;
}) {
  return (
    <div className="link-cloud">
      {ids.length ? (
        ids.map((id) =>
          entries.has(id) ? (
            <a key={id} href={profileHref(id)}>
              {entries.get(id)!.title}
            </a>
          ) : null,
        )
      ) : (
        <p className="muted">No entries recorded in this field.</p>
      )}
    </div>
  );
}
