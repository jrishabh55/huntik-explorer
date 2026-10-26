import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Layout } from "./components/Layout";
import { Home, Catalog, Categories } from "./components/Catalog";
import { Profile } from "./components/Profile";
import { Gallery } from "./components/Gallery";
import { Graph } from "./components/Graph";
import { Compare } from "./components/Compare";
import { Info } from "./components/Info";
import { Loading } from "./components/Common";
import { useData, useRoute, useStoredIds } from "./data";
import { compareIds } from "./domain";
import type { Catalog as CatalogData, Supplement } from "./types";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/libre-caslon-display/latin-400.css";
import "./styles.css";
function App() {
  const { data: catalog, error } = useData<CatalogData>("catalog.json"),
    { path, params } = useRoute();
  const [saved, setSaved] = useStoredIds("huntik-bookmarks"),
    [compared, setCompared] = useStoredIds("huntik-comparison");
  const [supplements, setSupplements] = useState<Supplement[]>([]),
    [notice, setNotice] = useState("");
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById("main")?.focus({ preventScroll: true });
  }, [path]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 3500);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) &&
        !target.isContentEditable
      ) {
        e.preventDefault();
        location.hash = "/browse";
        setTimeout(
          () =>
            document
              .querySelector<HTMLInputElement>(
                '[aria-label="Search the archive"]',
              )
              ?.focus(),
          100,
        );
      }
    };
    addEventListener("keydown", handler);
    return () => removeEventListener("keydown", handler);
  }, []);
  const onSave = (id: string) =>
    setSaved((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  const onCompare = (id: string) => {
    if (compared.length === 4 && !compared.includes(id))
      setNotice(
        "You can compare up to four Titans. Remove one in Compare Titans to add another.",
      );
    else setCompared((ids) => compareIds(ids, id));
  };
  const actions = { saved, compared, onSave, onCompare };
  let content: React.ReactNode = <Loading error={error} />;
  if (catalog) {
    if (path === "/") content = <Home catalog={catalog} {...actions} />;
    else if (path === "/browse" || path === "/bookmarks")
      content = (
        <Catalog
          catalog={catalog}
          params={params}
          bookmarks={path === "/bookmarks"}
          {...actions}
        />
      );
    else if (path.startsWith("/entry/")) {
      let id = "";
      try {
        id = decodeURIComponent(path.slice(7));
      } catch {}
      content = (
        <Profile
          key={id}
          id={id}
          catalog={catalog}
          supplements={supplements}
          {...actions}
        />
      );
    } else if (path === "/gallery")
      content = <Gallery catalog={catalog} params={params} />;
    else if (path === "/graph")
      content = <Graph catalog={catalog} params={params} />;
    else if (path === "/compare")
      content = (
        <Compare catalog={catalog} ids={compared} onCompare={onCompare} />
      );
    else if (path === "/categories")
      content = <Categories catalog={catalog} params={params} />;
    else if (path === "/info")
      content = (
        <Info
          catalog={catalog}
          supplements={supplements}
          onImport={setSupplements}
        />
      );
    else
      content = (
        <div className="empty-state">
          <h1>Uncharted territory</h1>
          <p>This page is not in the archive.</p>
          <a className="button" href="#/">
            Return to the Holotome
          </a>
        </div>
      );
  }
  return (
    <Layout
      path={path}
      kind={params.get("kind") || ""}
      savedCount={saved.length}
      compareCount={compared.length}
    >
      {content}
      {notice && (
        <div className="toast" role="status">
          {notice}
          <a href="#/compare">Open comparison</a>
        </div>
      )}
    </Layout>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
