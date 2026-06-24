import { cn } from "@/lib/utils";

export function getClientInitials(name: string): string {
  if (!name) return "?";
  const firstName = name.trim().split(/\s+/)[0];
  return firstName.slice(0, 2).toUpperCase();
}

interface ClientAvatarProps {
  name: string;
  className?: string;
}

export function ClientAvatar({ name, className }: ClientAvatarProps) {
  const initials = getClientInitials(name);
  return (
    <div
      className={cn(
        "shrink-0 rounded-full flex items-center justify-center text-[13px] font-semibold tracking-wide",
        "bg-primary/10 text-primary",
        className,
      )}
      aria-hidden
    >
      {initials}
    </div>
  );
}
