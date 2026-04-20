export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800 py-8 mt-auto">
      <div className="mx-auto max-w-4xl px-4 text-center text-sm text-zinc-500 dark:text-zinc-500 space-y-1">
        <p>© {new Date().getFullYear()} booup — 유용한 정보 블로그</p>
        <p className="text-xs text-zinc-400 dark:text-zinc-600">
          본 블로그의 정보는 참고용이며, 중요한 사항은 전문가에게 문의하세요.
        </p>
      </div>
    </footer>
  );
}
