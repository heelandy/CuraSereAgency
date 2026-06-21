import { describe, it, expect } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("neutralizes formula-injection cells", () => {
    const csv = toCsv([{ name: "=HYPERLINK(1)", note: "+cmd", ok: "@x" }]);
    expect(csv).toContain("'=HYPERLINK(1)");
    expect(csv).toContain("'+cmd");
    expect(csv).toContain("'@x");
  });

  it("quotes cells with commas, quotes and newlines", () => {
    const csv = toCsv([{ a: "x,y", b: 'he said "hi"' }]);
    expect(csv).toContain('"x,y"');
    expect(csv).toContain('"he said ""hi"""');
  });

  it("emits a header row from keys", () => {
    const csv = toCsv([{ a: 1, b: 2 }]);
    expect(csv.split("\n")[0]).toBe("a,b");
  });
});
