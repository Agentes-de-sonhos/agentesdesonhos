import { createPortal } from "react-dom";
import { useToast } from "@/hooks/use-toast";
import { useToastContainer } from "@/components/ui/toast-host";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();
  const container = useToastContainer();

  const content = (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport className="z-[2147483647]" />
    </ToastProvider>
  );

  // Um único host: o container é movido para a superfície maximizada/fullscreen.
  if (container) return createPortal(content, container);

  return content;
}
