/**
 * Розрахунок кошторису для проєкту автоматизації.
 * Усі суми — у центах (цілі числа), щоб уникнути похибок float.
 *
 * Це навчальний модуль-ціль для промптів з `prompts/`.
 */

export interface QuoteInput {
  /** Оцінка робіт у годинах */
  hours: number;
  /** Ставка за годину, у центах (напр. 5000 = $50.00) */
  rateCents: number;
  /** Знижка у відсотках, 0..100 */
  discountPercent?: number;
}

/** Помилка некоректного входу в розрахунок кошторису. */
export class QuoteInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuoteInputError";
  }
}

function assertFinite(value: number, name: string): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new QuoteInputError(`${name} має бути скінченним числом, отримано: ${value}`);
  }
}

/**
 * Ціна проєкту в центах з урахуванням знижки.
 *
 * @throws {QuoteInputError} якщо `hours` або `rateCents` від'ємні,
 *   або `discountPercent` поза діапазоном 0..100.
 */
export function estimateTotalCents(input: QuoteInput): number {
  const { hours, rateCents, discountPercent = 0 } = input;

  assertFinite(hours, "hours");
  assertFinite(rateCents, "rateCents");
  assertFinite(discountPercent, "discountPercent");

  if (hours < 0) {
    throw new QuoteInputError(`hours не може бути від'ємним, отримано: ${hours}`);
  }
  if (rateCents < 0) {
    throw new QuoteInputError(`rateCents не може бути від'ємним, отримано: ${rateCents}`);
  }
  if (discountPercent < 0 || discountPercent > 100) {
    throw new QuoteInputError(
      `discountPercent має бути в межах 0..100, отримано: ${discountPercent}`,
    );
  }

  const gross = hours * rateCents;
  const discount = (gross * discountPercent) / 100;
  return Math.round(gross - discount);
}

/**
 * Розбити суму на `parts` платежів (у центах).
 *
 * Гроші не зникають і не з'являються: сума елементів результату **точно**
 * дорівнює `totalCents`. Залишок від ділення розподіляється по одному центу
 * на перші платежі (метод найбільшого залишку), тож платежі відрізняються
 * щонайбільше на 1 цент.
 *
 * @example splitInstallments(100, 3) // [34, 33, 33] — сума 100
 * @throws {QuoteInputError} якщо `totalCents` не ціле, або `parts` не є
 *   цілим додатним числом.
 */
export function splitInstallments(totalCents: number, parts: number): number[] {
  assertFinite(totalCents, "totalCents");
  assertFinite(parts, "parts");

  if (!Number.isInteger(totalCents)) {
    throw new QuoteInputError(`totalCents має бути цілим числом центів, отримано: ${totalCents}`);
  }
  if (!Number.isInteger(parts) || parts <= 0) {
    throw new QuoteInputError(`parts має бути цілим числом > 0, отримано: ${parts}`);
  }

  const base = Math.trunc(totalCents / parts);
  const remainder = totalCents - base * parts;
  const step = remainder >= 0 ? 1 : -1;
  const extra = Math.abs(remainder);

  return Array.from({ length: parts }, (_, i) => (i < extra ? base + step : base));
}

/**
 * Форматування центів у рядок на кшталт "$1,234.50".
 *
 * @throws {QuoteInputError} якщо `cents` не ціле число.
 */
export function formatMoney(cents: number): string {
  assertFinite(cents, "cents");

  if (!Number.isInteger(cents)) {
    throw new QuoteInputError(`cents має бути цілим числом, отримано: ${cents}`);
  }

  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100).toLocaleString("en-US");
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}$${whole}.${frac}`;
}
