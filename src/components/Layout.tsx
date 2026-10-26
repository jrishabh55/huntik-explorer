import { useState } from "react";
import {
  Compass,
  Users,
  Sparkles,
  Play,
  Layers,
  Network,
  Images,
  Bookmark,
  Info,
  Search,
  Menu,
  X,
  ArrowUpRight,
  BookOpen,
  Scale,
} from "lucide-react";
const nav = [
  ["Explore", "/", Compass],
  ["Characters", "/browse?kind=character", Users],
  ["Titans", "/browse?kind=titan", Sparkles],
  ["Episodes", "/browse?kind=episode", Play],
  ["Trading cards", "/browse?kind=tcg_card", Layers],
  ["Lore & categories", "/categories", BookOpen],
  ["Connections", "/graph", Network],
  ["Image gallery", "/gallery", Images],
] as const;
export function Layout({
  children,
  path,
  kind,
  savedCount,
  compareCount,
}: {
  children: React.ReactNode;
  path: string;
  kind: string;
  savedCount: number;
  compareCount: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Skip to content
      </a>
      <aside className={"sidebar " + (open ? "open" : "")}>
        <a className="brand" href="#/" aria-label="Huntik Explorer home">
          <span className="brand-mark">✧</span>
          <span>
            HUNTIK<small>EXPLORER</small>
          </span>
        </a>
        <p className="nav-caption">YOUR HOLOTOME</p>
        <nav aria-label="Main navigation">
          {nav.map(([name, url, Icon]) => {
            const active = url.includes("?")
              ? path === "/browse" && url.includes("=" + kind)
              : path === url;
            return (
              <a
                key={name}
                className={active ? "active" : ""}
                href={"#" + url}
                onClick={() => setOpen(false)}
              >
                <Icon size={18} />
                {name}
                {active && <span className="active-dot" />}
              </a>
            );
          })}
          <div className="nav-divider" />
          <a
            href="#/bookmarks"
            onClick={() => setOpen(false)}
            className={path === "/bookmarks" ? "active" : ""}
          >
            <Bookmark size={18} />
            My collection<span className="nav-count">{savedCount}</span>
          </a>
          <a
            href="#/compare"
            onClick={() => setOpen(false)}
            className={path === "/compare" ? "active" : ""}
          >
            <Scale size={18} />
            Compare Titans<span className="nav-count">{compareCount}</span>
          </a>
          <a
            href="#/info"
            onClick={() => setOpen(false)}
            className={path === "/info" ? "active" : ""}
          >
            <Info size={18} />
            About the archive
          </a>
        </nav>
        <div className="sidebar-bottom">
          <span className="archive-status">● REFERENCE EDITION</span>
          <p>
            A world of secrets,
            <br />
            waiting to be discovered.
          </p>
          <small>Snapshot · 26 OCT 2026</small>
        </div>
      </aside>
      {open && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <button
            className="mobile-menu"
            aria-label={open ? "Close navigation" : "Open navigation"}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
          <span className="breadcrumb">
            The archive <span>/</span>{" "}
            {path === "/"
              ? "Explore"
              : path.startsWith("/entry/")
                ? "Record"
                : path.slice(1).replace("browse", kind || "All entries")}
          </span>
          <a className="top-search" href="#/browse">
            <Search size={16} />
            <span>Search the Holotome</span>
            <kbd>/</kbd>
          </a>
          <a
            className="top-source"
            href="https://huntik.fandom.com"
            target="_blank"
            rel="noreferrer"
          >
            Huntik Wiki
            <ArrowUpRight size={14} />
          </a>
        </header>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <footer>
          Unofficial fan reference · Wiki text{" "}
          <a
            href="https://creativecommons.org/licenses/by-sa/3.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY-SA 3.0
          </a>{" "}
          · Image rights remain with their owners.{" "}
          <a href="#/info">Sources & credits</a>
        </footer>
      </div>
    </>
  );
}
