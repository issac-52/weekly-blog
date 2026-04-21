import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto max-w-4xl px-4 flex h-14 items-center justify-between">
        <Link
          href="/"
          className="font-bold text-lg text-zinc-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
        >
          infobrow
        </Link>
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-6 text-sm text-zinc-600 dark:text-zinc-400">
            <Link
              href="/"
              className="hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              홈
            </Link>
            <Link
              href="/blog"
              className="hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              전체 글
            </Link>
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
