import { useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { TemplatePickerButton } from "@/components/notes/TemplatePickerButton";
import { cn } from "@/lib/utils";

interface TextareaWithTemplateProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onValueChange?: (value: string) => void;
}

export function TextareaWithTemplate({
  className,
  value,
  onValueChange,
  onChange,
  ...props
}: TextareaWithTemplateProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleInsert = (content: string) => {
    const currentValue = (value as string) || "";
    const newValue = currentValue ? `${currentValue}\n${content}` : content;
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={value}
        onChange={onChange}
        className={cn("pr-9", className)}
        {...props}
      />
      <div className="absolute top-1.5 right-1.5">
        <TemplatePickerButton onInsert={handleInsert} />
      </div>
    </div>
  );
}
