import PostEditor from '@/components/admin/PostEditor';
import { createPostAction } from '../../_actions';

export const metadata = { title: '새 글 작성' };

export default function NewPostPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">새 글 작성</h1>
      <PostEditor action={createPostAction} />
    </div>
  );
}
