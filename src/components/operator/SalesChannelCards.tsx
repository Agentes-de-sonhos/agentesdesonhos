import { RichContentDisplay } from "./RichContentDisplay";

interface SalesChannelCardsProps {
  salesChannels: string;
}

/**
 * Renders sales channels using the same rich-text pipeline as "Como Vender":
 * accepts both legacy plain-text content and the new HTML rich-text content,
 * turning URLs / emails / phones into tappable elements.
 */
export function SalesChannelCards({ salesChannels }: SalesChannelCardsProps) {
  return <RichContentDisplay content={salesChannels} />;
}
