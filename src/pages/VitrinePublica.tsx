import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { usePublicShowcase, type ShowcaseItem, getFeaturedLabel } from "@/hooks/useShowcase";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Phone, MessageCircle, X, ExternalLink } from "lucide-react";

function FeaturedBadge({ label }: { label: string | null }) {
  const info = getFeaturedLabel(label);
  if (!info) return null;
  return (
    <span className="absolute top-3 left-3 z-10 bg-amber-500 text-white text-xs sm:text-sm font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-sm">
      <span className="text-base">{info.emoji}</span> {info.text}
    </span>
  );
}

export default function VitrinePublica() {
  const { slug } = useParams<{ slug: string }>();
  const { showcase, profile, items, loadingShowcase, trackEvent } = usePublicShowcase(slug);
  const [selectedCategory, setSelectedCategory] = useState("todas");
  const [selectedSubcategory, setSelectedSubcategory] = useState("todas");
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
  const subcategories = [...new Set(
    items.filter(i => selectedCategory === "todas" || i.category === selectedCategory)
      .map(i => i.subcategory).filter(Boolean) as string[]
  )];

  const applyFilters = (list: ShowcaseItem[]) => list.filter(i => {
    if (selectedCategory !== "todas" && i.category !== selectedCategory) return false;
    if (selectedSubcategory !== "todas" && i.subcategory !== selectedSubcategory) return false;
    return true;
  });

  const featuredItems = applyFilters(
    items.filter(i => i.is_featured).sort((a, b) => a.featured_order - b.featured_order)
  );
  const regularItems = applyFilters(items.filter(i => !i.is_featured));

  const getItemImageUrl = (item: ShowcaseItem): string | null => {
    if (item.image_url) return item.image_url;
    if (item.materials?.file_url) return item.materials.file_url;
    if (item.materials?.thumbnail_url) return item.materials.thumbnail_url;
    return null;
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
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Vitrine não encontrada</h1>
          <p className="text-muted-foreground">Esta vitrine não existe ou foi desativada.</p>
        </div>
      </div>
    );
  }

  const renderItem = (item: ShowcaseItem, isFeatured: boolean) => {
    const imgUrl = getItemImageUrl(item);
    if (!imgUrl) return null;
    return (
      <div
        key={item.id}
        className={`relative rounded-2xl overflow-hidden cursor-pointer group transition-shadow ${
          isFeatured ? "shadow-lg ring-2 ring-amber-400/40" : "shadow-md"
        }`}
        onClick={() => handleItemClick(item)}
      >
        {isFeatured && <FeaturedBadge label={item.featured_label} />}
        <img src={imgUrl} alt="" className="w-full block" loading="lazy" />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button
            size="sm"
            className="bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,40%)] text-white shadow-lg"
            onClick={e => { e.stopPropagation(); handleAction(item); }}
          >
            {item.action_type === "whatsapp" ? (
              <><MessageCircle className="h-4 w-4 mr-1" /> Falar no WhatsApp</>
            ) : (
              <><ExternalLink className="h-4 w-4 mr-1" /> Saiba mais</>
            )}
          </Button>
        </div>
      </div>
    );
  };

  const hasResults = featuredItems.length > 0 || regularItems.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          {profile?.agency_logo_url ? (
            <img src={profile.agency_logo_url} alt="" className="h-10 w-10 rounded-full object-cover border" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
              {(profile?.agency_name || profile?.name || "V")[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-sm truncate">{profile?.agency_name || profile?.name || "Vitrine"}</h1>
            {profile?.city && <p className="text-xs text-muted-foreground">{profile.city}{profile.state ? `, ${profile.state}` : ""}</p>}
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 pb-3 flex gap-2">
          <Select value={selectedCategory} onValueChange={v => { setSelectedCategory(v); setSelectedSubcategory("todas"); }}>
            <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as ofertas</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          {subcategories.length > 0 && (
            <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
              <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Subcategoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {subcategories.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </header>

      {/* Items */}
      <main className="max-w-lg mx-auto px-4 py-4 space-y-3 pb-24">
        {!hasResults ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">Nenhuma oferta disponível no momento.</p>
          </div>
        ) : (
          <>
            {/* Featured */}
            {featuredItems.length > 0 && (
              <div className="space-y-3">
                {featuredItems.map(item => renderItem(item, true))}
              </div>
            )}
            {/* Divider */}
            {featuredItems.length > 0 && regularItems.length > 0 && (
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">Mais ofertas</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
            {/* Regular */}
            {regularItems.map(item => renderItem(item, false))}
          </>
        )}
      </main>

      {/* Floating Contact Button */}
      {profile?.phone && (
        <div className="fixed bottom-6 right-6 z-50">
          {contactOpen && (
            <div className="mb-3 flex flex-col gap-2 animate-fade-in">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[hsl(142,70%,45%)] text-white px-4 py-2.5 rounded-full shadow-lg hover:bg-[hsl(142,70%,40%)] transition-colors text-sm font-medium">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
              <a href={phoneUrl}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-full shadow-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                <Phone className="h-4 w-4" /> Ligar
              </a>
            </div>
          )}
          <button onClick={() => setContactOpen(!contactOpen)}
            className="h-14 w-14 rounded-full bg-[hsl(142,70%,45%)] text-white shadow-xl flex items-center justify-center hover:bg-[hsl(142,70%,40%)] transition-all">
            {contactOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
          </button>
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={!!lightboxItem} onOpenChange={open => { if (!open) setLightboxItem(null); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-xl p-0 overflow-hidden bg-black/95 border-none">
          {lightboxItem && (
            <div className="relative">
              <button onClick={() => setLightboxItem(null)} className="absolute top-3 right-3 z-10 h-8 w-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80">
                <X className="h-4 w-4" />
              </button>
              {lightboxItem.is_featured && <FeaturedBadge label={lightboxItem.featured_label} />}
              <img src={getItemImageUrl(lightboxItem) || "/placeholder.svg"} alt="" className="w-full max-h-[80vh] object-contain" />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <Button className="w-full bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,40%)] text-white" onClick={() => handleAction(lightboxItem)}>
                  {lightboxItem.action_type === "whatsapp" ? (
                    <><MessageCircle className="h-4 w-4 mr-2" /> Falar no WhatsApp</>
                  ) : (
                    <><ExternalLink className="h-4 w-4 mr-2" /> Saiba mais</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
