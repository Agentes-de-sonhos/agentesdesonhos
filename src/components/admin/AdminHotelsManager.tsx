import { useState, useCallback } from "react";
import { Upload, Trash2, Building2, Download, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";

const FIELD_MAP: Record<string, string> = {
  "hotel name": "name",
  "name": "name",
  "hotel": "name",
  "nome": "name",
  "nome do hotel": "name",
  "destination": "destination",
  "destino": "destination",
  "country": "country",
  "pais": "country",
  "país": "country",
  "region": "region",
  "regiao": "region",
  "região": "region",
  "regiao nyc": "region",
  "regiao_nyc": "region",
  "neighborhood": "neighborhood",
  "bairro": "neighborhood",
  "bairro area": "neighborhood",
  "bairro_area": "neighborhood",
  "category": "category",
  "categoria": "category",
  "star rating": "star_rating",
  "stars": "star_rating",
  "estrelas": "star_rating",
  "classificacao": "star_rating",
  "price from": "price_from",
  "price": "price_from",
  "preco": "price_from",
  "preco a partir": "price_from",
  "review score": "review_score",
  "review": "review_score",
  "nota": "review_score",
  "avaliacao": "review_score",
  "breakfast included": "breakfast_included",
  "breakfast": "breakfast_included",
  "cafe da manha": "breakfast_included",
  "café da manhã": "breakfast_included",
  "free wifi": "free_wifi",
  "wifi": "free_wifi",
  "parking": "parking",
  "estacionamento": "parking",
  "air conditioning": "air_conditioning",
  "ar condicionado": "air_conditioning",
  "pet friendly": "pet_friendly",
  "aceita pets": "pet_friendly",
  "gym": "gym",
  "academia": "gym",
  "spa": "spa",
  "bar": "bar",
  "restaurant": "restaurant",
  "restaurante": "restaurant",
  "pool": "pool",
  "piscina": "pool",
  "accessible": "accessible",
  "acessivel": "accessible",
  "acessível": "accessible",
  "family friendly": "family_friendly",
  "familiar": "family_friendly",
  "brand": "brand",
  "marca": "brand",
  "property type": "property_type",
  "tipo": "property_type",
  "tipo de propriedade": "property_type",
  "free cancellation": "free_cancellation",
  "cancelamento gratuito": "free_cancellation",
  "special offers": "special_offers",
  "ofertas especiais": "special_offers",
  "favorite brazilians": "favorite_brazilians",
  "favorito brasileiros": "favorite_brazilians",
  "favorito_brasileiros": "favorite_brazilians",
  "most booked brazilians": "most_booked_brazilians",
  "mais vendido brasileiros": "most_booked_brazilians",
  "mais_vendido_brasileiros": "most_booked_brazilians",
  "iconic hotel": "iconic_hotel",
  "hotel iconico": "iconic_hotel",
  "hotel_iconico": "iconic_hotel",
  "address": "address",
  "endereco": "address",
  "endereço": "address",
  "rua": "address",
  "rua endereco": "address",
  "rua_endereco": "address",
  "city": "city",
  "cidade": "city",
  "state": "state",
  "estado": "state",
  "zip code": "zip_code",
  "zip_code": "zip_code",
  "cep": "zip_code",
  "google maps link": "google_maps_link",
  "google_maps_link": "google_maps_link",
  "link google maps": "google_maps_link",
};

const BOOLEAN_FIELDS = [
  "breakfast_included", "free_wifi", "parking", "air_conditioning", "pet_friendly",
  "gym", "spa", "bar", "restaurant", "pool", "accessible", "family_friendly",
  "free_cancellation", "special_offers", "favorite_brazilians", "most_booked_brazilians", "iconic_hotel",
];

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[_\-]/g, " ").trim();
}

function parseBool(v: any): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  const s = String(v).toLowerCase().trim();
  return ["true", "yes", "sim", "1", "x", "✓", "✔"].includes(s);
}

function parseRow(row: Record<string, any>, headerMap: Record<string, string>): Record<string, any> | null {
  const mapped: Record<string, any> = {};
  for (const [originalKey, value] of Object.entries(row)) {
    const field = headerMap[normalizeHeader(originalKey)];
    if (!field) continue;

    if (BOOLEAN_FIELDS.includes(field)) {
      mapped[field] = parseBool(value);
    } else if (["star_rating", "price_from", "review_score"].includes(field)) {
      const num = parseFloat(String(value).replace(/[^0-9.]/g, ""));
      mapped[field] = isNaN(num) ? null : num;
    } else {
      mapped[field] = value != null ? String(value).trim() : null;
    }
  }

  if (!mapped.name) return null;
  if (!mapped.country) mapped.country = "";
  return mapped;
}

export function AdminHotelsManager() {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [importDestination, setImportDestination] = useState("");
  const queryClient = useQueryClient();

  const { data: hotels, isLoading } = useQuery({
    queryKey: ["admin-hotels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotels")
        .select("id, name, destination, category, star_rating, region, is_active")
        .order("destination")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-hotels-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hotels").select("destination").eq("is_active", true);
      if (error) throw error;
      const destinations = [...new Set((data || []).map((h) => h.destination))];
      return { total: data?.length || 0, destinations: destinations.length };
    },
  });

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setImporting(true);
      setImportResult(null);

      try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
          toast.error("Planilha vazia");
          setImporting(false);
          return;
        }

        // Build header map
        const headers = Object.keys(rows[0]);
        const headerMap: Record<string, string> = {};
        for (const h of headers) {
          const normalized = normalizeHeader(h);
          if (FIELD_MAP[normalized]) {
            headerMap[h] = FIELD_MAP[normalized];
          }
        }

        const parsed = rows.map((r) => {
          const row = parseRow(r, headerMap);
          if (!row) return null;
          // Fill destination from input if not in spreadsheet
          if (!row.destination && importDestination.trim()) {
            row.destination = importDestination.trim();
          }
          if (!row.destination) return null;
          return row;
        }).filter(Boolean) as Record<string, any>[];

        if (parsed.length === 0) {
          toast.error("Nenhuma linha válida encontrada. Verifique os cabeçalhos e o destino.");
          setImporting(false);
          return;
        }

        // Insert in batches of 50
        let success = 0;
        let failed = 0;
        for (let i = 0; i < parsed.length; i += 50) {
          const batch = parsed.slice(i, i + 50);
          const { error } = await supabase.from("hotels").insert(batch as any);
          if (error) {
            failed += batch.length;
          } else {
            success += batch.length;
          }
        }

        setImportResult({ success, failed });
        toast.success(`${success} hotéis importados com sucesso!`);
        queryClient.invalidateQueries({ queryKey: ["admin-hotels"] });
        queryClient.invalidateQueries({ queryKey: ["admin-hotels-stats"] });
        queryClient.invalidateQueries({ queryKey: ["hotels"] });
        queryClient.invalidateQueries({ queryKey: ["hotel-filter-options"] });
      } catch (err) {
        toast.error("Erro ao processar a planilha");
        console.error(err);
      } finally {
        setImporting(false);
        e.target.value = "";
      }
    },
    [queryClient]
  );

  const handleDeleteAll = async (destination: string) => {
    if (!confirm(`Tem certeza que deseja excluir TODOS os hotéis de "${destination}"?`)) return;
    const { error } = await supabase.from("hotels").delete().eq("destination", destination);
    if (error) {
      toast.error("Erro ao excluir hotéis");
    } else {
      toast.success(`Hotéis de "${destination}" excluídos`);
      queryClient.invalidateQueries({ queryKey: ["admin-hotels"] });
      queryClient.invalidateQueries({ queryKey: ["admin-hotels-stats"] });
    }
  };

  const downloadTemplate = () => {
    const headers = [
      "Hotel Name", "Destination", "Country", "Region", "Neighborhood", "Category",
      "Star Rating", "Price From", "Review Score", "Breakfast Included", "Free WiFi",
      "Parking", "Air Conditioning", "Pet Friendly", "Gym", "Spa", "Bar", "Restaurant",
      "Pool", "Accessible", "Family Friendly", "Brand", "Property Type",
      "Free Cancellation", "Special Offers", "Favorite Brazilians",
      "Most Booked Brazilians", "Iconic Hotel", "Address", "City", "State",
      "Zip Code", "Google Maps Link",
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, [
      "Hotel Example", "New York", "USA", "Midtown Manhattan", "Times Square", "BBB+",
      4, 200, 4.5, "Yes", "Yes", "No", "Yes", "No", "Yes", "No", "Yes", "Yes",
      "No", "No", "Yes", "Marriott", "Hotel", "Yes", "No", "Yes", "No", "No",
      "123 Broadway", "New York", "NY", "10001", "https://maps.google.com/...",
    ]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hotels");
    XLSX.writeFile(wb, "hotel_advisor_template.xlsx");
  };

  // Group hotels by destination
  const grouped = (hotels || []).reduce<Record<string, typeof hotels>>((acc, h) => {
    if (!acc[h.destination]) acc[h.destination] = [];
    acc[h.destination]!.push(h);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{stats?.total || 0}</div>
            <p className="text-sm text-muted-foreground">Hotéis cadastrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{stats?.destinations || 0}</div>
            <p className="text-sm text-muted-foreground">Destinos</p>
          </CardContent>
        </Card>
      </div>

      {/* Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Hotéis
          </CardTitle>
          <CardDescription>
            Faça upload de uma planilha CSV ou Excel com os dados dos hotéis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="sr-only"
                disabled={importing}
              />
              <Button variant="default" asChild disabled={importing}>
                <span className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  {importing ? "Importando..." : "Selecionar Planilha"}
                </span>
              </Button>
            </label>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Template
            </Button>
          </div>

          {importResult && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              {importResult.failed === 0 ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <AlertCircle className="h-5 w-5 text-warning" />
              )}
              <span className="text-sm">
                <strong>{importResult.success}</strong> importados com sucesso
                {importResult.failed > 0 && (
                  <>, <strong className="text-destructive">{importResult.failed}</strong> falharam</>
                )}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hotels by destination */}
      {Object.entries(grouped).map(([dest, destHotels]) => (
        <Card key={dest}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {dest}
                <Badge variant="secondary">{destHotels!.length}</Badge>
              </CardTitle>
            </div>
            <Button variant="destructive" size="sm" onClick={() => handleDeleteAll(dest)}>
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir todos
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Estrelas</TableHead>
                  <TableHead>Região</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {destHotels!.slice(0, 10).map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.name}</TableCell>
                    <TableCell>{h.category || "—"}</TableCell>
                    <TableCell>{h.star_rating || "—"}</TableCell>
                    <TableCell>{h.region || "—"}</TableCell>
                  </TableRow>
                ))}
                {destHotels!.length > 10 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground text-sm">
                      + {destHotels!.length - 10} hotéis adicionais
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
