import {
  Plane, Hotel, Car, ArrowRightLeft, Ticket, Shield, Ship, Map as MapIcon,
  Package, TramFront, type LucideIcon,
} from "lucide-react";
import type { ServiceType } from "@/types/quote";

export interface ServiceTheme {
  label: string;
  Icon: LucideIcon;
  /** Strong tone for icon + name + accents — uses semantic-ish Tailwind hues */
  textStrong: string;
  iconStrong: string;
  /** Soft surface for AI card background and chooser shell */
  bgSoft: string;
  /** Solid border for AI card / focus accent */
  borderStrong: string;
  /** Description text helper (matches AI card readability) */
  descColor: string;
}

const THEMES: Record<ServiceType, ServiceTheme> = {
  flight: {
    label: "Passagem Aérea",     Icon: Plane,
    textStrong: "text-sky-700",  iconStrong: "text-sky-600",
    bgSoft: "bg-sky-50",         borderStrong: "border-sky-300",
    descColor: "text-sky-900/70",
  },
  hotel: {
    label: "Hospedagem",          Icon: Hotel,
    textStrong: "text-amber-700", iconStrong: "text-amber-600",
    bgSoft: "bg-amber-50",        borderStrong: "border-amber-300",
    descColor: "text-amber-900/70",
  },
  car_rental: {
    label: "Locação de Veículo",     Icon: Car,
    textStrong: "text-emerald-700",  iconStrong: "text-emerald-600",
    bgSoft: "bg-emerald-50",         borderStrong: "border-emerald-300",
    descColor: "text-emerald-900/70",
  },
  transfer: {
    label: "Transfer",              Icon: ArrowRightLeft,
    textStrong: "text-indigo-700",  iconStrong: "text-indigo-600",
    bgSoft: "bg-indigo-50",         borderStrong: "border-indigo-300",
    descColor: "text-indigo-900/70",
  },
  attraction: {
    label: "Ingressos / Atrações", Icon: Ticket,
    textStrong: "text-pink-700",   iconStrong: "text-pink-600",
    bgSoft: "bg-pink-50",          borderStrong: "border-pink-300",
    descColor: "text-pink-900/70",
  },
  insurance: {
    label: "Seguro Viagem",       Icon: Shield,
    textStrong: "text-rose-700",  iconStrong: "text-rose-600",
    bgSoft: "bg-rose-50",         borderStrong: "border-rose-300",
    descColor: "text-rose-900/70",
  },
  cruise: {
    label: "Cruzeiros",           Icon: Ship,
    textStrong: "text-cyan-700",  iconStrong: "text-cyan-600",
    bgSoft: "bg-cyan-50",         borderStrong: "border-cyan-300",
    descColor: "text-cyan-900/70",
  },
  rail_transport: {
    label: "Transporte Ferroviário", Icon: TramFront,
    textStrong: "text-teal-700",     iconStrong: "text-teal-600",
    bgSoft: "bg-teal-50",            borderStrong: "border-teal-300",
    descColor: "text-teal-900/70",
  },
  circuit: {
    label: "Circuitos",             Icon: MapIcon,
    textStrong: "text-violet-700",  iconStrong: "text-violet-600",
    bgSoft: "bg-violet-50",         borderStrong: "border-violet-300",
    descColor: "text-violet-900/70",
  },
  other: {
    label: "Outros Serviços",     Icon: Package,
    textStrong: "text-slate-700", iconStrong: "text-slate-600",
    bgSoft: "bg-slate-50",        borderStrong: "border-slate-300",
    descColor: "text-slate-900/70",
  },
};

export function getServiceTheme(type: ServiceType): ServiceTheme {
  return THEMES[type] ?? THEMES.other;
}