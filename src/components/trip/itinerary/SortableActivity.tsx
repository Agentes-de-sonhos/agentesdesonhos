import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ItineraryActivityCard } from "./ItineraryActivityCard";
import type { ItineraryActivity } from "@/hooks/useItineraryActivities";
import type { TripService } from "@/types/trip";

interface Props {
  activity: ItineraryActivity;
  linkedService?: TripService;
  onEdit: () => void;
  onDelete: () => void;
  readOnly?: boolean;
  originBadge?: { label: string; className: string };
}

export function SortableActivity({ activity, ...rest }: Props) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: activity.id, data: { period: activity.period, dateStr: activity.day_date } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ItineraryActivityCard
        activity={activity}
        {...rest}
        dragHandleProps={{ attributes, listeners, setActivatorNodeRef }}
      />
    </div>
  );
}