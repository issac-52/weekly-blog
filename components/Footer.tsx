export default function Footer() {
  return (
    <footer className="border-t border-zinc-800 py-8 mt-auto">
      <div className="mx-auto max-w-4xl px-4 text-center text-sm text-zinc-500">
        © {new Date().getFullYear()} booup.dev — Built with Next.js &amp; MDX
      </div>
    </footer>
  );
}
