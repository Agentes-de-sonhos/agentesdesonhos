import { expect, test } from "vitest";
import { sanitizedDescriptionHtml, descriptionToPlainText } from "@/lib/richDescription";
test("decodes double-encoded", () => {
  const v = "<p>&lt;h3&gt;Vaticano&lt;/h3&gt;&lt;strong&gt;x&lt;/strong&gt;</p>";
  expect(sanitizedDescriptionHtml(v)).toContain("<h3>Vaticano</h3>");
  expect(descriptionToPlainText(v)).not.toContain("<");
});
