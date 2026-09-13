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

function assertNonNegative(value: number, name: string): void {
  if (value < 0) {
    throw new QuoteInputError(`${name} не може бути від'ємним, отримано: ${value}`);
  }
}

function assertInteger(value: number, name: string): void {
  if (!Number.isInteger(value)) {
    throw new QuoteInputError(`${name} має бути цілим числом, отримано: ${value}`);
  }
}

/**
 * Ціна проєкту в центах з урахуванням знижки.
 *
 * Контракт: результат — ціле число центів, завжди `>= 0`.
 *
 * НЕ визначено контрактом: напрямок округлення при дробових `hours`
 * (зараз `Math.round`, тобто 0.5 цента йде вгору — на користь виконавця).
 *
 * @example estimateTotalCents({ hours: 10, rateCents: 5000 })                      // 50000
 * @example estimateTotalCents({ hours: 10, rateCents: 5000, discountPercent: 10 }) // 45000
 * @throws {QuoteInputError} якщо `hours` або `rateCents` від'ємні,
 *   або `discountPercent` поза діапазоном 0..100.
 */
export function estimateTotalCents(input: QuoteInput): number {
  const { hours, rateCents, discountPercent = 0 } = input;

  assertFinite(hours, "hours");
  assertFinite(rateCents, "rateCents");
  assertFinite(discountPercent, "discountPercent");

  assertNonNegative(hours, "hours");
  assertNonNegative(rateCents, "rateCents");

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
 * Контракт (гарантується; на це можна покладатись):
 * - `result.length === parts`
 * - `sum(result) === totalCents` — гроші не зникають і не з'являються
 * - `max(result) - min(result) <= 1` — платежі рівні з точністю до цента
 *
 * НЕ визначено контрактом: у які саме платежі потрапляють «зайві» центи,
 * і поведінка при `totalCents < 0` (інваріант суми тримається, але сценарій
 * повернення коштів не продуманий). Не покладайтесь на це.
 *
 * @example splitInstallments(100, 3) // [34, 33, 33] — сума 100
 * @example splitInstallments(100, 8) // [13,13,13,13,12,12,12,12] — сума 100
 * @throws {QuoteInputError} якщо `totalCents` не ціле, або `parts` не є
 *   цілим додатним числом.
 */
export function splitInstallments(totalCents: number, parts: number): number[] {
  assertFinite(totalCents, "totalCents");
  assertFinite(parts, "parts");

  assertInteger(totalCents, "totalCents");

  if (!Number.isInteger(parts) || parts <= 0) {
    throw new QuoteInputError(`parts має бути цілим числом > 0, отримано: ${parts}`);
  }

  // Реалізація: метод найбільшого залишку. Деталь, а не обіцянка —
  // порядок розподілу залишку контрактом не зафіксований.
  const base = Math.trunc(totalCents / parts);
  const remainder = totalCents - base * parts;
  const step = remainder >= 0 ? 1 : -1;
  const extra = Math.abs(remainder);

  return Array.from({ length: parts }, (_, i) => (i < extra ? base + step : base));
}

/**
 * Форматування центів у рядок на кшталт "$1,234.50".
 *
 * Контракт: результат має вигляд `[-]$X,XXX.XX` — завжди рівно дві цифри
 * після крапки, роздільник тисяч — кома (локаль `en-US`, зафіксована навмисно,
 * щоб вивід не залежав від машини).
 *
 * @example formatMoney(123450)  // "$1,234.50"
 * @example formatMoney(-123450) // "-$1,234.50"
 * @example formatMoney(5)       // "$0.05"
 * @throws {QuoteInputError} якщо `cents` не ціле число.
 */
export function formatMoney(cents: number): string {
  assertFinite(cents, "cents");

  assertInteger(cents, "cents");

  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100).toLocaleString("en-US");
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}$${whole}.${frac}`;
}
