interface ShowcaseHeaderProps {
  profile: any;
  showcase: any;
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
}

export function ShowcaseHeader({ profile, showcase, categories, selectedCategory, onCategoryChange }: ShowcaseHeaderProps) {
  return (
    <header className="bg-card border-b border-border/50 shadow-sm">
      <div className="max-w-xl mx-auto px-5 pt-8 pb-5">
        {/* Agency identity — centered for brand presence */}
        <div className="flex flex-col items-center gap-3 text-center">
          {profile?.agency_logo_url ? (
            <img
              src={profile.agency_logo_url}
              alt={profile.agency_name || ""}
              translate="no"
              className="h-32 sm:h-40 w-auto max-w-[80%] object-contain notranslate"
            />
          ) : (
            <div className="h-24 w-24 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl shrink-0">
              {(profile?.agency_name || profile?.name || "V")[0]}
            </div>
          )}

          <div className="min-w-0">
            {profile?.agency_name && !profile?.agency_logo_url && (
              <h1 className="font-bold text-xl text-foreground truncate notranslate" translate="no">{profile.agency_name}</h1>
            )}
            {(profile?.city || profile?.state) && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {[profile.city, profile.state].filter(Boolean).join(" · ")}
              </p>
            )}
            {showcase.tagline && (
              <p className="text-xs text-muted-foreground/80 mt-1 italic line-clamp-2 max-w-sm">
                {showcase.tagline}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Category filter chips ─── */}
      {categories.length > 1 && (
        <div className="max-w-xl mx-auto px-5 pb-5">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => onCategoryChange("todas")}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex-shrink-0 border ${
                selectedCategory === "todas"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              }`}
            >
              Todas as ofertas
            </button>
            {categories.map(c => (
              <button
                key={c}
                onClick={() => onCategoryChange(c)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex-shrink-0 border ${
                  selectedCategory === c
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
