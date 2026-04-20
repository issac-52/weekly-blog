import { getPost, getPosts } from '@/lib/posts';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  return getPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return { title: post.title };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <header className="mb-10">
        <span className="text-xs text-emerald-400 font-mono">{post.category}</span>
        <h1 className="mt-2 text-4xl font-bold text-white leading-tight">{post.title}</h1>
        <time className="mt-2 block text-sm text-zinc-500">{post.date}</time>
        {post.description && (
          <p className="mt-4 text-zinc-400 text-lg border-l-2 border-emerald-400 pl-4">
            {post.description}
          </p>
        )}
      </header>
      <div className="prose prose-invert prose-emerald max-w-none">
        <MDXRemote source={post.content} />
      </div>
    </article>
  );
}
