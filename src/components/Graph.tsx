import { useState } from "react";
import { ArrowRight, Network } from "lucide-react";
import type { Catalog, Edge } from "../types";
import { useData, setParams } from "../data";
import { neighborhood, profileHref, semanticPredicates } from "../domain";
import { PageHeading, Loading, SourceLink } from "./Common";
export function Graph({
  catalog,
  params,
}: {
  catalog: Catalog;
  params: URLSearchParams;
}) {
  const { data: edges, error } = useData<Edge[]>("relationships.json");
  const [zoom, setZoom] = useState(1);
  const id = params.get("id") || "huntik:page:1983",
    predicate = params.get("relation") || "",
    limit = Number(params.get("limit")) || 12;
  const entries = new Map(catalog.entries.map((e) => [e.id, e])),
    center = entries.get(id);
  if (!edges) return <Loading error={error} />;
  const all = edges.filter((e) => e.subject_id === id || e.object_id === id),
    selection = neighborhood(
      edges.filter(
        (e) => entries.has(e.object_id) && entries.has(e.subject_id),
      ),
      id,
      predicate,
      limit,
      new Map(catalog.entries.map((e) => [e.id, e.kind])),
    ).filter((e) => entries.has(e.object_id) && entries.has(e.subject_id));
  const nodes = [
    ...new Set(selection.flatMap((e) => [e.subject_id, e.object_id])),
  ].filter((n) => n !== id);
  const coords = new Map(
    nodes.map((node, i) => [
      node,
      {
        x:
          400 + Math.cos(-Math.PI / 2 + (i * Math.PI * 2) / nodes.length) * 290,
        y:
          280 + Math.sin(-Math.PI / 2 + (i * Math.PI * 2) / nodes.length) * 210,
      },
    ]),
  );
  coords.set(id, { x: 400, y: 280 });
  const available = neighborhood(
    edges.filter((e) => entries.has(e.object_id) && entries.has(e.subject_id)),
    id,
    predicate,
    Number.MAX_SAFE_INTEGER,
    new Map(catalog.entries.map((e) => [e.id, e.kind])),
  );
  return (
    <>
      <PageHeading
        eyebrow="FOLLOW THE THREADS"
        title="Connections"
        description="Explore the people, Titans and factions behind each story."
      />
      <div className="graph-controls">
        <label>
          Center on
          <select
            aria-label="Graph center"
            value={id}
            onChange={(e) => setParams(params, { id: e.target.value })}
          >
            {catalog.entries
              .slice()
              .sort((a, b) => a.title.localeCompare(b.title))
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
          </select>
        </label>
        <label>
          Relationship
          <select
            value={predicate}
            onChange={(e) => setParams(params, { relation: e.target.value })}
          >
            <option value="">Family, factions & Titan users</option>
            {[...new Set(all.map((e) => e.predicate))].sort().map((p) => (
              <option key={p} value={p}>
                {p}
                {semanticPredicates.has(p) ? "" : " · source field link"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Neighborhood
          <select
            value={limit}
            onChange={(e) => setParams(params, { limit: e.target.value })}
          >
            <option value={12}>12 links</option>
            <option value={24}>24 links</option>
            <option value={48}>48 links</option>
          </select>
        </label>
        <label>
          Zoom
          <input
            aria-label="Graph zoom"
            type="range"
            min="0.75"
            max="1.4"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="graph-panel">
        <div className="graph-caption">
          <span>
            <span className="live-dot" /> {center?.title || "Unknown entry"}
          </span>
          <a href={profileHref(id)}>
            Open full profile <ArrowRight size={14} />
          </a>
        </div>
        {selection.length ? (
          <svg
            viewBox={`${400 - 400 / zoom} ${280 - 280 / zoom} ${800 / zoom} ${560 / zoom}`}
            role="img"
            aria-label={`Connections for ${center?.title}. Click a node to center it. A text list follows.`}
          >
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#8c998f" />
              </marker>
            </defs>
            {selection.map((e, i) => {
              const a = coords.get(e.subject_id)!,
                b = coords.get(e.object_id)!,
                dx = b.x - a.x,
                dy = b.y - a.y,
                len = Math.hypot(dx, dy) || 1;
              return (
                <g key={i}>
                  <line
                    x1={a.x + (dx / len) * 38}
                    y1={a.y + (dy / len) * 38}
                    x2={b.x - (dx / len) * 38}
                    y2={b.y - (dy / len) * 38}
                    stroke="#a8b5ab"
                    strokeWidth="1.4"
                    markerEnd="url(#arrow)"
                  />
                  <text
                    className="edge-label"
                    x={(a.x + b.x) / 2}
                    y={(a.y + b.y) / 2 - 6}
                    textAnchor="middle"
                  >
                    {e.predicate}
                  </text>
                </g>
              );
            })}
            {[id, ...nodes].map((n) => {
              const p = coords.get(n)!,
                e = entries.get(n);
              return (
                <a
                  key={n}
                  href={"#/graph?id=" + encodeURIComponent(n)}
                  aria-label={"Center on " + e?.title}
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={n === id ? 43 : 29}
                    fill={
                      n === id
                        ? "#183f35"
                        : e?.kind === "titan"
                          ? "#b88742"
                          : "#d5e2d7"
                    }
                    stroke="white"
                    strokeWidth="4"
                  />
                  <text
                    x={p.x}
                    y={p.y + 5}
                    textAnchor="middle"
                    fill={n === id ? "#f8f4e8" : "#173b32"}
                    fontSize={15}
                  >
                    {e?.title
                      .split(" ")
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join("")}
                  </text>
                  <text
                    x={p.x}
                    y={p.y + (n === id ? 64 : 49)}
                    textAnchor="middle"
                    className="node-label"
                  >
                    {e?.title.length && e.title.length > 30
                      ? e.title.slice(0, 28) + "…"
                      : e?.title}
                  </text>
                </a>
              );
            })}
          </svg>
        ) : (
          <div className="empty-state">
            <Network size={36} />
            <h2>No links in this view</h2>
            <p>Choose a different relationship field or center entry.</p>
          </div>
        )}
        <div className="graph-legend">
          <span>● Selected record</span>
          <span>● Titan</span>
          <span>● Related entry</span>
          <span>Arrow: subject → object</span>
        </div>
      </div>
      <p className="muted">
        Showing {selection.length} of {available.length} matching source links.
        Click a node to explore its neighborhood. Labels are taken from wiki
        fields; navigation fields are not asserted family or ownership facts.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>From</th>
              <th>Source field</th>
              <th>To</th>
              <th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {selection.map((e, i) => (
              <tr key={i}>
                <td>
                  <a href={profileHref(e.subject_id)}>
                    {entries.get(e.subject_id)?.title}
                  </a>
                </td>
                <td>{e.predicate}</td>
                <td>
                  <a href={profileHref(e.object_id)}>
                    {entries.get(e.object_id)?.title}
                  </a>
                </td>
                <td>
                  <SourceLink
                    href={
                      "https://huntik.fandom.com/index.php?oldid=" +
                      e.source_revision_id
                    }
                  >
                    Wiki revision
                  </SourceLink>
                  <details>
                    <summary>Source field text</summary>
                    <code>{e.source_field_wikitext}</code>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
