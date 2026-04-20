'use client';
import { Trash2 } from 'lucide-react';
import { deletePostAction } from '@/app/admin/_actions';

export default function DeletePostButton({ id, slug, title }: { id: string; slug: string; title: string }) {
  return (
    <form action={deletePostAction.bind(null, id, slug)}>
      <button
        type="submit"
        onClick={(e) => {
          if (!confirm(`"${title}" 을(를) 삭제할까요?`)) e.preventDefault();
        }}
        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
      >
        <Trash2 size={15} />
      </button>
    </form>
  );
}
