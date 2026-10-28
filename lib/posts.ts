// Retains weekly-blog's published-only repository contract, with a new storage adapter.
import { loadPublishedState } from "./store";
export async function getPosts() { return (await loadPublishedState()).articles.filter(a => a.status === "published"); }
export async function getPost(slug: string) { return (await getPosts()).find(a => a.slug === slug) ?? null; }
