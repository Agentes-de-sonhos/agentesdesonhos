import { forwardRef, useRef, useState, type ChangeEvent, type ClipboardEvent, type FocusEvent, type KeyboardEvent } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useCommunityConnectionProfiles } from "@/hooks/useCommunityConnectionProfiles";
import {
  applyMentionSelection,
  filterMentionCandidates,
  findActiveMentionQuery,
  type ActiveMentionQuery,
} from "@/lib/communityMentions";

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  "aria-label"?: string;
  onPaste?: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  onBlur?: (event: FocusEvent<HTMLTextAreaElement>) => void;
  onFocus?: () => void;
  onSubmitShortcut?: () => void;
}

/**
 * Campo de texto com marcações @ restritas às conexões aceitas do usuário.
 * A marcação é inserida como referência estável ao user_id.
 */
export const MentionTextarea = forwardRef<HTMLTextAreaElement, MentionTextareaProps>(
  function MentionTextarea(
    { value, onChange, placeholder, className, rows = 3, disabled, autoFocus, onPaste, onBlur, onFocus, onSubmitShortcut, ...rest },
    forwardedRef,
  ) {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);
    const [active, setActive] = useState<ActiveMentionQuery | null>(null);
    const { connectionProfiles } = useCommunityConnectionProfiles();

    const suggestions = active ? filterMentionCandidates(connectionProfiles, active.query) : [];
    const open = !!active && suggestions.length > 0;

    const syncActive = (text: string, caret: number) => {
      setActive(findActiveMentionQuery(text, caret));
    };

    const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
      const text = event.target.value;
      onChange(text);
      syncActive(text, event.target.selectionStart ?? text.length);
    };

    const select = (person: { user_id: string; name: string }) => {
      if (!active) return;
      const next = applyMentionSelection(value, active, person);
      onChange(next.text);
      setActive(null);
      requestAnimationFrame(() => {
        const el = innerRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(next.caret, next.caret);
      });
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (open && event.key === "Escape") {
        event.preventDefault();
        setActive(null);
        return;
      }
      if (open && event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        select(suggestions[0]);
        return;
      }
      if (!open && onSubmitShortcut && event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onSubmitShortcut();
      }
    };

    return (
      <div className="relative" data-mention-field>
        <Textarea
          {...rest}
          ref={(node) => {
            innerRef.current = node;
            if (typeof forwardedRef === "function") forwardedRef(node);
            else if (forwardedRef) (forwardedRef as { current: HTMLTextAreaElement | null }).current = node;
          }}
          value={value}
          rows={rows}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className={cn("resize-none", className)}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={onPaste}
          onFocus={onFocus}
          onBlur={(event) => {
            setTimeout(() => setActive(null), 120);
            onBlur?.(event);
          }}
          onClick={(event) => {
            const el = event.currentTarget;
            syncActive(el.value, el.selectionStart ?? el.value.length);
          }}
        />
        {open && (
          <ul
            role="listbox"
            aria-label="Conexões para marcar"
            data-mention-suggestions
            className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
          >
            {suggestions.map((person) => (
              <li key={person.user_id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => select({ user_id: person.user_id, name: person.name })}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={person.avatar_url || ""} />
                    <AvatarFallback className="text-[10px]">
                      {person.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate">{person.name}</span>
                  {person.agency_name && (
                    <span className="truncate text-[11px] text-muted-foreground">{person.agency_name}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  },
);
