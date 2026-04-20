'use client';
import { useRef, useTransition, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Post } from '@/lib/posts';
import RichEditor from './RichEditor';

type PostForm = Pick<Post, 'id' | 'slug' | 'title' | 'description' | 'category' | 'content' | 'published'>;

interface Props {
  post?: PostForm;
  action: (formData: FormData) => Promise<{ error?: string } | void>;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function PostEditor({ post, action }: Props) {
  const slugRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const isEdit = !!post;

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!isEdit && slugRef.current) {
      slugRef.current.value = slugify(e.target.value);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError('');
    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">
      {post?.id && <input type="hidden" name="id" value={post.id} />}

      <div>
        <label className="block text-xs text-zinc-400 mb-1.5">제목 *</label>
        <input
          name="title"
          defaultValue={post?.title}
          onChange={handleTitleChange}
          required
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors"
          placeholder="포스트 제목"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">슬러그 (URL) *</label>
          <input
            ref={slugRef}
            name="slug"
            defaultValue={post?.slug}
            readOnly={isEdit}
            required
            className={`w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm font-mono text-emerald-400 focus:outline-none focus:border-emerald-400 transition-colors ${isEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
            placeholder="my-post-slug"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">카테고리</label>
          <input
            name="category"
            defaultValue={post?.category ?? 'uncategorized'}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1.5">설명 (description)</label>
        <textarea
          name="description"
          defaultValue={post?.description}
          rows={2}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors resize-none"
          placeholder="포스트 한 줄 요약"
        />
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1.5">본문 *</label>
        <RichEditor name="content" defaultValue={post?.content ?? ''} />
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="published"
            defaultChecked={post?.published ?? false}
            className="w-4 h-4 accent-emerald-400"
          />
          <span className="text-sm text-zinc-400">발행 (공개)</span>
        </label>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-400 text-zinc-950 font-semibold text-sm rounded-lg hover:bg-emerald-300 transition-colors disabled:opacity-60"
        >
          {isPending && <Loader2 size={14} className="animate-spin" />}
          {isEdit ? '저장' : '작성'}
        </button>
        <a
          href="/admin/posts"
          className="px-6 py-2.5 border border-zinc-700 text-zinc-400 text-sm rounded-lg hover:border-zinc-500 transition-colors"
        >
          취소
        </a>
      </div>
    </form>
  );
}
