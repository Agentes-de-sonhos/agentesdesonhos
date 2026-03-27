import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Heading1, Heading2, Heading3, Link as LinkIcon, Undo, Redo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface PopupRichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export function PopupRichTextEditor({ content, onChange }: PopupRichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline' } }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]);

  if (!editor) return null;

  const ToolBtn = ({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: React.ReactNode; title: string }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("h-8 w-8 p-0", active && "bg-accent text-accent-foreground")}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );

  const handleLink = () => {
    const url = prompt('URL do link:');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="flex flex-wrap gap-0.5 p-1 border-b bg-muted/30">
        <ToolBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrito">
          <Bold className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Itálico">
          <Italic className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Sublinhado">
          <UnderlineIcon className="h-4 w-4" />
        </ToolBtn>
        <div className="w-px bg-border mx-1" />
        <ToolBtn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Título H1">
          <Heading1 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Título H2">
          <Heading2 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Título H3">
          <Heading3 className="h-4 w-4" />
        </ToolBtn>
        <div className="w-px bg-border mx-1" />
        <ToolBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista">
          <List className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada">
          <ListOrdered className="h-4 w-4" />
        </ToolBtn>
        <div className="w-px bg-border mx-1" />
        <ToolBtn active={editor.isActive('link')} onClick={handleLink} title="Link">
          <LinkIcon className="h-4 w-4" />
        </ToolBtn>
        <div className="w-px bg-border mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Desfazer">
          <Undo className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Refazer">
          <Redo className="h-4 w-4" />
        </ToolBtn>
      </div>
      <EditorContent editor={editor} className="prose prose-sm max-w-none p-3 min-h-[120px] focus-within:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[100px]" />
    </div>
  );
}
