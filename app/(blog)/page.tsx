import { getPosts } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "infobrow — 유용한 정보 블로그",
  description:
    "생활, IT, 건강, 금융 등 다양한 분야의 유용한 정보를 쉽고 빠르게 확인하세요.",
};

export default async function Home() {
  const recentPosts = (await getPosts()).slice(0, 6);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <section className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-4 leading-tight">
          알아두면 쓸모 있는{" "}
          <span className="text-emerald-600 dark:text-emerald-400">
            정보 블로그
          </span>
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
          생활, IT, 건강, 금융 등 다양한 주제의 정보를 쉽고 빠르게 찾아보세요.
        </p>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
            최신 글
          </h2>
          <Link
            href="/blog"
            className="text-sm text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            전체 글 보기 →
          </Link>
        </div>
        {recentPosts.length === 0 ? (
          <p className="text-zinc-500 text-sm">아직 작성된 글이 없습니다.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {recentPosts.map((post) => (
              <PostCard key={post.slug} {...post} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
