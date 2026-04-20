import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  date: string;
  description: string;
  category: string;
  content: string;
  published: boolean;
}

export type PostMeta = Omit<Post, 'content'>;

export async function getPosts(): Promise<PostMeta[]> {
  const { data } = await getSupabase()
    .from('posts')
    .select('id, slug, title, description, category, published, created_at')
    .eq('published', true)
    .order('created_at', { ascending: false });

  return (data ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    date: String(p.created_at).split('T')[0],
    description: p.description,
    category: p.category,
    published: p.published,
  }));
}

export async function getPost(slug: string): Promise<Post | null> {
  const { data } = await getSupabase()
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    date: String(data.created_at).split('T')[0],
    description: data.description,
    category: data.category,
    content: data.content,
    published: data.published,
  };
}
