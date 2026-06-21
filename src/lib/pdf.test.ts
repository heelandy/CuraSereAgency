import { describe, it, expect } from "vitest";
import { buildTextPdf, buildReportPdf } from "./pdf";

const decode = (b: Uint8Array) => new TextDecoder().decode(b);

describe("buildTextPdf", () => {
  it("produces a valid PDF envelope", () => {
    const pdf = decode(buildTextPdf(["Hello", "World"]));
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf).toContain("xref");
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
  });

  it("escapes PDF special characters and sanitizes non-ascii", () => {
    const pdf = decode(buildTextPdf(["(paren) \\back café"]));
    expect(pdf).toContain("\\(paren\\)");
    expect(pdf).toContain("caf?"); // é sanitized to ?
  });

  it("paginates long input into multiple page objects", () => {
    const many = Array.from({ length: 200 }, (_, i) => `Line ${i}`);
    const pdf = decode(buildTextPdf(many));
    expect(pdf).toMatch(/\/Count [2-9]/); // paginated across multiple pages
  });

  it("builds a titled report", () => {
    const pdf = decode(buildReportPdf({ title: "Test", meta: { A: "1" }, sections: [{ heading: "S", lines: ["x"] }] }));
    expect(pdf.startsWith("%PDF")).toBe(true);
  });
});
