import { AdminSidebar, AdminTopBar, AdminBottomNav } from '@/components/admin/AdminNav';

export const metadata = {
  title: { default: 'Admin', template: '%s | Admin' },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* 데스크톱 사이드바 */}
      <AdminSidebar />

      {/* 모바일 상단 헤더 */}
      <AdminTopBar />

      {/* 컨텐츠 영역 */}
      <div className="md:ml-52 pt-12 md:pt-0 pb-20 md:pb-0 min-h-screen">
        <div className="p-4 md:p-8">{children}</div>
      </div>

      {/* 모바일 하단 탭바 */}
      <AdminBottomNav />
    </div>
  );
}
