import { createAdminClient } from '@/lib/supabase/admin';
import PostEditor from '@/components/admin/PostEditor';
import { updatePostAction } from '../../../_actions';
import { notFound } from 'next/navigation';

export const metadata = { title: '글 수정' };

export default async function EditPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = createAdminClient();
  const { data: post } = await admin.from('posts').select('*').eq('slug', slug).single();

  if (!post) notFound();

  async function boundAction(formData: FormData) {
    'use server';
    return updatePostAction(post.id, formData);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">글 수정</h1>
      <PostEditor post={post} action={boundAction} />
    </div>
  );
}
