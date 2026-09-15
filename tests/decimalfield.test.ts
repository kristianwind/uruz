import { describe, it, expect } from "vitest";
import { asTyped, typedValue } from "@/lib/decimalfield";

/**
 * Rapporteret som: "man kan ikke skrive sin vægt med decimaler".
 *
 * Feltet var styret af et tal, så hvert tastetryk gik ud gennem `Number` og kom
 * tilbage. `85,` blev til 85, og feltet gentegnede sig som "85" — separatoren var
 * væk, før det næste ciffer kunne skrives. Reglen ligger her nu, fordi det var
 * reglen, der var forkert.
 */
describe("et tal, der stadig bliver skrevet", () => {
  it("lader en separator stå, så det næste ciffer kan nå frem", () => {
    // Tegn for tegn, som en tommelfinger gør det i et fitnesscenter.
    expect(asTyped("8")).toBe("8");
    expect(asTyped("85")).toBe("85");
    expect(asTyped("85,")).toBe("85.");
    expect(asTyped("85.8")).toBe("85.8");
  });

  it("tager både komma og punktum, for det er det samme tal", () => {
    expect(asTyped("85,8")).toBe("85.8");
    expect(asTyped("85.8")).toBe("85.8");
  });

  it("tillader kun én separator", () => {
    expect(asTyped("85.8.2")).toBe("85.82");
    expect(asTyped("85,8,2")).toBe("85.82");
  });

  it("dropper et forkert tegn frem for at tømme feltet", () => {
    // I et fitnesscenter er det forkerte tegn en tommelfinger.
    expect(asTyped("85k")).toBe("85");
    expect(asTyped("8 5")).toBe("85");
  });

  it("melder ingenting, mens der endnu ikke er et tal", () => {
    // Nul her ville nulstille sættet i samme øjeblik, feltet blev markeret for at
    // blive skrevet om.
    expect(typedValue("")).toBeNull();
    expect(typedValue(".")).toBeNull();
  });

  it("holder fast i det, der allerede er skrevet, foran separatoren", () => {
    expect(typedValue("85.")).toBe(85);
  });

  it("læser det færdige tal", () => {
    expect(typedValue("85.8")).toBe(85.8);
    expect(typedValue("12.5")).toBe(12.5);
    expect(typedValue("0.5")).toBe(0.5);
    expect(typedValue("85")).toBe(85);
  });

  it("kan skrive 85,8 tegn for tegn — hele vejen", () => {
    // Fejlen selv: det var det fjerde tastetryk, der aldrig kunne nås.
    const keys = ["8", "85", "85,", "85,8"];
    const seen = keys.map((k) => {
      const text = asTyped(k);
      return { text, value: typedValue(text) };
    });
    expect(seen.map((s) => s.text)).toEqual(["8", "85", "85.", "85.8"]);
    expect(seen.at(-1)!.value).toBe(85.8);
  });
});
