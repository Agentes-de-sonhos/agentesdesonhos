import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TeamSessionProvider } from "@/contexts/TeamSessionContext";
import { Toaster } from "@/components/ui/toaster";
import BibliotecaImagens from "@/pages/BibliotecaImagens";
import { AgencyLibraryPicker } from "@/components/image-library/AgencyLibraryPicker";
import "./index.css";
const qc = new QueryClient();
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={qc}><TeamSessionProvider>
    <div className="p-4"><AgencyLibraryPicker existingUrls={[]} maxSelectable={2} onAdd={(u) => console.log("ADD", u.length)} /></div>
    <BibliotecaImagens /><Toaster />
  </TeamSessionProvider></QueryClientProvider>,
);
