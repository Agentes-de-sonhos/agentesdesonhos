import React from "react";
import { cn } from "@/lib/utils";

/**
 * BrandText — wraps brand names, agency names, and commercial identities
 * with attributes that prevent automatic browser/extension translation.
 *
 * Usage:
 *   <BrandText>Innovati Travel</BrandText>
 *   <BrandText as="h1" className="text-xl font-bold">Innovati Travel</BrandText>
 */

interface BrandTextProps extends React.HTMLAttributes<HTMLElement> {
  as?: keyof React.JSX.IntrinsicElements;
  children: React.ReactNode;
}

export function BrandText({ as: Tag = "span", className, children, ...rest }: BrandTextProps) {
  return (
    // @ts-ignore — dynamic tag
    <Tag
      translate="no"
      className={cn("notranslate", className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
