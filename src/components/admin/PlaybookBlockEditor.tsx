import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  X, GripVertical, Upload, Loader2, Plus, Trash2,
  ChevronUp, ChevronDown, Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PlaybookBlock, PlaybookBlockType, AccordionBlockItem } from "@/types/playbook";
import { BLOCK_TYPE_OPTIONS } from "@/types/playbook";
import { PlaybookRichTextEditor } from "./PlaybookRichTextEditor";

interface PlaybookBlockEditorProps {
  block: PlaybookBlock;
  index: number;
  totalBlocks: number;
  destinationId: string;
  tabKey: string;
  onUpdate: (updates: Partial<PlaybookBlock>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function PlaybookBlockEditorItem({
  block, index, totalBlocks, destinationId, tabKey,
  onUpdate, onRemove, onMoveUp, onMoveDown,
}: PlaybookBlockEditorProps) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const label = BLOCK_TYPE_OPTIONS.find((o) => o.type === block.type)?.label || block.type;

  const uploadFile = async (file: File, subfolder: string): Promise<string | null> => {
    setUploading(true);
    try {
      const sanitized = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${destinationId}/${tabKey}/${subfolder}/${Date.now()}_${sanitized}`;
      const { error } = await supabase.storage.from("playbook-files").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("playbook-files").getPublicUrl(path);
      return data.publicUrl;
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, "images");
    if (url) onUpdate({ image_url: url });
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const urls: string[] = [...(block.image_urls || [])];
    for (const file of Array.from(files)) {
      const url = await uploadFile(file, "gallery");
      if (url) urls.push(url);
    }
    onUpdate({ image_urls: urls });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, "downloads");
    if (url) onUpdate({ file_url: url, file_name: file.name });
  };

  // Table helpers
  const addTableRow = () => {
    const cols = (block.table_headers || []).length || 2;
    const rows = [...(block.table_rows || []), Array(cols).fill("")];
    onUpdate({ table_rows: rows });
  };

  const addTableCol = () => {
    const headers = [...(block.table_headers || []), `Col ${(block.table_headers?.length || 0) + 1}`];
    const rows = (block.table_rows || []).map((r) => [...r, ""]);
    onUpdate({ table_headers: headers, table_rows: rows });
  };

  // Accordion helpers
  const addAccordionItem = () => {
    const items: AccordionBlockItem[] = [...(block.accordion_items || []), { id: crypto.randomUUID(), title: "", content: "" }];
    onUpdate({ accordion_items: items });
  };

  const updateAccordionItem = (id: string, updates: Partial<AccordionBlockItem>) => {
    onUpdate({
      accordion_items: (block.accordion_items || []).map((it) => it.id === id ? { ...it, ...updates } : it),
    });
  };

  const removeAccordionItem = (id: string) => {
    onUpdate({ accordion_items: (block.accordion_items || []).filter((it) => it.id !== id) });
  };

  return (
    <Card className="border-dashed border-primary/20">
      <CardContent className="pt-3 pb-3 space-y-3">
        {/* Block header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <Badge variant="outline" className="text-xs">{label}</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={onMoveUp} disabled={index === 0}>
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={onMoveDown} disabled={index === totalBlocks - 1}>
              <ChevronDown className="h-3 w-3" />
            </Button>
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onRemove}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* ── Rich Text Editor ── */}
        {block.type === 'rich_text' && (
          <>
            <Input value={block.title || ""} onChange={(e) => onUpdate({ title: e.target.value })} placeholder="Título (opcional)" />
            <PlaybookRichTextEditor content={block.content} onChange={(html) => onUpdate({ content: html })} />
          </>
        )}

        {/* ── Text / Tip / Alert / Strategy / Checklist / Highlight ── */}
        {['text', 'tip', 'alert', 'strategy', 'checklist', 'highlight'].includes(block.type) && (
          <>
            <Input value={block.title || ""} onChange={(e) => onUpdate({ title: e.target.value })} placeholder="Título do bloco" />
            <Textarea value={block.content} onChange={(e) => onUpdate({ content: e.target.value })} rows={3} placeholder="Conteúdo..." />
            <div>
              <Label className="text-xs">Itens (um por linha)</Label>
              <Textarea
                value={(block.items || []).join("\n")}
                onChange={(e) => onUpdate({ items: e.target.value.split("\n").filter(Boolean) })}
                rows={2}
                placeholder={"Item 1\nItem 2"}
              />
            </div>
          </>
        )}

        {/* ── Image ── */}
        {block.type === 'image' && (
          <>
            <Input value={block.title || ""} onChange={(e) => onUpdate({ title: e.target.value })} placeholder="Legenda (opcional)" />
            {block.image_url && (
              <div className="relative inline-block">
                <img src={block.image_url} alt="" className="max-h-40 rounded-lg" />
                <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6" onClick={() => onUpdate({ image_url: undefined })}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                {uploading ? "Enviando..." : "Upload Imagem"}
              </Button>
              <span className="text-xs text-muted-foreground">ou</span>
              <Input
                value={block.image_url || ""}
                onChange={(e) => onUpdate({ image_url: e.target.value })}
                placeholder="URL da imagem"
                className="flex-1"
              />
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <Select value={block.alignment || "left"} onValueChange={(v) => onUpdate({ alignment: v as any })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Esquerda</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="right">Direita</SelectItem>
              </SelectContent>
            </Select>
            <Input value={block.content || ""} onChange={(e) => onUpdate({ content: e.target.value })} placeholder="Descrição (opcional)" />
          </>
        )}

        {/* ── Image Gallery ── */}
        {block.type === 'image_gallery' && (
          <>
            <Input value={block.title || ""} onChange={(e) => onUpdate({ title: e.target.value })} placeholder="Título da galeria" />
            <Input value={block.content || ""} onChange={(e) => onUpdate({ content: e.target.value })} placeholder="Descrição (opcional)" />
            <div className="grid grid-cols-3 gap-2">
              {(block.image_urls || []).map((url, i) => (
                <div key={i} className="relative aspect-[4/3] rounded-lg overflow-hidden border">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <Button
                    size="icon" variant="destructive" className="absolute top-1 right-1 h-5 w-5"
                    onClick={() => onUpdate({ image_urls: (block.image_urls || []).filter((_, j) => j !== i) })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" disabled={uploading} asChild>
              <label className="cursor-pointer">
                {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-1" />}
                Adicionar Imagens
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
              </label>
            </Button>
          </>
        )}

        {/* ── Video ── */}
        {block.type === 'video' && (
          <>
            <Input value={block.title || ""} onChange={(e) => onUpdate({ title: e.target.value })} placeholder="Título do vídeo" />
            <Input value={block.video_url || ""} onChange={(e) => onUpdate({ video_url: e.target.value })} placeholder="URL do vídeo (YouTube ou Vimeo)" />
            <Input value={block.content || ""} onChange={(e) => onUpdate({ content: e.target.value })} placeholder="Descrição (opcional)" />
          </>
        )}

        {/* ── File Download ── */}
        {block.type === 'file_download' && (
          <>
            <Input value={block.title || ""} onChange={(e) => onUpdate({ title: e.target.value })} placeholder="Nome do arquivo" />
            <Input value={block.content || ""} onChange={(e) => onUpdate({ content: e.target.value })} placeholder="Descrição (opcional)" />
            {block.file_url && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <span className="truncate">{block.file_name || block.file_url}</span>
                <Button size="sm" variant="ghost" className="h-6 text-destructive" onClick={() => onUpdate({ file_url: undefined, file_name: undefined })}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            <Button size="sm" variant="outline" disabled={uploading} asChild>
              <label className="cursor-pointer">
                {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                {uploading ? "Enviando..." : "Upload Arquivo"}
                <input ref={fileRef} type="file" accept=".pdf,.docx,.xlsx,.pptx,.zip" className="hidden" onChange={handleFileUpload} />
              </label>
            </Button>
          </>
        )}

        {/* ── Separator ── */}
        {block.type === 'separator' && (
          <div className="py-2">
            <hr className="border-t border-border" />
            <p className="text-xs text-muted-foreground text-center mt-1">Linha separadora (sem configurações adicionais)</p>
          </div>
        )}

        {/* ── Custom Button ── */}
        {block.type === 'custom_button' && (
          <>
            <Input value={block.button_text || ""} onChange={(e) => onUpdate({ button_text: e.target.value })} placeholder="Texto do botão (ex: Baixar Material)" />
            <Input value={block.button_url || ""} onChange={(e) => onUpdate({ button_url: e.target.value })} placeholder="URL de destino (https://...)" />
            <Select value={block.alignment || "left"} onValueChange={(v) => onUpdate({ alignment: v as any })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Esquerda</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="right">Direita</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}

        {/* ── Table ── */}
        {block.type === 'table' && (
          <>
            <Input value={block.title || ""} onChange={(e) => onUpdate({ title: e.target.value })} placeholder="Título da tabela" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead>
                  <tr>
                    {(block.table_headers || []).map((h, i) => (
                      <th key={i} className="border p-1">
                        <Input
                          value={h}
                          onChange={(e) => {
                            const headers = [...(block.table_headers || [])];
                            headers[i] = e.target.value;
                            onUpdate({ table_headers: headers });
                          }}
                          className="h-7 text-xs"
                          placeholder={`Coluna ${i + 1}`}
                        />
                      </th>
                    ))}
                    <th className="border p-1 w-10">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={addTableCol}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(block.table_rows || []).map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} className="border p-1">
                          <Input
                            value={cell}
                            onChange={(e) => {
                              const rows = (block.table_rows || []).map((r) => [...r]);
                              rows[ri][ci] = e.target.value;
                              onUpdate({ table_rows: rows });
                            }}
                            className="h-7 text-xs"
                          />
                        </td>
                      ))}
                      <td className="border p-1 w-10">
                        <Button
                          size="icon" variant="ghost" className="h-6 w-6 text-destructive"
                          onClick={() => onUpdate({ table_rows: (block.table_rows || []).filter((_, i) => i !== ri) })}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={addTableRow}><Plus className="h-3 w-3 mr-1" /> Linha</Button>
              <Button size="sm" variant="outline" onClick={addTableCol}><Plus className="h-3 w-3 mr-1" /> Coluna</Button>
            </div>
            {(!block.table_headers || block.table_headers.length === 0) && (
              <Button size="sm" variant="outline" onClick={() => onUpdate({ table_headers: ["Coluna 1", "Coluna 2"], table_rows: [["", ""]] })}>
                Iniciar Tabela (2 colunas)
              </Button>
            )}
          </>
        )}

        {/* ── Accordion ── */}
        {block.type === 'accordion' && (
          <>
            <Input value={block.title || ""} onChange={(e) => onUpdate({ title: e.target.value })} placeholder="Título da seção expansível" />
            <div className="space-y-2">
              {(block.accordion_items || []).map((item, i) => (
                <Card key={item.id} className="border bg-muted/20">
                  <CardContent className="pt-2 pb-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground w-4">{i + 1}</span>
                      <Input
                        value={item.title}
                        onChange={(e) => updateAccordionItem(item.id, { title: e.target.value })}
                        placeholder="Título do item"
                        className="flex-1 h-8 text-sm"
                      />
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeAccordionItem(item.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <Textarea
                      value={item.content}
                      onChange={(e) => updateAccordionItem(item.id, { content: e.target.value })}
                      placeholder="Conteúdo expandido..."
                      rows={2}
                      className="text-sm"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={addAccordionItem}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar Item
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Add Block Button ── */
interface AddBlockMenuProps {
  onAdd: (type: PlaybookBlockType) => void;
}

export function AddBlockMenu({ onAdd }: AddBlockMenuProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button variant="outline" className="w-full border-dashed gap-2" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Adicionar Bloco
      </Button>
    );
  }

  return (
    <Card className="border-dashed border-primary/30 bg-primary/5">
      <CardContent className="py-3">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-semibold">Selecione o tipo de bloco:</Label>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setOpen(false)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          {BLOCK_TYPE_OPTIONS.map((opt) => (
            <Button
              key={opt.type}
              size="sm"
              variant="outline"
              className="text-xs h-auto py-2 flex-col gap-1"
              onClick={() => {
                const newBlock: PlaybookBlock = {
                  id: crypto.randomUUID(),
                  type: opt.type,
                  content: "",
                  title: "",
                  items: [],
                };
                if (opt.type === 'table') {
                  newBlock.table_headers = ["Coluna 1", "Coluna 2"];
                  newBlock.table_rows = [["", ""]];
                }
                if (opt.type === 'accordion') {
                  newBlock.accordion_items = [{ id: crypto.randomUUID(), title: "", content: "" }];
                }
                onAdd(opt.type);
                setOpen(false);
              }}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
