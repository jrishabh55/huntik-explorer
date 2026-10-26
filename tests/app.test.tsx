import React from "react";
import { it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EntryCard, Pagination } from "../src/components/Common";
afterEach(cleanup);
const entry: any = {
  id: "huntik:page:1",
  title: "Caliban",
  kind: "titan",
  image: null,
  summary: "Warrior",
  stats: { attack: 8, defense: 4 },
  categories: [],
  facets: {},
  aliases: [],
};
it("lets a keyboard user bookmark and compare a real entry, with explicit missing portrait", async () => {
  let saved = "",
    compared = "";
  render(
    <EntryCard
      entry={entry}
      saved={false}
      selected={false}
      onSave={(id) => (saved = id)}
      onCompare={(id) => (compared = id)}
    />,
  );
  expect(screen.getByText("No portrait available")).toBeTruthy();
  await userEvent.click(
    screen.getByRole("button", { name: "Bookmark Caliban" }),
  );
  expect(saved).toBe(entry.id);
  await userEvent.click(
    screen.getByRole("button", { name: "Compare Caliban" }),
  );
  expect(compared).toBe(entry.id);
  expect(
    screen.getByRole("link", { name: /Caliban/ }).getAttribute("href"),
  ).toContain("huntik%3Apage%3A1");
});
it("disables pagination outside result bounds", async () => {
  let next = 0;
  render(
    <Pagination page={1} total={25} size={24} onPage={(p) => (next = p)} />,
  );
  expect(
    (screen.getByRole("button", { name: "Previous page" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  await userEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(next).toBe(2);
});

import { Layout } from "../src/components/Layout";
import { Catalog } from "../src/components/Catalog";
import fs from "node:fs";
it("skip navigation focuses content without changing the hash route", async () => {
  location.hash = "/browse";
  render(
    <Layout path="/browse" kind="" savedCount={0} compareCount={0}>
      <h1>Archive</h1>
    </Layout>,
  );
  await userEvent.click(screen.getByRole("link", { name: "Skip to content" }));
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(location.hash).toBe("#/browse");
  expect(document.activeElement?.id).toBe("main");
});
it("keeps the 52 regular episodes separate from both extras", () => {
  const catalog = JSON.parse(
    fs.readFileSync("public/data/catalog.json", "utf8"),
  );
  const actions = {
    saved: [],
    compared: [],
    onSave: () => {},
    onCompare: () => {},
  };
  const { rerender } = render(
    <Catalog
      catalog={catalog}
      params={new URLSearchParams("kind=episode")}
      {...actions}
    />,
  );
  expect(screen.getByText("52 records")).toBeTruthy();
  rerender(
    <Catalog
      catalog={catalog}
      params={new URLSearchParams("kind=episode&season=extras")}
      {...actions}
    />,
  );
  expect(screen.getByText("2 records")).toBeTruthy();
});
