import React from "react";
import { isHtmlDescription, sanitizedDescriptionHtml } from "@/lib/richDescription";

/**
 * Renders text preserving line breaks and supporting **bold** markdown.
 * Rich HTML (from the service editors) is sanitized and rendered as-is.
 */
export function FormattedText({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  if (isHtmlDescription(children)) {
    return (
      <span
        className={`block break-words [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_a]:text-primary [&_a]:underline [&_img]:my-2 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg ${className}`}
        dangerouslySetInnerHTML={{ __html: sanitizedDescriptionHtml(children) }}
      />
    );
  }
  const parts = children.split(/(\*\*[^*]+\*\*)/g);
  const rendered = parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });

  return (
    <span className={`whitespace-pre-wrap break-words ${className}`}>
      {rendered}
    </span>
  );
}
