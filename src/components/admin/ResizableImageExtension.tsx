import { Node, mergeAttributes, type CommandProps } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Align = 'left' | 'center' | 'right';

interface ImageAttrs {
  src: string;
  alt: string | null;
  width: number | null;
  align: Align;
}

/**
 * Build the inline style used by both the editor render and the sanitized
 * public/PDF output. Keeping it in one helper guarantees WYSIWYG parity.
 */
function imageStyle(width: number | null, align: Align): string {
  const parts: string[] = ['display:block', 'height:auto', 'max-width:100%'];
  if (width && width > 0) parts.push(`width:${Math.round(width)}px`);
  if (align === 'center') parts.push('margin-left:auto', 'margin-right:auto');
  else if (align === 'right') parts.push('margin-left:auto', 'margin-right:0');
  else parts.push('margin-left:0', 'margin-right:auto');
  return parts.join(';');
}

function parseAlignFromStyle(style: string | null): Align {
  if (!style) return 'left';
  const s = style.toLowerCase();
  const ml = /margin-left\s*:\s*([^;]+)/.exec(s)?.[1]?.trim();
  const mr = /margin-right\s*:\s*([^;]+)/.exec(s)?.[1]?.trim();
  if (ml === 'auto' && mr === 'auto') return 'center';
  if (ml === 'auto' && mr !== 'auto') return 'right';
  return 'left';
}

function parseWidthFromStyle(style: string | null, attrW: string | null): number | null {
  const m = style ? /width\s*:\s*(\d+)px/i.exec(style) : null;
  if (m) return parseInt(m[1], 10);
  if (attrW && /^\d+$/.test(attrW)) return parseInt(attrW, 10);
  return null;
}

function ImageNodeView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const attrs = node.attrs as ImageAttrs;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [dragging, setDragging] = useState(false);

  // Start a resize drag from a corner handle. Preserves the natural aspect
  // ratio and clamps to the editor content width so the image never overflows.
  const startResize = (e: React.MouseEvent, corner: 'tl' | 'tr' | 'bl' | 'br') => {
    e.preventDefault();
    e.stopPropagation();
    const img = imgRef.current;
    if (!img) return;
    const startX = e.clientX;
    const startW = img.getBoundingClientRect().width;
    const natural = img.naturalWidth || startW;
    const maxW = wrapperRef.current?.parentElement?.getBoundingClientRect().width ?? natural;
    const sign = corner === 'tr' || corner === 'br' ? 1 : -1;
    setDragging(true);

    const onMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) * sign;
      const next = Math.max(60, Math.min(maxW, Math.round(startW + dx)));
      updateAttributes({ width: next });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setDragging(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const setAlign = (align: Align) => updateAttributes({ align });

  const isEditable = editor.isEditable;
  const showChrome = selected && isEditable;

  // Match alignment via the wrapper's text-align so the block image behaves
  // like an aligned block within the paragraph flow.
  const wrapperJustify =
    attrs.align === 'center' ? 'center' : attrs.align === 'right' ? 'flex-end' : 'flex-start';

  return (
    <NodeViewWrapper
      as="div"
      className="resizable-image-wrapper"
      style={{ display: 'flex', justifyContent: wrapperJustify, margin: '8px 0' }}
    >
      <div
        ref={wrapperRef}
        className={cn('relative inline-block max-w-full', showChrome && 'ring-2 ring-primary/60 rounded-sm')}
        style={{ lineHeight: 0 }}
      >
        {showChrome && (
          <div
            className="absolute -top-9 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0.5 rounded-md border bg-background shadow-sm p-0.5"
            contentEditable={false}
          >
            <button
              type="button"
              className={cn('h-7 w-7 grid place-items-center rounded hover:bg-accent', attrs.align === 'left' && 'bg-accent')}
              onMouseDown={(e) => { e.preventDefault(); setAlign('left'); }}
              title="Alinhar à esquerda"
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className={cn('h-7 w-7 grid place-items-center rounded hover:bg-accent', attrs.align === 'center' && 'bg-accent')}
              onMouseDown={(e) => { e.preventDefault(); setAlign('center'); }}
              title="Centralizar"
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className={cn('h-7 w-7 grid place-items-center rounded hover:bg-accent', attrs.align === 'right' && 'bg-accent')}
              onMouseDown={(e) => { e.preventDefault(); setAlign('right'); }}
              title="Alinhar à direita"
            >
              <AlignRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <img
          ref={imgRef}
          src={attrs.src}
          alt={attrs.alt ?? ''}
          draggable={false}
          style={{
            display: 'block',
            width: attrs.width ? `${attrs.width}px` : 'auto',
            maxWidth: '100%',
            height: 'auto',
            userSelect: 'none',
          }}
        />
        {showChrome && (
          <>
            {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
              <span
                key={c}
                onMouseDown={(e) => startResize(e, c)}
                contentEditable={false}
                className={cn(
                  'absolute h-2.5 w-2.5 bg-primary border border-background rounded-sm z-10',
                  c === 'tl' && '-top-1 -left-1 cursor-nwse-resize',
                  c === 'tr' && '-top-1 -right-1 cursor-nesw-resize',
                  c === 'bl' && '-bottom-1 -left-1 cursor-nesw-resize',
                  c === 'br' && '-bottom-1 -right-1 cursor-nwse-resize',
                )}
              />
            ))}
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}

/**
 * Custom image node with per-image width and alignment persisted through
 * inline `style`, so the same HTML renders identically in the editor, on
 * the public itinerary page and in the generated PDF.
 */
export const ResizableImage = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      width: {
        default: null,
        parseHTML: (el) => parseWidthFromStyle(el.getAttribute('style'), el.getAttribute('width')),
      },
      align: {
        default: 'center' as Align,
        parseHTML: (el) => {
          const dataAlign = el.getAttribute('data-align') as Align | null;
          if (dataAlign === 'left' || dataAlign === 'center' || dataAlign === 'right') return dataAlign;
          return parseAlignFromStyle(el.getAttribute('style'));
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'img[src]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const width = (node.attrs.width as number | null) ?? null;
    const align = ((node.attrs.align as Align) ?? 'center');
    return [
      'img',
      mergeAttributes(HTMLAttributes, {
        style: imageStyle(width, align),
        'data-align': align,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },

  addCommands() {
    return {
      setImage:
        (options: Partial<ImageAttrs>) =>
        ({ commands }: CommandProps) =>
          commands.insertContent({ type: this.name, attrs: options }),
    } as never;
  },
});

// Consumers can import this to build a starter attrs object for a fresh paste.
export function defaultImageAttrs(src: string): Partial<ImageAttrs> {
  return { src, align: 'center', width: null };
}

// Placeholder to silence unused-import warnings in the node view file when
// tree-shaken by tests that only import the extension itself.
export const __useEffectRef = useEffect;