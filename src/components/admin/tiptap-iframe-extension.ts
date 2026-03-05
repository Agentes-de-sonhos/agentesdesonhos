import { Node, mergeAttributes } from '@tiptap/react';

/**
 * Custom TipTap node for embedding external videos via iframe.
 * Supports YouTube, Vimeo, Google Drive, Loom.
 * Services that block iframes (Canva) render as clickable cards.
 */

/** Check if URL is from a service that blocks iframe embedding */
function isNonEmbeddable(url: string): boolean {
  return /canva\.com/i.test(url);
}

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
  // Loom
  if (trimmed.includes('loom.com/share/')) {
    return trimmed.replace('/share/', '/embed/');
  }
  return trimmed;
}

/** Detect the service name from URL for display purposes */
function getServiceName(url: string): string {
  if (!url) return 'Vídeo';
  if (url.includes('canva.com')) return 'Canva';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
  if (url.includes('vimeo.com')) return 'Vimeo';
  if (url.includes('drive.google.com')) return 'Google Drive';
  if (url.includes('loom.com')) return 'Loom';
  return 'Vídeo';
}

export const IframeEmbed = Node.create({
  name: 'iframeEmbed',

  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      originalUrl: { default: null },
      title: { default: 'Vídeo incorporado' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-iframe-embed]',
        getAttrs: (node: HTMLElement) => {
          const iframe = node.querySelector('iframe');
          const link = node.querySelector('a[data-external-video]');
          return {
            src: iframe?.getAttribute('src') || link?.getAttribute('href') || null,
            originalUrl: node.getAttribute('data-original-url') || iframe?.getAttribute('src') || link?.getAttribute('href') || null,
            title: iframe?.getAttribute('title') || 'Vídeo incorporado',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const src = HTMLAttributes.src || '';
    const originalUrl = HTMLAttributes.originalUrl || src;

    // For non-embeddable services, render as a clickable card link
    if (isNonEmbeddable(originalUrl) || isNonEmbeddable(src)) {
      const serviceName = getServiceName(originalUrl || src);
      return [
        'div',
        mergeAttributes({
          'data-iframe-embed': '',
          'data-original-url': originalUrl,
          class: 'external-video-card',
          style: 'display:flex;align-items:center;gap:12px;padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;margin:1em 0;cursor:pointer;',
        }),
        [
          'a',
          {
            'data-external-video': '',
            href: originalUrl,
            target: '_blank',
            rel: 'noopener noreferrer',
            style: 'display:flex;align-items:center;gap:12px;text-decoration:none;color:inherit;width:100%;',
          },
          [
            'span',
            { style: 'display:flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:12px;background:#0ea5e9;color:white;font-size:20px;flex-shrink:0;' },
            '▶',
          ],
          [
            'span',
            { style: 'display:flex;flex-direction:column;gap:2px;' },
            [
              'strong',
              { style: 'font-size:14px;color:#1e293b;' },
              `Assistir vídeo no ${serviceName}`,
            ],
            [
              'em',
              { style: 'font-size:11px;color:#64748b;font-style:normal;' },
              'Clique para abrir em nova aba',
            ],
          ],
        ],
      ];
    }

    // Normal embeddable iframe
    return [
      'div',
      mergeAttributes({ 'data-iframe-embed': '', 'data-original-url': originalUrl, class: 'iframe-embed-wrapper' }),
      [
        'iframe',
        mergeAttributes(
          { src, title: HTMLAttributes.title },
          {
            frameborder: '0',
            allowfullscreen: 'true',
            allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
            style: 'width:100%;height:100%;position:absolute;top:0;left:0;',
          },
        ),
      ],
    ];
  },

  addCommands() {
    return {
      setIframeEmbed:
        (options: { src: string; title?: string }) =>
        ({ commands }: any) => {
          const originalUrl = options.src.trim();
          const normalizedSrc = isNonEmbeddable(originalUrl) ? originalUrl : normalizeVideoUrl(originalUrl);
          return commands.insertContent({
            type: this.name,
            attrs: {
              src: normalizedSrc,
              originalUrl,
              title: options.title || 'Vídeo incorporado',
            },
          });
        },
    } as any;
  },
});
