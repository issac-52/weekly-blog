import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { Plus, Pencil } from 'lucide-react';
import DeletePostButton from '@/components/admin/DeletePostButton';

export const metadata = { title: '포스트 관리' };

async function getAllPosts() {
  const admin = createAdminClient();
  const { data } = await admin
    .from('posts')
    .select('id, slug, title, category, published, created_at')
    .order('created_at', { ascending: false });
  return data ?? [];
}

export default async function AdminPostsPage() {
  const posts = await getAllPosts();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">포스트 관리</h1>
          <p className="text-sm text-zinc-500 mt-1">총 {posts.length}개</p>
        </div>
        <Link
          href="/admin/posts/new"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-400 text-zinc-950 font-semibold text-sm rounded-lg hover:bg-emerald-300 transition-colors"
        >
          <Plus size={16} />
          새 글 작성
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="text-zinc-500 text-sm">작성된 포스트가 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 hover:border-zinc-700 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`shrink-0 text-xs px-1.5 py-0.5 rounded font-mono ${
                      post.published
                        ? 'bg-emerald-400/10 text-emerald-400'
                        : 'bg-zinc-700 text-zinc-400'
                    }`}
                  >
                    {post.published ? '발행' : '임시저장'}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono shrink-0">{post.category}</span>
                </div>
                <p className="text-white text-sm font-medium mt-1 truncate">{post.title}</p>
                <p className="text-zinc-600 text-xs font-mono mt-0.5">/blog/{post.slug}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Link
                  href={`/admin/posts/${post.slug}/edit`}
                  className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Pencil size={15} />
                </Link>
                <DeletePostButton id={post.id} slug={post.slug} title={post.title} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
