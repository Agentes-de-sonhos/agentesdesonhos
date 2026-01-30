import { useNavigate } from "react-router-dom";
import { LucideIcon, Plane, Building2, Hotel, Car, Ship, Shield, Ticket, MapPin, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryCardProps {
  title: string;
  icon: LucideIcon;
  category: string;
  color: string;
}

const CATEGORIES: CategoryCardProps[] = [
  { title: "Operadoras de turismo", icon: Plane, category: "Operadoras de turismo", color: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20" },
  { title: "Consolidadoras", icon: Building2, category: "Consolidadoras", color: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20" },
  { title: "Companhias aéreas", icon: Plane, category: "Companhias aéreas", color: "bg-sky-500/10 text-sky-600 hover:bg-sky-500/20" },
  { title: "Hospedagem", icon: Hotel, category: "Hospedagem", color: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20" },
  { title: "Locadoras de veículos", icon: Car, category: "Locadoras de veículos", color: "bg-green-500/10 text-green-600 hover:bg-green-500/20" },
  { title: "Cruzeiros", icon: Ship, category: "Cruzeiros", color: "bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20" },
  { title: "Seguros viagem", icon: Shield, category: "Seguros viagem", color: "bg-red-500/10 text-red-600 hover:bg-red-500/20" },
  { title: "Parques e atrações", icon: Ticket, category: "Parques e atrações", color: "bg-pink-500/10 text-pink-600 hover:bg-pink-500/20" },
  { title: "Receptivos", icon: MapPin, category: "Receptivos", color: "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20" },
  { title: "Guias", icon: Users, category: "Guias", color: "bg-teal-500/10 text-teal-600 hover:bg-teal-500/20" },
];

function CategoryCard({ title, icon: Icon, category, color }: CategoryCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/mapa-turismo?categoria=${encodeURIComponent(category)}`);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "group flex flex-col items-center gap-2 rounded-xl p-4 text-center transition-all duration-300 hover:-translate-y-1",
        "shadow-card hover:shadow-card-hover",
        color
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/50 transition-transform duration-300 group-hover:scale-110">
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-xs font-medium leading-tight">{title}</span>
    </button>
  );
}

export function SupplierCategoriesCard() {
  return (
    <div className="grid grid-cols-5 gap-3 sm:grid-cols-5 lg:grid-cols-10">
      {CATEGORIES.map((cat) => (
        <CategoryCard
          key={cat.category}
          title={cat.title}
          icon={cat.icon}
          category={cat.category}
          color={cat.color}
        />
      ))}
    </div>
  );
}
