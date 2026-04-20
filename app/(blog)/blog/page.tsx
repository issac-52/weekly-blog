import { getPosts } from '@/lib/posts';
import PostList from '@/components/PostList';

export const metadata = {
  title: '전체 글',
  description: '생활, IT, 건강, 금융 등 다양한 분야의 모든 글을 확인하세요.',
  alternates: { canonical: 'https://booup.dev/blog' },
};

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">전체 글</h1>
      <p className="text-zinc-500 mb-10 text-sm">
        총 <span className="text-emerald-600 dark:text-emerald-400">{posts.length}</span>개의 글
      </p>
      <PostList posts={posts} />
    </div>
  );
}
