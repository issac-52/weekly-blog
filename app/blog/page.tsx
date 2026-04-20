import { getPosts } from '@/lib/posts';
import PostList from '@/components/PostList';

export const metadata = {
  title: 'Blog',
};

export default function BlogPage() {
  const posts = getPosts();

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-bold text-white mb-2">Blog</h1>
      <p className="text-zinc-400 mb-10 text-sm">
        총 <span className="text-emerald-400 font-mono">{posts.length}</span>개의 글
      </p>
      <PostList posts={posts} />
    </div>
  );
}
