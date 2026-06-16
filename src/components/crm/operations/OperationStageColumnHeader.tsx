import { useState, useRef, useEffect } from "react";
import { MoreVertical, Pencil, Copy, Trash2, Palette, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { STAGE_COLOR_PALETTE, getStageTokens, type StageColor } from "@/types/crm";
import type { OperationPipelineStage } from "@/hooks/useOperationStages";

interface Props {
  stage: OperationPipelineStage;
  count: number;
  onRename: (name: string) => void | Promise<void>;
  onChangeColor: (color: StageColor) => void | Promise<void>;
  onDuplicate: () => void | Promise<void>;
  onRequestDelete: () => void;
  canEdit?: boolean;
}

const COLOR_KEYS = Object.keys(STAGE_COLOR_PALETTE) as StageColor[];

export function OperationStageColumnHeader({
  stage,
  count,
  onRename,
  onChangeColor,
  onDuplicate,
  onRequestDelete,
  canEdit = true,
}: Props) {
  const tokens = getStageTokens(stage.color);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(stage.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    setName(stage.name);
  }, [stage.name]);

  const commitRename = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === stage.name) {
      setName(stage.name);
      setEditing(false);
      return;
    }
    await onRename(trimmed);
    setEditing(false);
  };

  return (
    <div className="group/header">
      <div className={cn("h-1.5 rounded-full mb-3", tokens.bar)} />
      <div className="flex items-center justify-between mb-3 gap-1">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-1 flex-1">
              <Input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitRename();
                  } else if (e.key === "Escape") {
                    setName(stage.name);
                    setEditing(false);
                  }
                }}
                onBlur={commitRename}
                className="h-7 text-sm font-semibold"
                maxLength={60}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onMouseDown={(e) => e.preventDefault()}
                onClick={commitRename}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setName(stage.name);
                  setEditing(false);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { if (canEdit) setEditing(true); }}
              className={cn(
                "font-semibold text-sm text-left truncate rounded px-1 py-0.5 hover:bg-muted/60 transition-colors",
                tokens.text
              )}
              title={canEdit ? "Clique para editar" : undefined}
            >
              {stage.name}
            </button>
          )}
          {!editing && (
            <Badge variant="secondary" className={cn("text-xs px-1.5 py-0 font-bold", tokens.text)}>
              {count}
            </Badge>
          )}
        </div>

        {!editing && canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-muted-foreground"
                aria-label="Opções da coluna"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs">Coluna</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Editar nome
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate()}>
                <Copy className="mr-2 h-4 w-4" /> Duplicar coluna
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs flex items-center gap-2">
                <Palette className="h-3.5 w-3.5" /> Cor
              </DropdownMenuLabel>
              <div className="px-2 py-1.5 grid grid-cols-7 gap-1.5">
                {COLOR_KEYS.map((c) => {
                  const t = STAGE_COLOR_PALETTE[c];
                  const isActive = stage.color === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onChangeColor(c)}
                      className={cn(
                        "h-5 w-5 rounded-full ring-offset-1 transition",
                        t.dot,
                        isActive && "ring-2 ring-foreground"
                      )}
                      aria-label={`Cor ${c}`}
                    />
                  );
                })}
              </div>
              {!stage.is_protected && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onRequestDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Excluir coluna
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}