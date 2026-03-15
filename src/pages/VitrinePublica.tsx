import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { usePublicShowcase, type ShowcaseItem, getFeaturedLabel } from "@/hooks/useShowcase";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle, X, ExternalLink, ChevronLeft, ChevronRight, Phone } from "lucide-react";

/* ─── Featured Badge ─── */
function FeaturedBadge({ label }: { label: string | null }) {
  const info = getFeaturedLabel(label);
  if (!info) return null;
  return (
    <span className="absolute top-3 left-3 z-10 bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
      <span className="text-sm">{info.emoji}</span> {info.text}
    </span>
  );
}

/* ─── Image Carousel ─── */
function ImageCarousel({ images, onImageClick }: { images: string[]; onImageClick?: () => void }) {
  const [current, setCurrent] = useState(0);

  if (images.length <= 1) {
    return (
      <div className="relative w-full overflow-hidden">
        <img src={images[0]} alt="" className="w-full block" loading="lazy" onClick={onImageClick} />
        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
      </div>
    );
  }

  return (
    <div className="relative" onClick={onImageClick}>
      <img src={images[current]} alt="" className="w-full block cursor-pointer" loading="lazy" />
      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {images.map((_, i) => (
          <button key={i} onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
            className={`h-2 w-2 rounded-full transition-all ${i === current ? "bg-white scale-125 shadow" : "bg-white/50"}`} />
        ))}
      </div>
      {current > 0 && (
        <button onClick={(e) => { e.stopPropagation(); setCurrent(c => c - 1); }}
          className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 z-10">
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {current < images.length - 1 && (
        <button onClick={(e) => { e.stopPropagation(); setCurrent(c => c + 1); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 z-10">
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
      <span className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full z-10">
        {current + 1}/{images.length}
      </span>
    </div>
  );
}

/* ─── Lightbox Carousel ─── */
function LightboxCarousel({ images, actionButton }: { images: string[]; actionButton: React.ReactNode }) {
  const [current, setCurrent] = useState(0);

  return (
    <div className="relative">
      <img src={images[current]} alt="" className="w-full max-h-[80vh] object-contain" />
      {images.length > 1 && (
        <>
          <span className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full z-10">
            {current + 1}/{images.length}
          </span>
          {current > 0 && (
            <button onClick={() => setCurrent(c => c - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 z-10">
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {current < images.length - 1 && (
            <button onClick={() => setCurrent(c => c + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 z-10">
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`h-2.5 w-2.5 rounded-full transition-all ${i === current ? "bg-white scale-110" : "bg-white/50"}`} />
            ))}
          </div>
        </>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        {actionButton}
      </div>
    </div>
  );
}

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

  const renderCard = (item: ShowcaseItem, isFeatured: boolean) => {
    const images = getItemImages(item);
    if (images.length === 0) return null;

    return (
      <div
        key={item.id}
        className={`relative rounded-2xl overflow-hidden bg-card shadow-md transition-all duration-200 hover:shadow-xl hover:scale-[1.02] cursor-pointer group ${
          isFeatured ? "ring-2 ring-amber-400/50 shadow-lg" : ""
        }`}
      >
        {isFeatured && <FeaturedBadge label={item.featured_label} />}

        {/* Image area */}
        <ImageCarousel images={images} onImageClick={() => handleItemClick(item)} />

        {/* Card info overlay at bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 z-[5] pointer-events-none">
          <div className="px-4 pb-3 pt-8">
            {item.subcategory && (
              <p className="text-white/80 text-xs font-medium mb-0.5">{item.subcategory}</p>
            )}
            {item.materials?.title && (
              <h3 className="text-white font-semibold text-sm leading-tight line-clamp-2">{item.materials.title}</h3>
            )}
          </div>
        </div>

        {/* CTA Button */}
        <div className="p-3 border-t border-border/50">
          <Button
            size="sm"
            className="w-full bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,38%)] text-white font-medium text-xs"
            onClick={e => { e.stopPropagation(); handleAction(item); }}
          >
            {item.action_type === "whatsapp" ? (
              <><MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Faça um orçamento!</>
            ) : (
              <><ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Faça um orçamento!</>
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
      {/* ─── Header / Agency identity ─── */}
      <header className="bg-background border-b">
        <div className="max-w-lg mx-auto px-4 py-6 flex flex-col items-center text-center">
          {profile?.agency_logo_url ? (
            <img
              src={profile.agency_logo_url}
              alt={profile.agency_name || ""}
              className="h-20 w-auto max-w-[200px] object-contain mb-3"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl mb-3">
              {(profile?.agency_name || profile?.name || "V")[0]}
            </div>
          )}

          {/* Only show name if no logo (logo usually contains the name) */}
          {!profile?.agency_logo_url && profile?.agency_name && (
            <h1 className="font-bold text-lg text-foreground">{profile.agency_name}</h1>
          )}

          {(profile?.city || profile?.state) && (
            <p className="text-sm text-muted-foreground mt-1">
              {[profile.city, profile.state].filter(Boolean).join(" • ")}
            </p>
          )}

          {showcase.tagline && (
            <p className="text-sm text-muted-foreground mt-2 italic max-w-xs">
              {showcase.tagline}
            </p>
          )}
        </div>

        {/* ─── Category filter chips ─── */}
        {categories.length > 1 && (
          <div className="max-w-lg mx-auto px-4 pb-4">
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setSelectedCategory("todas")}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${
                  selectedCategory === "todas"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Todas as ofertas
              </button>
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedCategory(c)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${
                    selectedCategory === c
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ─── Items grid ─── */}
      <main className="max-w-lg mx-auto w-full px-4 py-5 space-y-4 flex-1 pb-28">
        {!hasResults ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">Nenhuma oferta disponível no momento.</p>
          </div>
        ) : (
          <>
            {featuredItems.length > 0 && (
              <div className="space-y-4">
                {featuredItems.map(item => renderCard(item, true))}
              </div>
            )}
            {featuredItems.length > 0 && regularItems.length > 0 && (
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">Mais ofertas</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
            <div className="space-y-4">
              {regularItems.map(item => renderCard(item, false))}
            </div>
          </>
        )}
      </main>

      {/* ─── Footer ─── */}
      <footer className="bg-card border-t py-6">
        <div className="max-w-lg mx-auto px-4 text-center space-y-1">
          <p className="font-semibold text-sm text-foreground">{profile?.agency_name || profile?.name}</p>
          {(profile?.city || profile?.state) && (
            <p className="text-xs text-muted-foreground">
              {[profile?.city, profile?.state].filter(Boolean).join(" • ")}
            </p>
          )}
          {profile?.phone && (
            <p className="text-xs text-muted-foreground">Atendimento via WhatsApp</p>
          )}
        </div>
      </footer>

      {/* ─── Fixed WhatsApp CTA ─── */}
      {profile?.phone && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 sm:left-auto sm:translate-x-0 sm:right-6">
          {contactOpen && (
            <div className="mb-3 flex flex-col gap-2 animate-fade-in items-end">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[hsl(142,70%,45%)] text-white px-5 py-3 rounded-full shadow-lg hover:bg-[hsl(142,70%,38%)] transition-colors text-sm font-medium">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
              <a href={phoneUrl}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-full shadow-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                <Phone className="h-4 w-4" /> Ligar
              </a>
            </div>
          )}
          <button onClick={() => setContactOpen(!contactOpen)}
            className="h-14 px-6 rounded-full bg-[hsl(142,70%,45%)] text-white shadow-xl flex items-center justify-center gap-2 hover:bg-[hsl(142,70%,38%)] transition-all text-sm font-semibold">
            {contactOpen ? <X className="h-5 w-5" /> : <><MessageCircle className="h-5 w-5" /> Fale com um especialista</>}
          </button>
        </div>
      )}

      {/* ─── Lightbox ─── */}
      <Dialog open={!!lightboxItem} onOpenChange={open => { if (!open) setLightboxItem(null); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-xl p-0 overflow-hidden bg-black/95 border-none">
          {lightboxItem && (() => {
            const images = getItemImages(lightboxItem);
            return (
              <div className="relative">
                <button onClick={() => setLightboxItem(null)} className="absolute top-3 right-3 z-20 h-8 w-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80">
                  <X className="h-4 w-4" />
                </button>
                {lightboxItem.is_featured && <FeaturedBadge label={lightboxItem.featured_label} />}
                <LightboxCarousel
                  images={images.length > 0 ? images : ["/placeholder.svg"]}
                  actionButton={
                    <Button className="w-full bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,38%)] text-white" onClick={() => handleAction(lightboxItem)}>
                      {lightboxItem.action_type === "whatsapp" ? (
                        <><MessageCircle className="h-4 w-4 mr-2" /> Falar no WhatsApp</>
                      ) : (
                        <><ExternalLink className="h-4 w-4 mr-2" /> Solicitar orçamento</>
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
