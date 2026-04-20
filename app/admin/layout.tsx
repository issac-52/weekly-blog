import Link from 'next/link';
import { logoutAction } from './_actions';
import { FileText, LogOut, Code2 } from 'lucide-react';

export const metadata = {
  title: { default: 'Admin', template: '%s | Admin' },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-zinc-950">
      <aside className="w-52 shrink-0 border-r border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
          <Code2 size={16} className="text-emerald-400" />
          <Link href="/admin/posts" className="text-sm font-semibold text-white">
            Admin
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-1 text-sm">
          <Link
            href="/admin/posts"
            className="flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <FileText size={15} />
            포스트 관리
          </Link>
        </nav>
        <div className="p-2 border-t border-zinc-800">
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <LogOut size={15} />
              로그아웃
            </button>
          </form>
        </div>
      </aside>
      <div className="flex-1 p-8 overflow-auto">{children}</div>
    </div>
  );
}
