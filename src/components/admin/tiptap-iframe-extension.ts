import { Node, mergeAttributes } from '@tiptap/react';

/**
 * Custom TipTap node for embedding external videos via iframe.
 * Supports YouTube, Vimeo, Google Drive, Canva, etc.
 */

function normalizeVideoUrl(url: string): string {
  if (!url) return '';
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  // Google Drive
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  // Canva – if it's already an embed or a design link, try to make it embeddable
  if (url.includes('canva.com')) {
    // If it's already /watch or /embed, keep as-is
    if (url.includes('/watch') || url.includes('/embed')) return url;
    // Convert /design/ links to /watch
    const canvaDesign = url.match(/canva\.com\/design\/([a-zA-Z0-9_-]+)/);
    if (canvaDesign) return url.replace('/design/', '/design/').replace(/\?.*$/, '') + '/watch';
    return url;
  }
  // Loom
  if (url.includes('loom.com/share/')) {
    return url.replace('/share/', '/embed/');
  }
  return url;
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
