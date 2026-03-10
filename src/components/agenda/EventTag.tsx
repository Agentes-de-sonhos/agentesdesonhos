import { CalendarEvent } from "@/types/agenda";
import { cn } from "@/lib/utils";

interface EventTagProps {
  event: CalendarEvent;
  onClick?: (e?: React.MouseEvent) => void;
  compact?: boolean;
  isHighlighted?: boolean;
}

export function EventTag({ event, onClick, compact = false, isHighlighted = false }: EventTagProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(e);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full text-left text-white rounded px-1.5 py-0.5 truncate transition-all hover:opacity-80 hover:scale-[1.02]",
        compact ? "text-[10px]" : "text-xs",
        event.isPreset && "opacity-90"
      )}
      style={{ backgroundColor: event.color }}
      title={event.title}
    >
      {event.event_time && !compact && (
        <span className="opacity-80 mr-1">{event.event_time.slice(0, 5)}</span>
      )}
      {event.title}
      {isHighlighted && " ⭐"}
    </button>
  );
}
