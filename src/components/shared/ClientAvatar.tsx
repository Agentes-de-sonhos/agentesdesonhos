import { cn } from "@/lib/utils";

export function getClientInitials(name: string): string {
  if (!name) return "?";
  const firstName = name.trim().split(/\s+/)[0];
  return firstName.slice(0, 2).toUpperCase();
}

/**
 * First-letter of the first name + first-letter of the last name.
 * "Fernando Nobre" → "FN". Single-word names fall back to two letters.
 */
export function getPersonInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface ClientAvatarProps {
  name: string;
  className?: string;
  variant?: "first" | "person";
}

export function ClientAvatar({ name, className, variant = "first" }: ClientAvatarProps) {
  const initials =
    variant === "person" ? getPersonInitials(name) : getClientInitials(name);
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
