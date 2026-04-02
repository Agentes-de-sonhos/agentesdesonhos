import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import { IframeEmbed } from './tiptap-iframe-extension';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus,
  Link as LinkIcon, Highlighter, Palette, Unlink,
  ImageIcon, Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

const COLORS = [
  '#000000', '#374151', '#6B7280', '#EF4444', '#F97316', '#EAB308',
  '#22C55E', '#14B8A6', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
];

const HIGHLIGHT_COLORS = [
  '#FEF08A', '#BBF7D0', '#BFDBFE', '#E9D5FF', '#FECDD3', '#FED7AA',
];

interface PlaybookRichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export function PlaybookRichTextEditor({ content, onChange }: PlaybookRichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline' } }),
      Highlight.configure({ multicolor: true }),
      Image.configure({
        inline: false,
        HTMLAttributes: {
          class: 'rounded-xl max-w-full h-auto shadow-sm mx-auto',
        },
      }),
      IframeEmbed,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[200px] px-4 py-3 focus:outline-none text-foreground prose-headings:text-foreground prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:leading-relaxed prose-li:leading-relaxed prose-a:text-primary [&_img[data-emoji]]:inline [&_img[data-emoji]]:w-5 [&_img[data-emoji]]:h-5 [&_img[data-emoji]]:m-0',
      },
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
      size="icon"
      className={cn("h-8 w-8", active && "bg-accent text-accent-foreground")}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );

  const addLink = () => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
      setLinkUrl('');
    }
  };

  const addImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
    }
  };

  const addVideo = () => {
    if (videoUrl) {
      (editor.chain().focus() as any).setIframeEmbed({ src: videoUrl }).run();
      setVideoUrl('');
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-background shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b bg-muted/30">
        {/* Headings */}
        <ToolBtn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Título H1">
          <Heading1 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Subtítulo H2">
          <Heading2 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Subtítulo H3">
          <Heading3 className="h-4 w-4" />
        </ToolBtn>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Text formatting */}
        <ToolBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrito">
          <Bold className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Itálico">
          <Italic className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Sublinhado">
          <UnderlineIcon className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Tachado">
          <Strikethrough className="h-4 w-4" />
        </ToolBtn>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Text color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Cor do texto">
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <p className="text-xs font-medium text-muted-foreground mb-2">Cor do texto</p>
            <div className="grid grid-cols-6 gap-1">
              {COLORS.map((color) => (
                <button
                  key={color}
                  className="h-6 w-6 rounded-md border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => editor.chain().focus().setColor(color).run()}
                />
              ))}
            </div>
            <Button size="sm" variant="ghost" className="w-full mt-2 text-xs h-7" onClick={() => editor.chain().focus().unsetColor().run()}>
              Remover cor
            </Button>
          </PopoverContent>
        </Popover>

        {/* Highlight */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor.isActive('highlight') && "bg-accent")} title="Destaque">
              <Highlighter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <p className="text-xs font-medium text-muted-foreground mb-2">Cor de destaque</p>
            <div className="grid grid-cols-6 gap-1">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color}
                  className="h-6 w-6 rounded-md border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                />
              ))}
            </div>
            <Button size="sm" variant="ghost" className="w-full mt-2 text-xs h-7" onClick={() => editor.chain().focus().unsetHighlight().run()}>
              Remover destaque
            </Button>
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Alignment */}
        <ToolBtn active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Alinhar à esquerda">
          <AlignLeft className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Centralizar">
          <AlignCenter className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Alinhar à direita">
          <AlignRight className="h-4 w-4" />
        </ToolBtn>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Lists */}
        <ToolBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista com marcadores">
          <List className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada">
          <ListOrdered className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Citação">
          <Quote className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha divisória">
          <Minus className="h-4 w-4" />
        </ToolBtn>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Link */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor.isActive('link') && "bg-accent")} title="Inserir link">
              <LinkIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <p className="text-xs font-medium text-muted-foreground mb-2">URL do link</p>
            <div className="flex gap-2">
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && addLink()}
              />
              <Button size="sm" className="h-8" onClick={addLink}>OK</Button>
            </div>
          </PopoverContent>
        </Popover>

        {editor.isActive('link') && (
          <ToolBtn onClick={() => editor.chain().focus().unsetLink().run()} title="Remover link">
            <Unlink className="h-4 w-4" />
          </ToolBtn>
        )}

        <div className="w-px h-6 bg-border mx-1" />

        {/* Image */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Inserir imagem">
              <ImageIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <p className="text-xs font-medium text-muted-foreground mb-2">URL da imagem</p>
            <div className="flex gap-2">
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://exemplo.com/foto.jpg"
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && addImage()}
              />
              <Button size="sm" className="h-8" onClick={addImage}>Inserir</Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Video embed */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Inserir vídeo externo">
              <Video className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <p className="text-xs font-medium text-muted-foreground mb-1">URL do vídeo</p>
            <p className="text-[10px] text-muted-foreground mb-2">YouTube, Vimeo, Google Drive, Canva, Loom…</p>
            <div className="flex gap-2">
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && addVideo()}
              />
              <Button size="sm" className="h-8" onClick={addVideo}>Inserir</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}
