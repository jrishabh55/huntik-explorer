export type Entry = {
  id: string;
  title: string;
  kind: string;
  summary: string;
  image: string | null;
  aliases: string[];
  categories: string[];
  facets: Record<string, string[]>;
  stats: Record<string, number | string | null>;
  season?: number;
  number?: number;
  extra?: boolean;
  subtitle?: string;
};
export type Catalog = {
  entries: Entry[];
  aliases: {
    title: string;
    target_id: string | null;
    target_title: string;
    href: string;
  }[];
  episodes: string[];
  extras: string[];
};
export type Link = {
  href?: string;
  label: string;
  target_title: string;
  target_id?: string;
  target_url?: string;
  status?: string;
};
export type Detail = Entry & {
  profile: Record<string, { text: string; links: Link[] }>;
  sections: {
    heading: string;
    level: number;
    text: string;
    wikitext: string;
  }[];
  links: Link[];
  citations: Link[];
  image_ids: string[];
  primary_image_ids: string[];
  raw_wikitext: string;
  full_text: string;
  missing_fields: unknown;
  appearance_episode_ids: string[];
  appearance_entity_ids?: string[];
  supplement_page_ids?: string[];
  provenance: {
    source_url: string;
    revision_url: string;
    contributors_url: string;
    revision_timestamp: string;
    text_license: { label: string; url: string };
  };
};
export type ImageEntry = {
  id: string;
  filename: string;
  preview: string | null;
  pages: string[];
  categories: string[];
  placeholder: boolean;
  chunk: number;
};
export type ImageDetail = {
  id: string;
  filename: string;
  preview: string | null;
  original_url?: string;
  description_url?: string;
  rights?: { status: string; reuse_note: string };
  observed_dimensions?: { width: number; height: number };
};
export type Edge = {
  subject_id: string;
  object_id: string;
  object_title: string;
  predicate: string;
  source_field_wikitext: string;
  source_revision_id: number;
};
export type Supplement = {
  episode_id: string;
  kind: string;
  text: string;
  quality: string;
};
export type Category = {
  id: string;
  title: string;
  description: string;
  categories: { title: string }[];
  member_page_ids: string[];
  image_ids: string[];
};
