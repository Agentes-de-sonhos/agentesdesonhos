import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Newspaper, ExternalLink, Loader2, Star, ChevronLeft, ChevronRight,
  TrendingUp, Trash2, FileText, Flame, Zap, Bookmark, BookmarkCheck,
  Plane, Ship, Hotel, Globe, BarChart3, Mic, Palmtree, ChevronDown,
  MoreVertical, Crown, ArrowUpToLine, ArrowDownToLine, Hash,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { useNewsLikes } from "@/hooks/useNewsLikes";
import { NewsLikeButton } from "@/components/news/NewsLikeButton";

interface NoticiaHub {
  id: string;
  titulo_curto: string;
  resumo: string;
  categoria: string;
  fonte: string;
  url_original: string;
  relevancia_score: number;
  tipo_exibicao: string;
  status: string;
  data_publicacao: string;
  alerta_trade: boolean;
  nivel_alerta: string;
  is_noticia_do_dia: boolean;
  top5_position: number | null;
}

const CATEGORIA_ICONS: Record<string, React.ReactNode> = {
  "Aéreo": <Plane className="h-3.5 w-3.5" />,
  "Cruzeiros": <Ship className="h-3.5 w-3.5" />,
  "Hotel": <Hotel className="h-3.5 w-3.5" />,
  "Destinos": <Globe className="h-3.5 w-3.5" />,
  "Mercado": <BarChart3 className="h-3.5 w-3.5" />,
  "Eventos": <Mic className="h-3.5 w-3.5" />,
  "Turismo": <Palmtree className="h-3.5 w-3.5" />,
};

const CATEGORIAS_FILTER = [
  "Todas",
  "Destaques do Trade",
  "Aéreo",
  "Destinos",
  "Mercado",
  "Cruzeiros",
  "Turismo",
  "Eventos",
];

const CATEGORIA_COLORS: Record<string, string> = {
  "Aéreo": "bg-sky-100 text-sky-700 border-sky-200",
  "Destinos": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Mercado": "bg-amber-100 text-amber-700 border-amber-200",
  "Cruzeiros": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Turismo": "bg-teal-100 text-teal-700 border-teal-200",
  "Eventos": "bg-purple-100 text-purple-700 border-purple-200",
};

const PAGE_SIZE = 20;

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return "Agora";
  if (diffHours < 24) return `Há ${diffHours}h`;
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function CategoryBadge({ categoria }: { categoria: string }) {
  const colorClass = CATEGORIA_COLORS[categoria] || "bg-muted text-muted-foreground border-border";
  const icon = CATEGORIA_ICONS[categoria];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${colorClass}`}>
      {icon}
      {categoria}
    </span>
  );
}

function CurationBadges({ item }: { item: NoticiaHub }) {
  return (
    <>
      {item.is_noticia_do_dia && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          <Crown className="h-3 w-3" /> Notícia do Dia
        </span>
      )}
      {item.top5_position != null && (
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-700 border border-violet-300 px-2.5 py-0.5 text-[10px] font-bold">
          <Hash className="h-3 w-3" /> Top {item.top5_position}
        </span>
      )}
    </>
  );
}

/* ── Admin Actions Menu ──────────────────────────────────── */
function AdminActionsMenu({
  item,
  allNews,
  onSetNoticiaDoDia,
  onAddTop5,
  onRemoveTop5,
  onDelete,
}: {
  item: NoticiaHub;
  allNews: NoticiaHub[];
  onSetNoticiaDoDia: (id: string) => void;
  onAddTop5: (id: string) => void;
  onRemoveTop5: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const top5Count = allNews.filter((n) => n.top5_position != null).length;
  const isInTop5 = item.top5_position != null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm"
          onClick={(e) => e.preventDefault()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {!item.is_noticia_do_dia && (
          <DropdownMenuItem onClick={() => onSetNoticiaDoDia(item.id)}>
            <Crown className="h-4 w-4 mr-2 text-amber-500" />
            Definir como Notícia do Dia
          </DropdownMenuItem>
        )}
        {item.is_noticia_do_dia && (
          <DropdownMenuItem disabled className="text-amber-600 font-medium">
            <Crown className="h-4 w-4 mr-2" />
            É a Notícia do Dia
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {!isInTop5 && (
          <DropdownMenuItem
            onClick={() => onAddTop5(item.id)}
            disabled={top5Count >= 5}
          >
            <ArrowUpToLine className="h-4 w-4 mr-2 text-violet-500" />
            {top5Count >= 5 ? "Top 5 cheio (5/5)" : `Adicionar ao Top 5 (${top5Count}/5)`}
          </DropdownMenuItem>
        )}
        {isInTop5 && (
          <DropdownMenuItem onClick={() => onRemoveTop5(item.id)}>
            <ArrowDownToLine className="h-4 w-4 mr-2 text-violet-500" />
            Remover do Top 5 (#{item.top5_position})
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(item.id)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir notícia
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── Top 5 Replacement Dialog ────────────────────────────── */
function Top5ReplacementDialog({
  open,
  onClose,
  currentTop5,
  onReplace,
}: {
  open: boolean;
  onClose: () => void;
  currentTop5: NoticiaHub[];
  onReplace: (removeId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Top 5 lotado — substituir qual?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-3">
          O Top 5 já está com 5 notícias. Selecione uma para substituir:
        </p>
        <div className="space-y-2">
          {currentTop5
            .sort((a, b) => (a.top5_position ?? 0) - (b.top5_position ?? 0))
            .map((n) => (
              <button
                key={n.id}
                className="w-full text-left flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                onClick={() => onReplace(n.id)}
              >
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center">
                  #{n.top5_position}
                </span>
                <span className="text-sm font-medium truncate">{n.titulo_curto}</span>
              </button>
            ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Hero Card (Notícia do Dia) ─────────────────────────── */
function HeroNewsCard({ item, isAdmin, onDelete, saved, onToggleSave, allNews, onSetNoticiaDoDia, onAddTop5, onRemoveTop5 }: {
  item: NoticiaHub; isAdmin: boolean; onDelete?: (id: string) => void;
  saved: boolean; onToggleSave: (id: string) => void;
  allNews: NoticiaHub[];
  onSetNoticiaDoDia: (id: string) => void;
  onAddTop5: (id: string) => void;
  onRemoveTop5: (id: string) => void;
}) {
  return (
    <div className="relative group/card h-full">
      <a href={item.url_original} target="_blank" rel="noopener noreferrer" className="block group h-full">
        <Card className="border-0 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-primary/8 via-card to-card h-full">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                <Flame className="h-3.5 w-3.5" />
                Notícia do Dia
              </span>
              <CategoryBadge categoria={item.categoria} />
              <CurationBadges item={item} />
              <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary">
                <TrendingUp className="h-3.5 w-3.5" />
                Score {item.relevancia_score}/10
              </span>
            </div>
            <h2 className="font-display text-xl md:text-2xl font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
              {item.titulo_curto}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-3xl">
              {item.resumo}
            </p>
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/50">
              <span className="text-xs font-semibold text-foreground/70">{item.fonte}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{formatDate(item.data_publicacao)}</span>
              <div className="ml-auto flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary group-hover:underline">
                  Ler matéria <ExternalLink className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </a>
      <div className="absolute top-3 right-3 flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSave(item.id); }}
        >
          {saved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4 text-muted-foreground" />}
        </Button>
        {isAdmin && (
          <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <AdminActionsMenu
              item={item}
              allNews={allNews}
              onSetNoticiaDoDia={onSetNoticiaDoDia}
              onAddTop5={onAddTop5}
              onRemoveTop5={onRemoveTop5}
              onDelete={onDelete!}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Standard News Card ──────────────────────────────────── */
function NewsCard({ item, isAdmin, onDelete, saved, onToggleSave, trending, allNews, onSetNoticiaDoDia, onAddTop5, onRemoveTop5 }: {
  item: NoticiaHub; isAdmin: boolean; onDelete?: (id: string) => void;
  saved: boolean; onToggleSave: (id: string) => void; trending?: boolean;
  allNews: NoticiaHub[];
  onSetNoticiaDoDia: (id: string) => void;
  onAddTop5: (id: string) => void;
  onRemoveTop5: (id: string) => void;
}) {
  return (
    <div className="relative group/card h-full">
      <a href={item.url_original} target="_blank" rel="noopener noreferrer" className="block group h-full">
        <Card className="border-0 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 h-full">
          <CardContent className="p-5 flex flex-col h-full">
            <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
              <CategoryBadge categoria={item.categoria} />
              <CurationBadges item={item} />
              {trending && (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-[10px] font-bold">
                  <Flame className="h-3 w-3" /> Em alta
                </span>
              )}
              {item.alerta_trade && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 text-[10px] font-bold">
                  <Star className="h-3 w-3" /> Destaque
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug flex-grow line-clamp-2">
              {item.titulo_curto}
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
              {item.resumo}
            </p>
            <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-border/40">
              <span className="text-[11px] font-semibold text-foreground/70">{item.fonte}</span>
              <span className="text-[11px] text-muted-foreground">•</span>
              <span className="text-[11px] text-muted-foreground">{formatDate(item.data_publicacao)}</span>
              <ExternalLink className="h-3 w-3 ml-auto text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </CardContent>
        </Card>
      </a>
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSave(item.id); }}
        >
          {saved ? <BookmarkCheck className="h-3.5 w-3.5 text-primary" /> : <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />}
        </Button>
        {isAdmin && (
          <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <AdminActionsMenu
              item={item}
              allNews={allNews}
              onSetNoticiaDoDia={onSetNoticiaDoDia}
              onAddTop5={onAddTop5}
              onRemoveTop5={onRemoveTop5}
              onDelete={onDelete!}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Compact List Card (for sidebar sections) ────────────── */
function CompactNewsItem({ item, index, isAdmin, allNews, onSetNoticiaDoDia, onAddTop5, onRemoveTop5, onDelete }: {
  item: NoticiaHub; index: number;
  isAdmin: boolean; allNews: NoticiaHub[];
  onSetNoticiaDoDia: (id: string) => void;
  onAddTop5: (id: string) => void;
  onRemoveTop5: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const isFirst = index === 0;
  return (
    <div className="group/compact relative">
      <a
        href={item.url_original}
        target="_blank"
        rel="noopener noreferrer"
        className={`group flex items-start gap-3 rounded-lg transition-colors ${
          isFirst ? "p-3 bg-primary/5 border border-primary/10" : "p-2.5 hover:bg-muted/50"
        }`}
      >
        <span className={`flex-shrink-0 w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center mt-0.5 ${
          isFirst ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
        }`}>
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-relaxed ${
            isFirst ? "text-sm" : "text-xs"
          }`}>
            {item.titulo_curto}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <CategoryBadge categoria={item.categoria} />
            <span className="text-[10px] text-muted-foreground">{item.fonte}</span>
            <span className="text-[10px] text-muted-foreground">•</span>
            <span className="text-[10px] text-muted-foreground">{formatDate(item.data_publicacao)}</span>
          </div>
        </div>
      </a>
      {isAdmin && (
        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover/compact:opacity-100 transition-opacity" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <AdminActionsMenu
            item={item}
            allNews={allNews}
            onSetNoticiaDoDia={onSetNoticiaDoDia}
            onAddTop5={onAddTop5}
            onRemoveTop5={onRemoveTop5}
            onDelete={onDelete}
          />
        </div>
      )}
    </div>
  );
}

/* ── Destaques Full-width Carousel with auto-advance ─────── */
function DestaquesCarousel({ items, isAdmin, onDelete, savedIds, onToggleSave, trendingSet, allNews, onSetNoticiaDoDia, onAddTop5, onRemoveTop5 }: {
  items: NoticiaHub[]; isAdmin: boolean; onDelete: (id: string) => void;
  savedIds: Set<string>; onToggleSave: (id: string) => void; trendingSet: Set<string>;
  allNews: NoticiaHub[];
  onSetNoticiaDoDia: (id: string) => void;
  onAddTop5: (id: string) => void;
  onRemoveTop5: (id: string) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 10000);
  }, [items.length]);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  const goTo = (dir: "prev" | "next") => {
    setActiveIndex((prev) => dir === "next" ? (prev + 1) % items.length : (prev - 1 + items.length) % items.length);
    resetTimer();
  };

  const current = items[activeIndex];
  if (!current) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500">
            <Star className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-base font-bold text-foreground">Destaques do Trade</h2>
          <span className="text-xs text-muted-foreground">{activeIndex + 1} / {items.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => goTo("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => goTo("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative">
        <a href={current.url_original} target="_blank" rel="noopener noreferrer" className="block group">
          <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-orange-50/50 to-card ring-1 ring-orange-200/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                  <Star className="h-3 w-3" /> Destaque do Trade
                </span>
                <CategoryBadge categoria={current.categoria} />
                <CurationBadges item={current} />
                {trendingSet.has(current.id) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-[10px] font-bold">
                    <Flame className="h-3 w-3" /> Em alta
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-foreground group-hover:text-orange-600 transition-colors leading-snug">
                {current.titulo_curto}
              </h3>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                {current.resumo}
              </p>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-orange-100">
                <span className="text-xs font-semibold text-foreground/70">{current.fonte}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">{formatDate(current.data_publicacao)}</span>
                <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-orange-600 group-hover:underline">
                  Ler matéria <ExternalLink className="h-3.5 w-3.5" />
                </span>
              </div>
            </CardContent>
          </Card>
        </a>
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSave(current.id); }}
          >
            {savedIds.has(current.id) ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4 text-muted-foreground" />}
          </Button>
          {isAdmin && (
            <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
              <AdminActionsMenu
                item={current}
                allNews={allNews}
                onSetNoticiaDoDia={onSetNoticiaDoDia}
                onAddTop5={onAddTop5}
                onRemoveTop5={onRemoveTop5}
                onDelete={onDelete}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => { setActiveIndex(i); resetTimer(); }}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === activeIndex ? "w-6 bg-orange-500" : "w-1.5 bg-muted-foreground/20 hover:bg-muted-foreground/40"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

/* ── Main Page ───────────────────────────────────────────── */
export default function Noticias() {
  const [activeFilter, setActiveFilter] = useState("Todas");
  const [page, setPage] = useState(1);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [pendingTop5Id, setPendingTop5Id] = useState<string | null>(null);
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const carouselRef = useRef<HTMLDivElement>(null);

  const { data: allNews, isLoading } = useQuery({
    queryKey: ["noticias-hub"],
    queryFn: async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("noticias_dashboard")
        .select("*")
        .eq("status", "aprovado")
        .gte("data_publicacao", twentyFourHoursAgo)
        .order("data_publicacao", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        is_noticia_do_dia: d.is_noticia_do_dia ?? false,
        top5_position: d.top5_position ?? null,
      })) as NoticiaHub[];
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("noticias_dashboard").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["noticias-hub"] });
      queryClient.invalidateQueries({ queryKey: ["curated-news-dashboard"] });
      toast({ title: "Notícia excluída com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  const curationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      const { error } = await (supabase as any).from("noticias_dashboard").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["noticias-hub"] });
      queryClient.invalidateQueries({ queryKey: ["curated-news-dashboard"] });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta notícia?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSetNoticiaDoDia = (id: string) => {
    curationMutation.mutate(
      { id, data: { is_noticia_do_dia: true } },
      { onSuccess: () => toast({ title: "✨ Notícia do Dia definida!" }) }
    );
  };

  const handleAddTop5 = (id: string) => {
    const currentTop5 = (allNews || []).filter((n) => n.top5_position != null);
    if (currentTop5.length >= 5) {
      setPendingTop5Id(id);
      return;
    }
    const usedPositions = new Set(currentTop5.map((n) => n.top5_position));
    let nextPos = 1;
    while (usedPositions.has(nextPos) && nextPos <= 5) nextPos++;

    curationMutation.mutate(
      { id, data: { top5_position: nextPos } },
      { onSuccess: () => toast({ title: `Adicionada ao Top 5 na posição #${nextPos}` }) }
    );
  };

  const handleRemoveTop5 = (id: string) => {
    curationMutation.mutate(
      { id, data: { top5_position: null } },
      { onSuccess: () => toast({ title: "Removida do Top 5" }) }
    );
  };

  const handleReplaceTop5 = (removeId: string) => {
    if (!pendingTop5Id) return;
    const removedItem = (allNews || []).find((n) => n.id === removeId);
    const position = removedItem?.top5_position ?? 1;

    // Remove old, then add new at same position
    curationMutation.mutate(
      { id: removeId, data: { top5_position: null } },
      {
        onSuccess: () => {
          curationMutation.mutate(
            { id: pendingTop5Id!, data: { top5_position: position } },
            { onSuccess: () => toast({ title: `Substituída no Top 5 posição #${position}` }) }
          );
        },
      }
    );
    setPendingTop5Id(null);
  };

  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast({ title: "Notícia removida dos salvos" });
      } else {
        next.add(id);
        toast({ title: "Notícia salva!" });
      }
      return next;
    });
  };

  const scrollCarousel = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const amount = 320;
    carouselRef.current.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  // ── Sections ──
  const alertas = useMemo(
    () => (allNews || []).filter((n) => n.alerta_trade).slice(0, 6),
    [allNews]
  );
  const alertaIds = useMemo(() => new Set(alertas.map((n) => n.id)), [alertas]);

  // Hero: prefer manually selected "Notícia do Dia", fallback to first non-alert
  const hero = useMemo(() => {
    const manual = (allNews || []).find((n) => n.is_noticia_do_dia);
    if (manual) return manual;
    return (allNews || []).find((n) => !alertaIds.has(n.id));
  }, [allNews, alertaIds]);

  const heroAndAlertIds = useMemo(() => {
    const s = new Set(alertaIds);
    if (hero) s.add(hero.id);
    return s;
  }, [alertaIds, hero]);

  const curadoria = useMemo(
    () => (allNews || []).filter((n) => !heroAndAlertIds.has(n.id)),
    [allNews, heroAndAlertIds]
  );

  // Top 5: prefer manually curated, fallback to highest score
  const topHeadlines = useMemo(() => {
    const manual = (allNews || [])
      .filter((n) => n.top5_position != null)
      .sort((a, b) => (a.top5_position ?? 0) - (b.top5_position ?? 0));
    if (manual.length >= 1) {
      // Fill remaining spots with highest score if manual < 5
      if (manual.length < 5) {
        const manualIds = new Set(manual.map((n) => n.id));
        const auto = [...(allNews || [])]
          .filter((n) => !manualIds.has(n.id))
          .sort((a, b) => b.relevancia_score - a.relevancia_score)
          .slice(0, 5 - manual.length);
        return [...manual, ...auto];
      }
      return manual.slice(0, 5);
    }
    return [...(allNews || [])].sort((a, b) => b.relevancia_score - a.relevancia_score).slice(0, 5);
  }, [allNews]);

  const trending = useMemo(
    () => [...(allNews || [])].sort((a, b) => b.relevancia_score - a.relevancia_score).slice(0, 3).map((n) => n.id),
    [allNews]
  );
  const trendingSet = useMemo(() => new Set(trending), [trending]);

  const filteredNews = useMemo(() => {
    if (!allNews) return [];
    switch (activeFilter) {
      case "Destaques do Trade":
        return allNews.filter((n) => n.tipo_exibicao === "destaque" || n.alerta_trade);
      case "Todas":
        return allNews;
      default:
        return allNews.filter((n) => n.categoria === activeFilter);
    }
  }, [allNews, activeFilter]);

  const totalPages = Math.ceil(filteredNews.length / PAGE_SIZE);
  const paginatedNews = filteredNews.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setPage(1);
  };

  const showSections = activeFilter === "Todas";

  const currentTop5ForDialog = useMemo(
    () => (allNews || []).filter((n) => n.top5_position != null),
    [allNews]
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          pageKey="noticias"
          title="Notícias do Trade"
          subtitle="Curadoria inteligente das últimas 24 horas"
          icon={Newspaper}
          adminTab="curadoria"
        />

        {/* ── Filter Bar with Icons ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIAS_FILTER.map((cat) => {
            const icon = CATEGORIA_ICONS[cat];
            return (
              <Button
                key={cat}
                variant={activeFilter === cat ? "default" : "outline"}
                size="sm"
                className={`whitespace-nowrap text-xs rounded-full px-3.5 gap-1.5 ${
                  activeFilter === cat ? "shadow-md shadow-primary/20" : ""
                }`}
                onClick={() => handleFilterChange(cat)}
              >
                {icon}
                {cat}
              </Button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando notícias...</p>
          </div>
        ) : (
          <>
            {showSections && (
              <>
                {/* ── Hero + Top 5 side by side, same height ── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-stretch">
                  <div className="lg:col-span-3 flex">
                    {hero && (
                      <div className="w-full flex">
                        <HeroNewsCard
                          item={hero}
                          isAdmin={isAdmin}
                          onDelete={handleDelete}
                          saved={savedIds.has(hero.id)}
                          onToggleSave={toggleSave}
                          allNews={allNews || []}
                          onSetNoticiaDoDia={handleSetNoticiaDoDia}
                          onAddTop5={handleAddTop5}
                          onRemoveTop5={handleRemoveTop5}
                        />
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-2 flex">
                    <Card className="border-0 shadow-md w-full flex flex-col bg-gradient-to-b from-card to-muted/20">
                      <CardContent className="p-4 flex flex-col flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/15">
                            <Zap className="h-4 w-4 text-warning" />
                          </div>
                          <h3 className="text-sm font-bold text-foreground">Top 5</h3>
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          {topHeadlines.map((item, i) => (
                            <CompactNewsItem
                              key={item.id}
                              item={item}
                              index={i}
                              isAdmin={isAdmin}
                              allNews={allNews || []}
                              onSetNoticiaDoDia={handleSetNoticiaDoDia}
                              onAddTop5={handleAddTop5}
                              onRemoveTop5={handleRemoveTop5}
                              onDelete={handleDelete}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {alertas.length > 0 && (
                  <DestaquesCarousel
                    items={alertas}
                    isAdmin={isAdmin}
                    onDelete={handleDelete}
                    savedIds={savedIds}
                    onToggleSave={toggleSave}
                    trendingSet={trendingSet}
                    allNews={allNews || []}
                    onSetNoticiaDoDia={handleSetNoticiaDoDia}
                    onAddTop5={handleAddTop5}
                    onRemoveTop5={handleRemoveTop5}
                  />
                )}

                {curadoria.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                      <h2 className="text-base font-bold text-foreground">Outras Notícias</h2>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {curadoria.map((item) => (
                        <NewsCard
                          key={item.id}
                          item={item}
                          isAdmin={isAdmin}
                          onDelete={handleDelete}
                          saved={savedIds.has(item.id)}
                          onToggleSave={toggleSave}
                          trending={trendingSet.has(item.id)}
                          allNews={allNews || []}
                          onSetNoticiaDoDia={handleSetNoticiaDoDia}
                          onAddTop5={handleAddTop5}
                          onRemoveTop5={handleRemoveTop5}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            {!showSections && paginatedNews.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-base font-bold text-foreground">{activeFilter}</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {paginatedNews.map((item) => (
                    <NewsCard
                      key={item.id}
                      item={item}
                      isAdmin={isAdmin}
                      onDelete={handleDelete}
                      saved={savedIds.has(item.id)}
                      onToggleSave={toggleSave}
                      trending={trendingSet.has(item.id)}
                      allNews={allNews || []}
                      onSetNoticiaDoDia={handleSetNoticiaDoDia}
                      onAddTop5={handleAddTop5}
                      onRemoveTop5={handleRemoveTop5}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-4">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-full">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium text-muted-foreground">
                      {page} de {totalPages}
                    </span>
                    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-full">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </section>
            )}

            {filteredNews.length === 0 && (
              <div className="text-center py-24 text-muted-foreground">
                <Newspaper className="h-14 w-14 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Nenhuma notícia nas últimas 24 horas</p>
                <p className="text-sm mt-1">Novas notícias aparecerão aqui conforme forem publicadas</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Top 5 replacement dialog */}
      <Top5ReplacementDialog
        open={!!pendingTop5Id}
        onClose={() => setPendingTop5Id(null)}
        currentTop5={currentTop5ForDialog}
        onReplace={handleReplaceTop5}
      />
    </DashboardLayout>
  );
}
