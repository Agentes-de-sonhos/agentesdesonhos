import { SocialPostCard } from "./SocialPostCard";
import type { MaterialGallery } from "@/types/materials";

interface SocialFeedSectionProps {
  title: string;
  galleries: MaterialGallery[];
  icon?: React.ReactNode;
}

export function SocialFeedSection({ title, galleries, icon }: SocialFeedSectionProps) {
  if (!galleries || galleries.length === 0) return null;

  const totalFiles = galleries.reduce((sum, g) => sum + g.fileCount, 0);

  return (
    <section className="space-y-5">
      <div className="px-1">
        <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
          {icon}
          {title}
          <span className="text-sm font-normal text-muted-foreground">
            ({galleries.length}{" "}
            {galleries.length === 1 ? "post" : "posts"} • {totalFiles}{" "}
            arquivos)
          </span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 justify-items-center">
        {galleries.map((gallery) => (
          <SocialPostCard key={gallery.id} gallery={gallery} />
        ))}
      </div>
    </section>
  );
}
