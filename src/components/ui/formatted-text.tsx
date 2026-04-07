import React from "react";

/**
 * Renders text preserving line breaks and supporting **bold** markdown.
 * Use in public-facing pages for user-authored content.
 */
export function FormattedText({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  // Split by **bold** markers
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
