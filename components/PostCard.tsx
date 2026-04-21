import Link from 'next/link';
import Image from 'next/image';
import type { PostMeta } from '@/lib/posts';

export default function PostCard({ slug, title, date, description, category, thumbnail }: PostMeta) {
  return (
    <Link href={`/blog/${slug}`} className="block group">
      <article className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-emerald-400 dark:hover:border-zinc-600 transition-colors overflow-hidden">
        {thumbnail && (
          <div className="relative w-full h-48">
            <Image
              src={thumbnail}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        )}
        <div className="p-5">
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{category}</span>
          <h2 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
            {title}
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">{description}</p>
          <time className="mt-3 block text-xs text-zinc-400 dark:text-zinc-600">{date}</time>
        </div>
      </article>
    </Link>
  );
}
