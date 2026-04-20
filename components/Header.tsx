import Link from 'next/link';
import { Code2 } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto max-w-4xl px-4 flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-white hover:text-emerald-400 transition-colors">
          <Code2 size={18} />
          <span>booup.dev</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-zinc-400">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
        </nav>
      </div>
    </header>
  );
}
