import { Textarea } from "@/components/ui/textarea";

interface TextEditFormProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function TextEditForm({ label, value, onChange }: TextEditFormProps) {
  return (
    <div className="p-4">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 rounded-xl min-h-[120px]"
      />
    </div>
  );
}
