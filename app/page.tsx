import { getPosts } from '@/lib/posts';
import PostCard from '@/components/PostCard';
import { Terminal } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const recentPosts = getPosts().slice(0, 3);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <section className="mb-16">
        <div className="flex items-center gap-2 text-emerald-400 font-mono text-sm mb-4">
          <Terminal size={16} />
          <span>whoami</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">
          안녕하세요, 개발자{' '}
          <span className="text-emerald-400">booup</span>입니다.
        </h1>
        <p className="text-zinc-400 text-lg max-w-xl leading-relaxed">
          3년 차 풀스택 개발자로 배운 것들을 기록합니다.
          JavaScript, TypeScript, React, Next.js를 주로 다룹니다.
        </p>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">최근 글</h2>
          <Link
            href="/blog"
            className="text-sm text-zinc-400 hover:text-emerald-400 transition-colors"
          >
            전체 보기 →
          </Link>
        </div>
        {recentPosts.length === 0 ? (
          <p className="text-zinc-500 text-sm">아직 작성된 글이 없습니다.</p>
        ) : (
          <div className="grid gap-4">
            {recentPosts.map((post) => (
              <PostCard key={post.slug} {...post} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
