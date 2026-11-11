import { expect, it, vi } from "vitest";
import { createAssetCopyTracker, duplicateVoucherFile } from "@/lib/walletDuplicateAssets";
// Characterization of known issue 19, not a safety assertion or a production operation.
it("documenta URL legada compartilhada e caminho extraído pela remoção", async () => {
  const from = vi.fn();
  const original = "https://example.test/storage/v1/object/public/vouchers/owner/source/ticket.pdf";
  const tracker = createAssetCopyTracker();
  const copied = await duplicateVoucherFile({ storage: { from } }, original, "owner", "copy", tracker);
  expect(copied).toBe(original);
  expect(copied.split("/vouchers/")[1]).toBe("owner/source/ticket.pdf");
  expect(from).not.toHaveBeenCalled();
  expect(tracker.copiedPaths).toEqual([]);
});
