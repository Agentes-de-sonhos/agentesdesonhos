import { Node, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";

/** Imagem do artigo: mídia própria da agência (path no bucket) + alt + legenda. */
export const BlogImage = Node.create({
  name: "blogImage",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      path: { default: null },
      alt: { default: "" },
      caption: { default: "" },
    };
  },
  parseHTML() {
    return []; // nunca aceita imagens coladas de fora
  },
  renderHTML({ HTMLAttributes }) {
    const { src, alt, caption } = HTMLAttributes;
    return [
      "figure",
      { class: "blog-editor-figure" },
      ["img", mergeAttributes({ src, alt })],
      ["figcaption", {}, caption || ""],
    ];
  },
});

export const BlogGallery = Node.create({
  name: "blogGallery",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return { images: { default: [] } };
  },
  parseHTML() {
    return [];
  },
  renderHTML({ HTMLAttributes }) {
    const imgs = (HTMLAttributes.images ?? []) as { src: string; alt: string }[];
    return ["div", { class: "blog-gallery" }, ...imgs.map((i) => ["figure", {}, ["img", { src: i.src, alt: i.alt }]])] as any;
  },
});

export const BlogYoutube = Node.create({
  name: "blogYoutube",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return { videoId: { default: null } };
  },
  parseHTML() {
    return [];
  },
  renderHTML({ HTMLAttributes }) {
    const id = String(HTMLAttributes.videoId ?? "");
    return [
      "div",
      { class: "blog-video" },
      ["iframe", { src: `https://www.youtube-nocookie.com/embed/${id}`, title: "Vídeo do YouTube", frameborder: "0" }],
    ];
  },
});

export function blogExtensions(placeholder = "Comece a escrever seu artigo…") {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      code: false,
      codeBlock: false,
      strike: false,
      underline: false,
      link: {
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto", "tel"],
        HTMLAttributes: { rel: "noopener noreferrer nofollow" },
      },
    } as any),
    Placeholder.configure({ placeholder }),
    BlogImage,
    BlogGallery,
    BlogYoutube,
  ];
}
