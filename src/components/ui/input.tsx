import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onFocus, inputMode, ...props }, ref) => {
    const isNumeric =
      type === "number" ||
      inputMode === "numeric" ||
      inputMode === "decimal";

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (isNumeric) {
        // Seleciona o conteúdo ao focar para que a primeira digitação
        // substitua valores padrão como "0" em vez de concatenar ("099").
        // setTimeout garante seleção em todos os navegadores (Safari/iOS).
        const target = e.currentTarget;
        setTimeout(() => {
          try {
            target.select();
          } catch {
            /* alguns tipos de input não suportam select() */
          }
        }, 0);
      }
      onFocus?.(e);
    };

    return (
      <input
        type={type}
        inputMode={inputMode}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        onFocus={handleFocus}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
