import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  pageKey: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
}

export function PageHeader({ pageKey, title, subtitle, icon: Icon }: PageHeaderProps) {
  const { data: bannerUrl } = useQuery({
    queryKey: ["page-banner", pageKey],
    queryFn: async () => {
      const { data } = await supabase
        .from("page_banners")
        .select("banner_url")
        .eq("page_key", pageKey)
        .maybeSingle();
      return data?.banner_url || null;
    },
    staleTime: 1000 * 60 * 10,
  });

  return (
    <div className="space-y-4">
      {/* Title + subtitle */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Icon className="h-8 w-8 text-primary" />
          {title}
        </h1>
        <p className="text-muted-foreground mt-1">{subtitle}</p>
      </div>

      {/* Banner */}
      {bannerUrl && (
        <div className="relative w-full overflow-hidden rounded-2xl shadow-lg">
          <img
            src={bannerUrl}
            alt={title}
            className="w-full h-36 sm:h-44 md:h-52 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
        </div>
      )}
    </div>
  );
}
