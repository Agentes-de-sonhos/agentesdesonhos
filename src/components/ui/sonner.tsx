import { createPortal } from "react-dom";
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { useToastContainer } from "@/components/ui/toast-host";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const container = useToastContainer();

  const content = (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      style={{ zIndex: 2147483647, ...(props.style ?? {}) }}
      {...props}
    />
  );

  // Um único host: o container é movido para a superfície maximizada/fullscreen.
  if (container) return createPortal(content, container);

  return content;
};

export { Toaster, toast };
