import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plane,
  Building2,
  Hotel,
  Car,
  Ship,
  Shield,
  Ticket,
  MapPin,
  Users,
  Globe,
  LucideIcon,
} from "lucide-react";

interface CategoryItem {
  title: string;
  icon: LucideIcon;
  category: string;
  bg: string;
  iconColor: string;
}

const CATEGORIES: CategoryItem[] = [
  { title: "Operadoras", icon: Plane, category: "Operadoras de turismo", bg: "bg-blue-100", iconColor: "text-blue-600" },
  { title: "Consolidadoras", icon: Building2, category: "Consolidadoras", bg: "bg-violet-100", iconColor: "text-violet-600" },
  { title: "Cias Aéreas", icon: Plane, category: "Companhias aéreas", bg: "bg-sky-100", iconColor: "text-sky-600" },
  { title: "Hospedagem", icon: Hotel, category: "Hospedagem", bg: "bg-amber-100", iconColor: "text-amber-600" },
  { title: "Locadoras", icon: Car, category: "Locadoras de veículos", bg: "bg-emerald-100", iconColor: "text-emerald-600" },
  { title: "Cruzeiros", icon: Ship, category: "Cruzeiros", bg: "bg-cyan-100", iconColor: "text-cyan-600" },
  { title: "Seguros", icon: Shield, category: "Seguros viagem", bg: "bg-rose-100", iconColor: "text-rose-600" },
  { title: "Parques", icon: Ticket, category: "Parques e atrações", bg: "bg-pink-100", iconColor: "text-pink-600" },
  { title: "Receptivos", icon: MapPin, category: "Receptivos", bg: "bg-orange-100", iconColor: "text-orange-600" },
  { title: "Guias", icon: Users, category: "Guias", bg: "bg-teal-100", iconColor: "text-teal-600" },
];

export function MapaTurismoCard() {
  const navigate = useNavigate();

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="pt-5 pb-5 space-y-4">
        <div className="w-fit">
          <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Mapa do Turismo
          </h2>
          <div className="mt-2 h-1 w-full rounded-full bg-primary" />
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.title}
              onClick={() =>
                navigate(`/mapa-turismo?categoria=${encodeURIComponent(cat.category)}`)
              }
              className="flex flex-col items-center justify-center gap-2 rounded-2xl p-3 transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer aspect-square"
              aria-label={`Acessar ${cat.title}`}
              style={{}}
            >
              <div className={`flex items-center justify-center w-full h-full rounded-2xl ${cat.bg}`}>
                <div className="flex flex-col items-center gap-1.5">
                  <cat.icon className={`h-5 w-5 ${cat.iconColor}`} />
                  <span className={`text-[10px] sm:text-xs font-medium ${cat.iconColor} text-center leading-tight px-1`}>
                    {cat.title}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}