import { getPost, getPosts } from "@/lib/posts";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const SITE_URL = "https://infobrow.dev";

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  const url = `${SITE_URL}/blog/${slug}`;

  return {
    title: post.title,
    description: post.description,
    keywords: [post.category],
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      section: post.category,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <header className="mb-8">
        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wide">
          {post.category}
        </span>
        <h1 className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white leading-tight">
          {post.title}
        </h1>
        <time className="mt-2 block text-sm text-zinc-500">{post.date}</time>
        {post.description && (
          <p className="mt-4 text-zinc-600 dark:text-zinc-400 text-base border-l-2 border-emerald-500 dark:border-emerald-400 pl-4">
            {post.description}
          </p>
        )}
      </header>

      {/* TODO: 애드센스 승인 후 <AdBanner> 추가 */}
      <div
        className="prose prose-zinc dark:prose-invert prose-emerald max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}
