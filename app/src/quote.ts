/**
 * Розрахунок кошторису для проєкту автоматизації.
 * Усі суми — у центах (цілі числа), щоб уникнути похибок float.
 *
 * Це навчальний модуль-ціль для промптів з `prompts/`.
 * Він НАВМИСНЕ недосконалий — саме це ви і знайдете добре сформульованим
 * промптом з acceptance criteria (Task A).
 */

export interface QuoteInput {
  /** Оцінка робіт у годинах */
  hours: number;
  /** Ставка за годину, у центах (напр. 5000 = $50.00) */
  rateCents: number;
  /** Знижка у відсотках, 0..100 */
  discountPercent?: number;
}

/** Ціна проєкту в центах з урахуванням знижки. */
export function estimateTotalCents(input: QuoteInput): number {
  const { hours, rateCents, discountPercent = 0 } = input;
  const gross = hours * rateCents;
  const discount = (gross * discountPercent) / 100;
  return Math.round(gross - discount);
}

/**
 * Розбити суму на `parts` рівних платежів (у центах).
 * Повертає масив довжиною `parts`.
 */
export function splitInstallments(totalCents: number, parts: number): number[] {
  const each = Math.round(totalCents / parts);
  return new Array(parts).fill(each);
}

/** Форматування центів у рядок на кшталт "$1,234.50". */
export function formatMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100).toLocaleString("en-US");
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}$${whole}.${frac}`;
}
