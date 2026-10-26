import { useEffect, useRef, useState, useMemo } from "react";
import { Search, X, ChevronLeft, ChevronRight, Images } from "lucide-react";
import type { Catalog, ImageEntry, ImageDetail } from "../types";
import { useData, setParams } from "../data";
import { profileHref } from "../domain";
import {
  Picture,
  Pagination,
  PageHeading,
  Loading,
  SourceLink,
} from "./Common";
export function Gallery({
  catalog,
  params,
  entityId,
  embedded = false,
}: {
  catalog: Catalog;
  params: URLSearchParams;
  entityId?: string;
  embedded?: boolean;
}) {
  const { data: images, error } = useData<ImageEntry[]>("gallery/index.json");
  const [localQuery, setLocalQuery] = useState(""),
    [localPage, setLocalPage] = useState(1),
    [open, setOpen] = useState<number | null>(null);
  const query = embedded ? localQuery : params.get("q") || "",
    entity = entityId || params.get("entity") || "",
    category = params.get("category") || "";
  const names = useMemo(
    () => new Map(catalog.entries.map((e) => [e.id, e.title])),
    [catalog],
  );
  const filtered = useMemo(
    () =>
      (images || []).filter(
        (im) =>
          (!entity || im.pages.includes(entity)) &&
          (!category || im.categories.includes(category)) &&
          (!query ||
            [im.filename, ...im.pages.map((id) => names.get(id) || "")]
              .join(" ")
              .toLowerCase()
              .includes(query.toLowerCase())),
      ),
    [images, entity, category, query, names],
  );
  const page = Math.min(
    embedded ? localPage : Math.max(1, Number(params.get("page")) || 1),
    Math.max(1, Math.ceil(filtered.length / 36)),
  );
  if (!images) return <Loading error={error} />;
  return (
    <section className={embedded ? "embedded-gallery" : ""}>
      {!embedded && (
        <PageHeading
          eyebrow="THE VISUAL ARCHIVE"
          title="Image gallery"
          description="Explore every collected image, from character portraits to moments in the story."
        >
          <span className="record-count">
            {filtered.length.toLocaleString()} records
          </span>
        </PageHeading>
      )}
      <div className="catalog-tools">
        <label className="search-field">
          <Search size={19} />
          <input
            aria-label="Search images"
            placeholder="Search filenames or associated characters…"
            value={query}
            onChange={(e) => {
              if (embedded) {
                setLocalQuery(e.target.value);
                setLocalPage(1);
              } else setParams(params, { q: e.target.value, page: "" }, true);
            }}
          />
        </label>
        {!embedded && (
          <label>
            Associated entry
            <select
              aria-label="Filter images by entry"
              value={entity}
              onChange={(e) =>
                setParams(params, { entity: e.target.value, page: "" })
              }
            >
              <option value="">All entries</option>
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
        )}
      </div>
      {category && (
        <p className="notice">
          Category: {category} <a href="#/gallery">Clear</a>
        </p>
      )}
      <div className="gallery-grid">
        {filtered.slice((page - 1) * 36, page * 36).map((im, i) => (
          <button
            className="gallery-tile"
            key={im.id}
            onClick={() => setOpen((page - 1) * 36 + i)}
            aria-label={"View " + im.filename}
          >
            <Picture src={im.preview} alt={im.filename} />
            <span>{im.filename}</span>
            {im.placeholder && <small>Source placeholder</small>}
            {!im.preview && <small>Missing at source</small>}
          </button>
        ))}
      </div>
      {!filtered.length && (
        <div className="empty-state">
          <Images />
          <h2>No matching images</h2>
          <p>Try a filename, character or a different filter.</p>
        </div>
      )}
      <Pagination
        page={page}
        size={36}
        total={filtered.length}
        onPage={(p) =>
          embedded ? setLocalPage(p) : setParams(params, { page: String(p) })
        }
      />
      {open !== null && filtered[open] && (
        <Lightbox
          image={filtered[open]}
          index={open}
          total={filtered.length}
          names={names}
          onClose={() => setOpen(null)}
          onMove={(delta) =>
            setOpen((open + delta + filtered.length) % filtered.length)
          }
        />
      )}
    </section>
  );
}
function Lightbox({
  image,
  index,
  total,
  names,
  onClose,
  onMove,
}: {
  image: ImageEntry;
  index: number;
  total: number;
  names: Map<string, string>;
  onClose: () => void;
  onMove: (d: number) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { data: details, error } = useData<ImageDetail[]>(
    "gallery/" + image.chunk + ".json",
  );
  const detail = details?.find((i) => i.id === image.id);
  const { data: media } =
    useData<
      Record<
        string,
        {
          width: number;
          height: number;
          animated: boolean;
          sourceAlpha: boolean;
        }
      >
    >("media-info.json");
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="lightbox"
      aria-label={"Image: " + image.filename}
      onCancel={onClose}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          onMove(1);
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          onMove(-1);
        }
      }}
    >
      <header>
        <span>
          {index + 1} / {total.toLocaleString()}
        </span>
        <button autoFocus aria-label="Close image" onClick={onClose}>
          <X />
        </button>
      </header>
      <div className="lightbox-stage">
        <button
          className="lightbox-prev"
          aria-label="Previous image"
          onClick={() => onMove(-1)}
        >
          <ChevronLeft />
        </button>
        <Picture
          key={image.id}
          src={image.preview}
          alt={image.filename}
          eager
        />
        <button
          className="lightbox-next"
          aria-label="Next image"
          onClick={() => onMove(1)}
        >
          <ChevronRight />
        </button>
      </div>
      <div className="lightbox-info">
        <h2>{image.filename}</h2>
        <p>
          {detail?.observed_dimensions &&
            `${detail.observed_dimensions.width} × ${detail.observed_dimensions.height} source pixels · `}
          {image.preview && media?.[image.preview]?.animated
            ? "Static preview of an animated source. Open the original to see the animation."
            : "Optimized preview · original aspect ratio"}
        </p>
        {detail ? (
          <>
            <div className="source-links">
              <SourceLink href={detail.original_url}>
                Full-resolution source
              </SourceLink>
              <SourceLink href={detail.description_url}>
                File page & rights
              </SourceLink>
            </div>
            <p className="rights-note">
              {detail.rights?.status.replaceAll("_", " ")}.{" "}
              {detail.rights?.reuse_note}
            </p>
          </>
        ) : (
          <p role="status">{error || "Loading source attribution…"}</p>
        )}
        <div className="link-cloud">
          {image.pages.map((id) =>
            names.has(id) ? (
              <a key={id} href={profileHref(id)} onClick={onClose}>
                {names.get(id)}
              </a>
            ) : null,
          )}
        </div>
      </div>
    </dialog>
  );
}
