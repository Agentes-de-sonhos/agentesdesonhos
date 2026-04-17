import { RichTextWithLinks } from "./RichTextWithLinks";

interface SalesChannelCardsProps {
  salesChannels: string;
}

/**
 * Renders sales channels using the same logic as "Como Vender":
 * - Plain text lines (including emails like name@domain.com) are rendered as text.
 * - Lines containing http(s):// or mailto: URLs are rendered as action buttons.
 */
export function SalesChannelCards({ salesChannels }: SalesChannelCardsProps) {
  return <RichTextWithLinks text={salesChannels} />;
}
