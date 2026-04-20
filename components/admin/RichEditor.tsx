'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Placeholder from '@tiptap/extension-placeholder';
import { useRef, useCallback, useState } from 'react';
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus,
  AlignLeft, AlignCenter, AlignRight,
  Link2, ImageIcon, Undo, Redo,
} from 'lucide-react';

interface Props {
  name: string;
  defaultValue?: string;
}

const btn = (active?: boolean) =>
  `p-1.5 rounded hover:bg-zinc-700 transition-colors ${active ? 'bg-zinc-700 text-emerald-400' : 'text-zinc-300'}`;

export default function RichEditor({ name, defaultValue = '' }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [html, setHtml] = useState(defaultValue);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-emerald-500 underline' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: '본문을 작성하세요...' }),
    ],
    content: defaultValue,
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-emerald max-w-none min-h-[400px] px-4 py-3 focus:outline-none',
      },
    },
  });

  const addLink = useCallback(() => {
    const url = window.prompt('URL을 입력하세요:');
    if (!url || !editor) return;
    editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  const handleImageUpload = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/admin/api/upload-image', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.url && editor) {
      editor.chain().focus().setImage({ src: data.url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="border border-zinc-700 rounded-lg overflow-hidden focus-within:border-emerald-400 transition-colors">
      {/* 툴바 */}
      <div className="flex flex-wrap gap-0.5 p-2 border-b border-zinc-700 bg-zinc-900">
        <button type="button" onClick={() => editor.chain().focus().undo().run()} className={btn()}><Undo size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} className={btn()}><Redo size={15} /></button>

        <div className="w-px bg-zinc-700 mx-1 self-stretch" />

        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btn(editor.isActive('heading', { level: 1 }))}><Heading1 size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive('heading', { level: 2 }))}><Heading2 size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor.isActive('heading', { level: 3 }))}><Heading3 size={15} /></button>

        <div className="w-px bg-zinc-700 mx-1 self-stretch" />

        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))}><Bold size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))}><Italic size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive('underline'))}><UnderlineIcon size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive('strike'))}><Strikethrough size={15} /></button>

        <div className="w-px bg-zinc-700 mx-1 self-stretch" />

        <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={btn(editor.isActive({ textAlign: 'left' }))}><AlignLeft size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={btn(editor.isActive({ textAlign: 'center' }))}><AlignCenter size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={btn(editor.isActive({ textAlign: 'right' }))}><AlignRight size={15} /></button>

        <div className="w-px bg-zinc-700 mx-1 self-stretch" />

        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))}><List size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))}><ListOrdered size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive('blockquote'))}><Quote size={15} /></button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btn()}><Minus size={15} /></button>

        <div className="w-px bg-zinc-700 mx-1 self-stretch" />

        <button type="button" onClick={addLink} className={btn(editor.isActive('link'))}><Link2 size={15} /></button>
        <button type="button" onClick={() => fileInputRef.current?.click()} className={btn()}><ImageIcon size={15} /></button>
      </div>

      {/* 에디터 본문 */}
      <div className="bg-zinc-950 text-white">
        <EditorContent editor={editor} />
      </div>

      {/* hidden input으로 HTML 전송 */}
      <input type="hidden" name={name} value={html} />

      {/* 이미지 파일 선택 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageUpload(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
