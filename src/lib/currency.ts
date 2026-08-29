export const SUPPORTED_CURRENCIES = [
  { code: 'UGX', symbol: 'USh', label: 'Ugandan Shilling' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'KES', symbol: 'KSh', label: 'Kenyan Shilling' },
  { code: 'TZS', symbol: 'TSh', label: 'Tanzanian Shilling' },
  { code: 'RWF', symbol: 'FRw', label: 'Rwandan Franc' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]['code'];

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  updatedAt?: string;
  nextUpdateAt?: string;
}

const CACHE_PREFIX = 'liverton-fx-rates:';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

function cacheKey(base: string) {
  return `${CACHE_PREFIX}${base.toUpperCase()}`;
}

function readCachedRates(base: string): ExchangeRates | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(base));
    if (!raw) return null;
    const cached = JSON.parse(raw) as { savedAt: number; value: ExchangeRates };
    if (!cached?.value?.rates || Date.now() - cached.savedAt > CACHE_TTL_MS) return null;
    return cached.value;
  } catch {
    return null;
  }
}

function writeCachedRates(value: ExchangeRates) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(cacheKey(value.base), JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    // Storage can be unavailable in private browsing; the live response still works.
  }
}

export async function fetchExchangeRates(base: string): Promise<ExchangeRates> {
  const normalizedBase = base.toUpperCase();
  const cached = readCachedRates(normalizedBase);
  if (cached) return cached;

  const response = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(normalizedBase)}`);
  if (!response.ok) throw new Error('Live exchange rates are temporarily unavailable.');
  const body = await response.json() as {
    result?: string;
    base_code?: string;
    rates?: Record<string, number>;
    time_last_update_utc?: string;
    time_next_update_utc?: string;
  };
  if (body.result !== 'success' || !body.rates) throw new Error('The exchange-rate provider returned an invalid response.');

  const value: ExchangeRates = {
    base: body.base_code || normalizedBase,
    rates: body.rates,
    updatedAt: body.time_last_update_utc,
    nextUpdateAt: body.time_next_update_utc,
  };
  writeCachedRates(value);
  return value;
}

export function convertAmount(amount: number, rates: ExchangeRates | null, target: string) {
  if (!rates || !Number.isFinite(amount)) return null;
  const rate = rates.rates[target.toUpperCase()];
  return typeof rate === 'number' && Number.isFinite(rate) ? amount * rate : null;
}

export function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: currency === 'UGX' || currency === 'JPY' ? 0 : 2 }).format(amount);
}

export const EXCHANGE_RATE_ATTRIBUTION_URL = 'https://www.exchangerate-api.com';
export const EXCHANGE_RATE_ATTRIBUTION_LABEL = 'Rates by ExchangeRate-API';
