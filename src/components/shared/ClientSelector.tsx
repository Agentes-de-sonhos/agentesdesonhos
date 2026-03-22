import { useState, useRef, useEffect } from "react";
import { Search, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useClients } from "@/hooks/useCRM";
import type { Client } from "@/types/crm";

interface SelectedClient {
  id: string;
  name: string;
}

interface ClientSelectorProps {
  value: SelectedClient | null;
  onChange: (client: SelectedClient | null) => void;
  required?: boolean;
  error?: string;
}

export function ClientSelector({ value, onChange, required, error }: ClientSelectorProps) {
  const { clients, createClient, isCreating } = useClients();
  const [query, setQuery] = useState(value?.name || "");
  const [isOpen, setIsOpen] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = query.length >= 1
    ? clients.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  const showDropdown = isOpen && query.length >= 1;

  useEffect(() => {
    if (value) setQuery(value.name);
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectClient = (client: Client) => {
    onChange({ id: client.id, name: client.name });
    setQuery(client.name);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
  };

  const handleOpenQuickCreate = () => {
    setNewName(query);
    setNewPhone("");
    setNewEmail("");
    setShowQuickCreate(true);
    setIsOpen(false);
  };

  const handleQuickCreate = async () => {
    const result = await createClient({
      name: newName,
      phone: newPhone || null,
      email: newEmail || null,
      status: "lead",
    });
    if (result) {
      onChange({ id: result.id, name: result.name });
      setQuery(result.name);
    }
    setShowQuickCreate(false);
  };

  return (
    <>
      <div ref={wrapperRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (value) onChange(null);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className={`pl-9 ${error ? "border-destructive" : ""}`}
          />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>

        {showDropdown && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-64 overflow-y-auto">
            {filtered.map((client) => (
              <button
                key={client.id}
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent text-left transition-colors"
                onClick={() => selectClient(client)}
              >
                <div className="flex-1">
                  <p className="font-medium">{client.name}</p>
                  {(client.email || client.phone) && (
                    <p className="text-xs text-muted-foreground">
                      {[client.phone, client.email].filter(Boolean).join(" • ")}
                    </p>
                  )}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado</p>
            )}
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-primary hover:bg-accent border-t transition-colors"
              onClick={handleOpenQuickCreate}
            >
              <UserPlus className="h-4 w-4" />
              Criar novo cliente
            </button>
          </div>
        )}

        {error && <p className="text-sm text-destructive mt-1">{error}</p>}
      </div>

      <Dialog open={showQuickCreate} onOpenChange={setShowQuickCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cadastro Rápido de Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div className="space-y-2">
              <Label>Telefone / WhatsApp</Label>
              <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-2">
              <Label>E-mail (opcional)</Label>
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@exemplo.com" type="email" />
            </div>
            <Button
              className="w-full"
              onClick={handleQuickCreate}
              disabled={isCreating || newName.length < 2}
            >
              {isCreating ? "Criando..." : "Criar e Selecionar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
