import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { usePublicShowcase, type ShowcaseItem, getFeaturedLabel } from "@/hooks/useShowcase";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle, X, ExternalLink, ChevronLeft, ChevronRight, Phone } from "lucide-react";
import { FeaturedBadge } from "@/components/showcase/FeaturedBadge";
import { ImageCarousel } from "@/components/showcase/ImageCarousel";
import { LightboxCarousel } from "@/components/showcase/LightboxCarousel";
import { ShowcaseCard } from "@/components/showcase/ShowcaseCard";
import { ShowcaseHeader } from "@/components/showcase/ShowcaseHeader";
import { ShowcaseFloatingCTA } from "@/components/showcase/ShowcaseFloatingCTA";

/* ─── Main Component ─── */
export default function VitrinePublica() {
  const { slug } = useParams<{ slug: string }>();
  const { showcase, profile, items, loadingShowcase, trackEvent } = usePublicShowcase(slug);
  const [selectedCategory, setSelectedCategory] = useState("todas");
  const [lightboxItem, setLightboxItem] = useState<ShowcaseItem | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [tracked, setTracked] = useState(false);

  useEffect(() => {
    if (showcase && !tracked) {
      trackEvent(showcase.id, "page_view");
      setTracked(true);
    }
  }, [showcase, tracked]);

  const categories = [...new Set(items.map(i => i.category))];

  const filteredItems = items.filter(i => {
    if (selectedCategory !== "todas" && i.category !== selectedCategory) return false;
    return true;
  });

  const featuredItems = filteredItems.filter(i => i.is_featured).sort((a, b) => a.featured_order - b.featured_order);
  const regularItems = filteredItems.filter(i => !i.is_featured);

  const getItemImages = (item: ShowcaseItem): string[] => {
    if (item.gallery_urls && item.gallery_urls.length > 1) return item.gallery_urls;
    const single = item.image_url || item.materials?.file_url || item.materials?.thumbnail_url;
    return single ? [single] : [];
  };

  const handleItemClick = (item: ShowcaseItem) => {
    if (showcase) trackEvent(showcase.id, "item_click", item.id);
    setLightboxItem(item);
  };

  const handleAction = (item: ShowcaseItem) => {
    if (showcase) trackEvent(showcase.id, "item_action", item.id);
    if (item.action_type === "link" && item.action_url) {
      window.open(item.action_url, "_blank");
    } else if (profile?.phone) {
      const phone = profile.phone.replace(/\D/g, "");
      window.open(`https://wa.me/55${phone}`, "_blank");
    }
  };

  const whatsappUrl = profile?.phone ? `https://wa.me/55${profile.phone.replace(/\D/g, "")}` : "#";
  const phoneUrl = profile?.phone ? `tel:+55${profile.phone.replace(/\D/g, "")}` : "#";

  if (loadingShowcase) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!showcase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center px-6">
          <h1 className="text-2xl font-bold mb-2">Vitrine não encontrada</h1>
          <p className="text-muted-foreground">Esta vitrine não existe ou foi desativada.</p>
        </div>
      </div>
    );
  }

  const hasResults = featuredItems.length > 0 || regularItems.length > 0;

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* ─── Header ─── */}
      <ShowcaseHeader
        profile={profile}
        showcase={showcase}
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {/* ─── Items ─── */}
      <main className="max-w-xl mx-auto w-full px-4 py-6 space-y-5 flex-1 pb-28">
        {!hasResults ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-sm">Nenhuma oferta disponível no momento.</p>
          </div>
        ) : (
          <>
            {featuredItems.length > 0 && (
              <div className="space-y-5">
                {featuredItems.map(item => (
                  <ShowcaseCard
                    key={item.id}
                    item={item}
                    isFeatured
                    images={getItemImages(item)}
                    onImageClick={() => handleItemClick(item)}
                    onAction={() => handleAction(item)}
                  />
                ))}
              </div>
            )}
            {featuredItems.length > 0 && regularItems.length > 0 && (
              <div className="flex items-center gap-4 py-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium tracking-wide uppercase">Mais ofertas</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
            <div className="space-y-5">
              {regularItems.map(item => (
                <ShowcaseCard
                  key={item.id}
                  item={item}
                  isFeatured={false}
                  images={getItemImages(item)}
                  onImageClick={() => handleItemClick(item)}
                  onAction={() => handleAction(item)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* ─── Footer ─── */}
      <footer className="bg-card border-t py-8">
        <div className="max-w-xl mx-auto px-4 text-center space-y-1.5">
          <p className="font-semibold text-sm text-foreground">{profile?.agency_name || profile?.name}</p>
          {(profile?.city || profile?.state) && (
            <p className="text-xs text-muted-foreground">
              {[profile?.city, profile?.state].filter(Boolean).join(" · ")}
            </p>
          )}
          {profile?.phone && (
            <p className="text-xs text-muted-foreground">Atendimento via WhatsApp</p>
          )}
        </div>
      </footer>

      {/* ─── Floating CTA ─── */}
      <ShowcaseFloatingCTA
        phone={profile?.phone}
        whatsappUrl={whatsappUrl}
        phoneUrl={phoneUrl}
        contactOpen={contactOpen}
        onToggle={() => setContactOpen(!contactOpen)}
      />

      {/* ─── Lightbox ─── */}
      <Dialog open={!!lightboxItem} onOpenChange={open => { if (!open) setLightboxItem(null); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-xl p-0 overflow-hidden bg-black/95 border-none">
          {lightboxItem && (() => {
            const images = getItemImages(lightboxItem);
            return (
              <div className="relative">
                <button onClick={() => setLightboxItem(null)} className="absolute top-3 right-3 z-20 h-8 w-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors">
                  <X className="h-4 w-4" />
                </button>
                {lightboxItem.is_featured && <FeaturedBadge label={lightboxItem.featured_label} />}
                <LightboxCarousel
                  images={images.length > 0 ? images : ["/placeholder.svg"]}
                  actionButton={
                    <Button className="w-full bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,38%)] text-white" onClick={() => handleAction(lightboxItem)}>
                      {lightboxItem.action_type === "whatsapp" ? (
                        <><MessageCircle className="h-4 w-4 mr-2" /> Faça um orçamento!</>
                      ) : (
                        <><ExternalLink className="h-4 w-4 mr-2" /> Faça um orçamento!</>
                      )}
                    </Button>
                  }
                />
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* No-scrollbar utility */}
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  );
}
