import "./index.css";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TripWalletModulesCard } from "@/components/wallet/TripWalletModulesCard";
import { PublicCarRentalCard } from "@/components/wallet/PublicCarRentalCard";
const svc = { id: "c1", service_type: "car_rental", attachments: [], image_urls: ["/__h_car.jpg", "/__h_car.jpg"], images: ["/__h_car.jpg", "/__h_car.jpg"], service_data: { car_model: "Modelo", rental_company: "Locadora", images: ["/__h_car.jpg","/__h_car.jpg"], image_urls: ["/__h_car.jpg","/__h_car.jpg"], drivers: [{ name: "Pessoa A" }, { name: "Pessoa B" }] } } as any;
createRoot(document.getElementById("root")!).render(<QueryClientProvider client={new QueryClient()}><div className="mx-auto max-w-2xl space-y-8 p-4"><div id="mod"><TripWalletModulesCard tripId="00000000-0000-0000-0000-000000000000" initialOverrides={{ show_next_service: true }} /></div><div id="car"><PublicCarRentalCard service={svc} access={{ mode: "public" } as any} /></div></div></QueryClientProvider>);
