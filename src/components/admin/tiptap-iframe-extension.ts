import { Node, mergeAttributes } from '@tiptap/react';

/**
 * Custom TipTap node for embedding external videos via iframe.
 * Supports YouTube, Vimeo, Google Drive, Canva, etc.
 */

function normalizeVideoUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  // YouTube
  const ytMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  // Google Drive
  const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  // Canva – convert /watch or /design links to embeddable format
  if (trimmed.includes('canva.com')) {
    // Extract the design ID
    const designMatch = trimmed.match(/canva\.com\/design\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/);
    if (designMatch) {
      // Use the Canva embed URL format
      return `https://www.canva.com/design/${designMatch[1]}/${designMatch[2]}/view?embed`;
    }
    // Already an embed URL
    if (trimmed.includes('/embed') || trimmed.includes('?embed')) return trimmed;
    return trimmed;
  }
  // Loom
  if (trimmed.includes('loom.com/share/')) {
    return trimmed.replace('/share/', '/embed/');
  }
  return trimmed;
}

export const IframeEmbed = Node.create({
  name: 'iframeEmbed',

  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      title: { default: 'Vídeo incorporado' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-iframe-embed]',
        getAttrs: (node: HTMLElement) => {
          const iframe = node.querySelector('iframe');
          return {
            src: iframe?.getAttribute('src') || null,
            title: iframe?.getAttribute('title') || 'Vídeo incorporado',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes({ 'data-iframe-embed': '', class: 'iframe-embed-wrapper' }),
      [
        'iframe',
        mergeAttributes(HTMLAttributes, {
          frameborder: '0',
          allowfullscreen: 'true',
          allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          style: 'width:100%;height:100%;position:absolute;top:0;left:0;',
        }),
      ],
    ];
  },

  addCommands() {
    return {
      setIframeEmbed:
        (options: { src: string; title?: string }) =>
        ({ commands }: any) => {
          const normalizedSrc = normalizeVideoUrl(options.src);
          return commands.insertContent({
            type: this.name,
            attrs: { src: normalizedSrc, title: options.title || 'Vídeo incorporado' },
          });
        },
    } as any;
  },
});
