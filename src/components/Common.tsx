import { useState } from "react";
import {
  Bookmark,
  Plus,
  Check,
  ArrowLeft,
  ArrowRight,
  ImageOff,
  ExternalLink,
} from "lucide-react";
import type { Entry } from "../types";
import { asset } from "../data";
import { profileHref, labels, safeUrl } from "../domain";
export function Picture({
  src,
  alt,
  className = "",
  eager = false,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    <img
      className={className}
      src={asset(src)}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailed(true)}
    />
  ) : (
    <span className={"no-image " + className}>
      <ImageOff size={24} />
      <span>{failed ? "Image unavailable" : "No portrait available"}</span>
    </span>
  );
}
export function EntryCard({
  entry,
  saved = false,
  selected = false,
  onSave,
  onCompare,
}: {
  entry: Entry;
  saved?: boolean;
  selected?: boolean;
  onSave?: (id: string) => void;
  onCompare?: (id: string) => void;
}) {
  return (
    <article className="entry-card">
      <a href={profileHref(entry.id)} className="card-main">
        <div className="card-image">
          <Picture src={entry.image} alt={entry.title} />
          <span className="kind-tag">
            {entry.season
              ? `S${entry.season} · E${String(entry.number).padStart(2, "0")}`
              : labels[entry.kind] || entry.kind}
          </span>
        </div>
        <div className="card-body">
          <h3>{entry.title.replace("TCG:", "")}</h3>
          <p>
            {entry.subtitle ||
              entry.facets.type?.join(" · ") ||
              entry.summary ||
              "Explore the source record"}
          </p>
          {entry.kind === "titan" && (
            <div className="stat-line">
              <span>
                ATK <b>{entry.stats.attack ?? "?"}</b>
              </span>
              <span>
                DEF <b>{entry.stats.defense ?? "?"}</b>
              </span>
            </div>
          )}
        </div>
      </a>
      <div className="card-actions">
        <button
          aria-label={`${saved ? "Remove bookmark for" : "Bookmark"} ${entry.title}`}
          aria-pressed={saved}
          onClick={() => onSave?.(entry.id)}
        >
          <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
          {saved ? "Saved" : "Save"}
        </button>
        {entry.kind === "titan" && (
          <button
            aria-label={`${selected ? "Remove comparison for" : "Compare"} ${entry.title}`}
            aria-pressed={selected}
            onClick={() => onCompare?.(entry.id)}
          >
            {selected ? <Check size={16} /> : <Plus size={16} />}Compare
          </button>
        )}
      </div>
    </article>
  );
}
export function Pagination({
  page,
  total,
  size = 24,
  onPage,
}: {
  page: number;
  total: number;
  size?: number;
  onPage: (p: number) => void;
}) {
  const max = Math.max(1, Math.ceil(total / size));
  return (
    <div className="pagination">
      <span>
        {total
          ? `${(page - 1) * size + 1}–${Math.min(page * size, total)} of ${total.toLocaleString()}`
          : "No results"}
      </span>
      <div>
        <button
          disabled={page <= 1}
          aria-label="Previous page"
          onClick={() => onPage(page - 1)}
        >
          <ArrowLeft size={17} />
        </button>
        <span>
          Page {page} / {max}
        </span>
        <button
          disabled={page >= max}
          aria-label="Next page"
          onClick={() => onPage(page + 1)}
        >
          <ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
}
export function Loading({ error }: { error?: string }) {
  return (
    <div role={error ? "alert" : "status"} className="empty-state">
      <span className="sigil">◇</span>
      <h2>{error ? "Unable to open this record" : "Opening the archive…"}</h2>
      <p>{error || "Gathering the details for your next discovery."}</p>
      {error && <button onClick={() => location.reload()}>Retry</button>}
    </div>
  );
}
export function SourceLink({
  href,
  children,
}: {
  href?: string;
  children: React.ReactNode;
}) {
  const safe = safeUrl(href);
  return safe ? (
    <a href={safe} target="_blank" rel="noreferrer">
      {children} <ExternalLink size={12} />
    </a>
  ) : (
    <span>{children}</span>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {children}
    </header>
  );
}
