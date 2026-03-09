import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Pencil, Trash2, BookOpen, Save, X, Upload, FileText, Loader2, ImageIcon } from "lucide-react";
import { usePlaybook, usePlaybookAdmin } from "@/hooks/usePlaybook";
import { ImageCropDialog } from "./ImageCropDialog";
import { useToast } from "@/hooks/use-toast";
import {
  PLAYBOOK_TABS, BLOCK_TYPE_OPTIONS,
  type PlaybookBlock, type PlaybookBlockType, type PlaybookSection, type PlaybookContent, type PlaybookPDFFile,
} from "@/types/playbook";
import { PlaybookBlockEditorItem, AddBlockMenu } from "./PlaybookBlockEditor";

const COMO_VENDER_SECTIONS = [
  { id: "visao_comercial", label: "Visão Comercial do Destino" },
  { id: "perfil_passageiro", label: "Perfil e Desejo do Passageiro" },
  { id: "posicionamento", label: "Posicionamento na Venda" },
  { id: "metodo_consultivo", label: "Venda Consultiva para Turismo" },
  { id: "sete_passos", label: "7 Passos da Venda" },
  { id: "argumentos", label: "Argumentos de Venda Prontos" },
  { id: "objecoes", label: "Objeções Comuns e Respostas" },
  { id: "erros", label: "Erros que Perdem Vendas" },
  { id: "fechamento", label: "Estratégias de Fechamento" },
  { id: "checklist", label: "Checklist Rápido de Venda" },
] as const;

export function AdminPlaybookManager() {
  const { destinations } = usePlaybook();
  const { createDestination, updateDestination, deleteDestination } = usePlaybookAdmin();
  const [showForm, setShowForm] = useState(false);
  const [editingDest, setEditingDest] = useState<any>(null);
  const [selectedDestId, setSelectedDestId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<"cover" | "banner">("cover");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const { toast } = useToast();

  const resetForm = () => { setName(""); setSlug(""); setDescription(""); setImageUrl(""); setBannerUrl(""); setEditingDest(null); setShowForm(false); };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropConfirm = async (blob: Blob) => {
    setCropSrc(null);
    setUploadingCover(true);
    try {
      const path = `playbook-covers/${Date.now()}_cover.jpg`;
      const { error } = await supabase.storage.from("playbook-files").upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("playbook-files").getPublicUrl(path);
      setImageUrl(data.publicUrl);
      toast({ title: "Imagem enviada!" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar imagem", description: err.message, variant: "destructive" });
    } finally {
      setUploadingCover(false);
    }
  };

  const handleEdit = (dest: any) => {
    setEditingDest(dest);
    setName(dest.name); setSlug(dest.slug); setDescription(dest.description || ""); setImageUrl(dest.image_url || "");
    setShowForm(true);
  };

  const handleSave = () => {
    const data = { name, slug: slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''), description: description || null, image_url: imageUrl || null };
    if (editingDest) updateDestination.mutate({ id: editingDest.id, ...data });
    else createDestination.mutate(data);
    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Playbooks Comerciais</h2>
          <Badge variant="secondary">{destinations.length}</Badge>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}><Plus className="h-4 w-4 mr-2" /> Novo Destino</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-lg">{editingDest ? "Editar" : "Novo"} Destino</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Nome do Destino</Label><Input value={name} onChange={(e) => { setName(e.target.value); if (!editingDest) setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')); }} placeholder="Nova York" /></div>
              <div><Label>Slug (URL)</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="nova-york" /></div>
            </div>
            <div><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breve descrição..." rows={2} /></div>
            <div>
              <Label>Imagem de Capa</Label>
              {imageUrl && (
                <div className="mb-2 relative rounded-lg overflow-hidden" style={{ aspectRatio: "3/2", maxWidth: 280 }}>
                  <img src={imageUrl} alt="Capa" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={uploadingCover} asChild>
                  <label className="cursor-pointer">
                    {uploadingCover ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-2" />}
                    {uploadingCover ? "Enviando..." : imageUrl ? "Trocar imagem" : "Enviar imagem"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleCoverFileChange} />
                  </label>
                </Button>
                {imageUrl && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setImageUrl("")}><Trash2 className="h-3 w-3 mr-1" /> Remover</Button>}
              </div>
              <ImageCropDialog
                open={!!cropSrc}
                imageSrc={cropSrc || ""}
                aspect={3 / 2}
                title="Posicionar capa do Playbook"
                onClose={() => setCropSrc(null)}
                onConfirm={handleCropConfirm}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={!name.trim()}><Save className="h-4 w-4 mr-2" /> Salvar</Button>
              <Button variant="outline" onClick={resetForm}><X className="h-4 w-4 mr-2" /> Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {destinations.map((dest) => (
          <Card key={dest.id}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {dest.image_url ? (
                    <img src={dest.image_url} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><BookOpen className="h-5 w-5 text-primary" /></div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{dest.name}</p>
                    <p className="text-xs text-muted-foreground">/playbook/{dest.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setSelectedDestId(selectedDestId === dest.id ? null : dest.id)}>Editar Conteúdo</Button>
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(dest)}><Pencil className="h-4 w-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Destino?</AlertDialogTitle>
                        <AlertDialogDescription>Isso removerá o playbook "{dest.name}" e todo seu conteúdo.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteDestination.mutate(dest.id)}>Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
            {selectedDestId === dest.id && <SectionEditor destinationId={dest.id} />}
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ── Section Editor with full block support ── */
function SectionEditor({ destinationId }: { destinationId: string }) {
  const { upsertSection } = usePlaybookAdmin();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>(PLAYBOOK_TABS[0].key);
  const [intro, setIntro] = useState("");
  const [blocks, setBlocks] = useState<PlaybookBlock[]>([]);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfFiles, setPdfFiles] = useState<PlaybookPDFFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [sectionIntros, setSectionIntros] = useState<Record<string, string>>({});
  const [sectionBlocks, setSectionBlocks] = useState<Record<string, PlaybookBlock[]>>({});

  const { data: destSections = [] } = useQuery({
    queryKey: ["playbook-sections", destinationId],
    queryFn: async () => {
      const { data, error } = await supabase.from("playbook_sections").select("*").eq("destination_id", destinationId).order("order_index", { ascending: true });
      if (error) throw error;
      return (data as any[]).map((s) => ({ ...s, content: (typeof s.content === 'string' ? JSON.parse(s.content) : s.content) as PlaybookContent })) as PlaybookSection[];
    },
  });

  const loadTab = (tabKey: string) => {
    setActiveTab(tabKey);
    const section = destSections.find((s) => s.tab_key === tabKey);
    if (section) {
      setIntro(section.content.intro || "");
      setBlocks(section.content.blocks || []);
      setPdfUrl(section.content.pdf_url || "");
      setPdfFiles(section.content.pdf_files || []);
      const content = section.content as any;
      const intros: Record<string, string> = {};
      const blks: Record<string, PlaybookBlock[]> = {};
      COMO_VENDER_SECTIONS.forEach((s) => {
        intros[s.id] = content?.sections?.[s.id]?.intro || "";
        blks[s.id] = (content?.blocks || []).filter((b: any) => b.section === s.id);
      });
      setSectionIntros(intros);
      setSectionBlocks(blks);
    } else {
      setIntro(""); setBlocks([]); setPdfUrl(""); setPdfFiles([]);
      const empty: Record<string, string> = {};
      const emptyB: Record<string, PlaybookBlock[]> = {};
      COMO_VENDER_SECTIONS.forEach((s) => { empty[s.id] = ""; emptyB[s.id] = []; });
      setSectionIntros(empty); setSectionBlocks(emptyB);
    }
  };

  if (!initialized && destSections.length >= 0) { loadTab(PLAYBOOK_TABS[0].key); setInitialized(true); }

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") { toast({ title: "Selecione um PDF.", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const sanitized = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${destinationId}/${activeTab}/${Date.now()}_${sanitized}`;
      const { error } = await supabase.storage.from("playbook-files").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("playbook-files").getPublicUrl(path);
      setPdfUrl(data.publicUrl);
      toast({ title: "PDF enviado!" });
    } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
    finally { setUploading(false); }
  };

  const handleMindMapUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") { toast({ title: "Selecione um PDF.", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const sanitized = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${destinationId}/mapas_mentais/${Date.now()}_${sanitized}`;
      const { error } = await supabase.storage.from("playbook-files").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("playbook-files").getPublicUrl(path);
      setPdfFiles((prev) => [...prev, { id: crypto.randomUUID(), name: file.name.replace(/\.pdf$/i, ""), pdf_url: data.publicUrl, category: "Geral" }]);
      toast({ title: "Mapa mental enviado!" });
    } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
    finally { setUploading(false); }
  };

  const updatePdfFile = (id: string, updates: Partial<PlaybookPDFFile>) => setPdfFiles((prev) => prev.map((f) => f.id === id ? { ...f, ...updates } : f));
  const removePdfFile = (id: string) => setPdfFiles((prev) => prev.filter((f) => f.id !== id));

  // Block CRUD
  const addBlock = (type: PlaybookBlockType) => {
    const newBlock: PlaybookBlock = { id: crypto.randomUUID(), type, content: "", title: "", items: [] };
    if (type === 'table') { newBlock.table_headers = ["Coluna 1", "Coluna 2"]; newBlock.table_rows = [["", ""]]; }
    if (type === 'accordion') { newBlock.accordion_items = [{ id: crypto.randomUUID(), title: "", content: "" }]; }
    setBlocks([...blocks, newBlock]);
  };
  const updateBlock = (index: number, updates: Partial<PlaybookBlock>) => setBlocks(blocks.map((b, i) => i === index ? { ...b, ...updates } : b));
  const removeBlock = (index: number) => setBlocks(blocks.filter((_, i) => i !== index));
  const moveBlock = (from: number, to: number) => {
    const arr = [...blocks];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    setBlocks(arr);
  };

  // Section block CRUD (Como Vender)
  const addSecBlock = (secId: string, type: PlaybookBlockType) => {
    const newBlock: PlaybookBlock = { id: crypto.randomUUID(), type, content: "", title: "", items: [] };
    if (type === 'table') { newBlock.table_headers = ["Coluna 1", "Coluna 2"]; newBlock.table_rows = [["", ""]]; }
    if (type === 'accordion') { newBlock.accordion_items = [{ id: crypto.randomUUID(), title: "", content: "" }]; }
    setSectionBlocks((prev) => ({ ...prev, [secId]: [...(prev[secId] || []), newBlock] }));
  };
  const updateSecBlock = (secId: string, idx: number, updates: Partial<PlaybookBlock>) => {
    setSectionBlocks((prev) => ({ ...prev, [secId]: (prev[secId] || []).map((b, i) => i === idx ? { ...b, ...updates } : b) }));
  };
  const removeSecBlock = (secId: string, idx: number) => {
    setSectionBlocks((prev) => ({ ...prev, [secId]: (prev[secId] || []).filter((_, i) => i !== idx) }));
  };
  const moveSecBlock = (secId: string, from: number, to: number) => {
    setSectionBlocks((prev) => {
      const arr = [...(prev[secId] || [])];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return { ...prev, [secId]: arr };
    });
  };

  const handleSave = () => {
    const tabIndex = PLAYBOOK_TABS.findIndex((t) => t.key === activeTab);
    let content: any = { intro, blocks };
    if (activeTab === 'visao_geral' && pdfUrl) content.pdf_url = pdfUrl;
    if (activeTab === 'mapas_mentais') content.pdf_files = pdfFiles;
    if (activeTab === 'como_vender') {
      const allBlocks: any[] = [];
      const sections: Record<string, { intro?: string }> = {};
      COMO_VENDER_SECTIONS.forEach((s) => {
        if (sectionIntros[s.id]) sections[s.id] = { intro: sectionIntros[s.id] };
        (sectionBlocks[s.id] || []).forEach((b) => allBlocks.push({ ...b, section: s.id }));
      });
      content = { intro, blocks: allBlocks, sections };
    }
    upsertSection.mutate({ destination_id: destinationId, tab_key: activeTab, title: PLAYBOOK_TABS[tabIndex].label, content, order_index: tabIndex });
  };

  const isVisaoGeral = activeTab === 'visao_geral';
  const isMapasMentais = activeTab === 'mapas_mentais';
  const isComoVender = activeTab === 'como_vender';

  return (
    <div className="border-t px-4 py-4 space-y-4">
      {/* Tab selector */}
      <div className="flex gap-2 flex-wrap">
        {PLAYBOOK_TABS.map((tab) => (
          <Button key={tab.key} size="sm" variant={activeTab === tab.key ? "default" : "outline"} onClick={() => loadTab(tab.key)} className="text-xs">
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {/* PDF Upload for Visão Geral */}
        {isVisaoGeral && (
          <Card className="border-dashed border-primary/30 bg-primary/5">
            <CardContent className="pt-4 pb-4 space-y-3">
              <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /><Label className="font-semibold">PDF da Visão Geral</Label></div>
              {pdfUrl && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline truncate flex-1">{pdfUrl.split('/').pop()}</a>
                  <Button size="sm" variant="destructive" onClick={() => setPdfUrl("")} className="shrink-0"><Trash2 className="h-3 w-3 mr-1" /> Remover</Button>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Button size="sm" variant="outline" disabled={uploading} asChild>
                  <label className="cursor-pointer">{uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}{uploading ? "Enviando..." : "Enviar PDF"}<input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} /></label>
                </Button>
                <span className="text-xs text-muted-foreground">ou cole a URL:</span>
              </div>
              <Input value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} placeholder="https://..." />
            </CardContent>
          </Card>
        )}

        {/* Mind Maps PDFs */}
        {isMapasMentais && (
          <Card className="border-dashed border-primary/30 bg-primary/5">
            <CardContent className="pt-4 pb-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /><Label className="font-semibold">PDFs de Mapas Mentais</Label><Badge variant="secondary" className="text-xs">{pdfFiles.length}</Badge></div>
                <Button size="sm" variant="outline" disabled={uploading} asChild>
                  <label className="cursor-pointer">{uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}{uploading ? "Enviando..." : "Adicionar PDF"}<input type="file" accept=".pdf" className="hidden" onChange={handleMindMapUpload} /></label>
                </Button>
              </div>
              {pdfFiles.map((file) => (
                <Card key={file.id} className="border bg-background">
                  <CardContent className="pt-3 pb-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Input value={file.name} onChange={(e) => updatePdfFile(file.id, { name: e.target.value })} placeholder="Nome" />
                        <Input value={file.description || ""} onChange={(e) => updatePdfFile(file.id, { description: e.target.value })} placeholder="Descrição" />
                        <Input value={file.category || ""} onChange={(e) => updatePdfFile(file.id, { category: e.target.value })} placeholder="Categoria" />
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0" onClick={() => removePdfFile(file.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {pdfFiles.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">Nenhum mapa mental adicionado.</p>}
            </CardContent>
          </Card>
        )}

        {/* Como Vender: Section-based editor with full blocks */}
        {isComoVender ? (
          <div className="space-y-3">
            <div><Label>Introdução Geral (opcional)</Label><Textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={2} placeholder="Texto introdutório..." /></div>
            <Label className="text-sm font-semibold">Seções do Playbook</Label>
            <Accordion type="multiple" className="space-y-2">
              {COMO_VENDER_SECTIONS.map((sec) => {
                const secBlks = sectionBlocks[sec.id] || [];
                const secIntro = sectionIntros[sec.id] || "";
                const hasContent = secIntro || secBlks.length > 0;
                return (
                  <AccordionItem key={sec.id} value={sec.id} className="border rounded-lg px-3">
                    <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
                      <div className="flex items-center gap-2">{sec.label}{hasContent && <Badge variant="secondary" className="text-[10px]">{secBlks.length} blocos</Badge>}</div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 pb-4">
                      <div><Label className="text-xs">Introdução da Seção</Label><Textarea value={secIntro} onChange={(e) => setSectionIntros((p) => ({ ...p, [sec.id]: e.target.value }))} rows={2} placeholder={`Texto introdutório para "${sec.label}"...`} /></div>
                      {secBlks.map((block, i) => (
                        <PlaybookBlockEditorItem
                          key={block.id}
                          block={block}
                          index={i}
                          totalBlocks={secBlks.length}
                          destinationId={destinationId}
                          tabKey={activeTab}
                          onUpdate={(updates) => updateSecBlock(sec.id, i, updates)}
                          onRemove={() => removeSecBlock(sec.id, i)}
                          onMoveUp={() => moveSecBlock(sec.id, i, i - 1)}
                          onMoveDown={() => moveSecBlock(sec.id, i, i + 1)}
                        />
                      ))}
                      <AddBlockMenu onAdd={(type) => addSecBlock(sec.id, type)} />
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        ) : (
          /* Generic tab: blocks editor */
          <>
            <div><Label>Introdução da Seção</Label><Textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={3} placeholder="Texto introdutório..." /></div>
            {blocks.map((block, i) => (
              <PlaybookBlockEditorItem
                key={block.id}
                block={block}
                index={i}
                totalBlocks={blocks.length}
                destinationId={destinationId}
                tabKey={activeTab}
                onUpdate={(updates) => updateBlock(i, updates)}
                onRemove={() => removeBlock(i)}
                onMoveUp={() => moveBlock(i, i - 1)}
                onMoveDown={() => moveBlock(i, i + 1)}
              />
            ))}
            <AddBlockMenu onAdd={addBlock} />
          </>
        )}

        <Button onClick={handleSave}><Save className="h-4 w-4 mr-2" /> Salvar Seção</Button>
      </div>
    </div>
  );
}
