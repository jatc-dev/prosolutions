import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PHRASE_FAMILIES, appendPhrase, familyForTitle } from "../src/modules/procv/phrases";
import { PhraseSuggestions } from "../src/modules/procv/components/editor/components/PhraseSuggestions";

describe("phrase library", () => {
  it("covers every sector with enough, well-formed phrases", () => {
    expect(PHRASE_FAMILIES.length).toBeGreaterThanOrEqual(14);
    const ids = new Set<string>();
    for (const family of PHRASE_FAMILIES) {
      expect(ids.has(family.id), family.id).toBe(false);
      ids.add(family.id);
      expect(family.duties.length, family.id).toBeGreaterThanOrEqual(4);
      expect(family.achievements.length, family.id).toBeGreaterThanOrEqual(4);
      expect(family.summaries.length, family.id).toBeGreaterThanOrEqual(1);
      // Every achievement asks for a real figure or detail.
      for (const achievement of family.achievements) expect(achievement, achievement).toMatch(/\[[^\]]+\]/);
      for (const phrase of [...family.duties, ...family.achievements, ...family.summaries]) expect(phrase.trim().endsWith("."), phrase).toBe(true);
    }
  });

  it("picks the family from the job title, accents and case aside", () => {
    expect(familyForTitle("Auxiliar Contable").id).toBe("contabilidad");
    expect(familyForTitle("Asesora de Servicio al Cliente").id).toBe("servicio");
    expect(familyForTitle("Auxiliar de enfermería").id).toBe("salud");
    expect(familyForTitle("Ingeniero de Sistemas").id).toBe("tecnologia");
    expect(familyForTitle("Ingeniero civil residente").id).toBe("construccion");
    expect(familyForTitle("Operario de montacargas").id).toBe("logistica");
    expect(familyForTitle("Mesero").id).toBe("hoteleria");
    expect(familyForTitle("Astronauta").id).toBe("general");
    expect(familyForTitle("").id).toBe("general");
  });

  it("appends phrases on a new line without duplicating them", () => {
    expect(appendPhrase("", "Uno.")).toBe("Uno.");
    expect(appendPhrase("Uno.", "Dos.")).toBe("Uno.\nDos.");
    expect(appendPhrase("Uno.\nDos.", "dos.")).toBe("Uno.\nDos.");
  });
});

describe("PhraseSuggestions", () => {
  it("opens on demand, adds a phrase and lets the user switch sector", () => {
    const onPick = vi.fn();
    render(<PhraseSuggestions title="Auxiliar contable" kind="duties" onPick={onPick} isUsed={(phrase) => phrase.startsWith("Elaboración de conciliaciones")} />);
    expect(screen.queryByRole("combobox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Frases sugeridas para funciones/ }));

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("contabilidad");
    fireEvent.click(screen.getByRole("button", { name: /Causación de facturas/ }));
    expect(onPick).toHaveBeenCalledWith("Causación de facturas, cuentas por pagar y cuentas por cobrar.");
    expect((screen.getByRole("button", { name: /Elaboración de conciliaciones/ }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(select, { target: { value: "ventas" } });
    expect(screen.getByRole("button", { name: /Prospección y captación/ })).toBeTruthy();
  });
});
