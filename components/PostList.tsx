'use client';
import { useState } from 'react';
import PostCard from './PostCard';
import type { PostMeta } from '@/lib/posts';

export default function PostList({ posts }: { posts: PostMeta[] }) {
  const categories = ['All', ...Array.from(new Set(posts.map((p) => p.category)))];
  const [active, setActive] = useState('All');

  const filtered = active === 'All' ? posts : posts.filter((p) => p.category === active);

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className={`px-3 py-1 rounded-full text-sm font-mono transition-colors ${
              active === cat
                ? 'bg-emerald-400 text-zinc-950'
                : 'border border-zinc-700 text-zinc-400 hover:border-emerald-400 hover:text-emerald-400'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="grid gap-4">
        {filtered.map((post) => (
          <PostCard key={post.slug} {...post} />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-zinc-500 text-sm">해당 카테고리에 작성된 글이 없습니다.</p>
      )}
    </>
  );
}
