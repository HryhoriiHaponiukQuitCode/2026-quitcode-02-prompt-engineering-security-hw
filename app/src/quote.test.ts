import { describe, expect, it } from "vitest";
import {
  MAX_INSTALLMENTS,
  QuoteInputError,
  estimateTotalCents,
  formatMoney,
  splitInstallments,
} from "./quote.js";

// Базові (happy path) тести. Навмисно неповні — розширення покриття
// це і є ваш перший промпт з cookbook (Task A).

describe("estimateTotalCents", () => {
  it("рахує суму без знижки", () => {
    expect(estimateTotalCents({ hours: 10, rateCents: 5000 })).toBe(50000);
  });

  it("застосовує знижку", () => {
    expect(estimateTotalCents({ hours: 10, rateCents: 5000, discountPercent: 10 })).toBe(45000);
  });
});

describe("splitInstallments", () => {
  it("ділить суму, що ділиться націло", () => {
    expect(splitInstallments(90000, 3)).toEqual([30000, 30000, 30000]);
  });
});

describe("formatMoney", () => {
  it("форматує центи", () => {
    expect(formatMoney(123450)).toBe("$1,234.50");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Розширення покриття — результат промпту prompts/add-tests.md (Task A).
// Інваріанти домену, а не happy path.
// ─────────────────────────────────────────────────────────────────────────

describe("estimateTotalCents — крайові випадки", () => {
  it("нульові години дають нуль", () => {
    expect(estimateTotalCents({ hours: 0, rateCents: 5000 })).toBe(0);
  });

  it("знижка 100% дає нуль", () => {
    expect(estimateTotalCents({ hours: 10, rateCents: 5000, discountPercent: 100 })).toBe(0);
  });

  it("повертає ціле число центів при дробових годинах", () => {
    const total = estimateTotalCents({ hours: 1.5, rateCents: 3333 });
    expect(Number.isInteger(total)).toBe(true);
  });

  it("відхиляє знижку понад 100% замість від'ємного кошторису", () => {
    expect(() => estimateTotalCents({ hours: 10, rateCents: 5000, discountPercent: 150 })).toThrow(QuoteInputError);
  });

  it("відхиляє від'ємні години", () => {
    expect(() => estimateTotalCents({ hours: -1, rateCents: 5000 })).toThrow(QuoteInputError);
  });

  it("відхиляє від'ємну ставку", () => {
    expect(() => estimateTotalCents({ hours: 10, rateCents: -5000 })).toThrow(QuoteInputError);
  });

  it("відхиляє дробову ставку — rateCents це центи", () => {
    // {hours: 2, rateCents: 0.5} раніше давало валідний результат 1
    expect(() => estimateTotalCents({ hours: 2, rateCents: 0.5 })).toThrow(QuoteInputError);
  });
});

describe("splitInstallments — інваріант суми", () => {
  // Головний інваріант: скільки розбили, стільки й має лишитись.
  it.each([
    [100, 3],
    [100, 8],
    [270000, 7],
    [45000, 6],
  ])("сума платежів splitInstallments(%i, %i) дорівнює початковій сумі", (total, parts) => {
    const parts_ = splitInstallments(total, parts);
    expect(parts_.reduce((a, b) => a + b, 0)).toBe(total);
  });

  it("повертає рівно `parts` елементів", () => {
    expect(splitInstallments(100, 3)).toHaveLength(3);
  });

  it("усі платежі — цілі числа центів", () => {
    for (const p of splitInstallments(100, 3)) {
      expect(Number.isInteger(p)).toBe(true);
    }
  });

  it("платежі відрізняються не більше ніж на 1 цент", () => {
    const p = splitInstallments(100, 3);
    expect(Math.max(...p) - Math.min(...p)).toBeLessThanOrEqual(1);
  });

  it("відхиляє нуль частин замість тихої втрати суми", () => {
    expect(() => splitInstallments(100, 0)).toThrow(QuoteInputError);
  });

  it("відхиляє від'ємну кількість частин", () => {
    expect(() => splitInstallments(100, -1)).toThrow(QuoteInputError);
  });

  it("відхиляє дробову кількість частин", () => {
    expect(() => splitInstallments(100, 2.5)).toThrow(QuoteInputError);
  });
});

describe("formatMoney — крайові випадки", () => {
  it("форматує нуль", () => {
    expect(formatMoney(0)).toBe("$0.00");
  });

  it("форматує суму менше долара", () => {
    expect(formatMoney(5)).toBe("$0.05");
  });

  it("форматує від'ємну суму", () => {
    expect(formatMoney(-123450)).toBe("-$1,234.50");
  });

  it("відхиляє нецілі центи замість зламаного рядка", () => {
    expect(() => formatMoney(1234.5)).toThrow(QuoteInputError);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Знахідки CodeRabbit на PR #6 — межі, яких не було в першому проході.
// Усі три ламали задокументований контракт, а не лише «незручний вхід».
// ─────────────────────────────────────────────────────────────────────────

describe("межі числових діапазонів (рев'ю PR #6)", () => {
  it("estimateTotalCents відхиляє переповнення замість NaN/Infinity", () => {
    expect(() => estimateTotalCents({ hours: Number.MAX_VALUE, rateCents: 2 })).toThrow(QuoteInputError);
  });

  it("splitInstallments відхиляє небезпечне ціле замість втрати точності", () => {
    // 9007199254740994 > 2^53-1: сума частин виходила 9007199254740996
    expect(() => splitInstallments(9007199254740994, 3)).toThrow(QuoteInputError);
  });

  it("splitInstallments відхиляє надто велике parts своєю помилкою, не RangeError", () => {
    expect(() => splitInstallments(100, 4294967296)).toThrow(QuoteInputError);
  });

  it("splitInstallments приймає parts рівно на межі MAX_INSTALLMENTS", () => {
    const parts = splitInstallments(1_000_000, MAX_INSTALLMENTS);
    expect(parts).toHaveLength(MAX_INSTALLMENTS);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1_000_000);
  });

  it("formatMoney відхиляє небезпечне ціле", () => {
    expect(() => formatMoney(9007199254740994)).toThrow(QuoteInputError);
  });
});
