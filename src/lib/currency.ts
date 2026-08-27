export type SupportedCurrency = 'UGX' | 'USD' | 'KES' | 'TZS' | 'RWF' | 'EUR' | 'GBP';

export const SUPPORTED_CURRENCIES: Record<SupportedCurrency, { label: string; symbol: string }> = {
  UGX: { label: 'Ugandan Shilling', symbol: 'USh' },
  USD: { label: 'US Dollar', symbol: '$' },
  KES: { label: 'Kenyan Shilling', symbol: 'KSh' },
  TZS: { label: 'Tanzanian Shilling', symbol: 'TSh' },
  RWF: { label: 'Rwandan Franc', symbol: 'FRw' },
  EUR: { label: 'Euro', symbol: '€' },
  GBP: { label: 'British Pound', symbol: '£' },
};

// Rates are units of UGX per currency. The fallback keeps pricing usable offline.
const FALLBACK_UGX_RATES: Record<SupportedCurrency, number> = {
  UGX: 1,
  USD: 3700,
  KES: 28.5,
  TZS: 1.45,
  RWF: 2.9,
  EUR: 4050,
  GBP: 4750,
};

let liveRates = { ...FALLBACK_UGX_RATES };
let lastFetchedAt = 0;

export async function refreshUgandaRates(): Promise<Record<SupportedCurrency, number>> {
  if (Date.now() - lastFetchedAt < 30 * 60 * 1000) return liveRates;
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/UGX');
    if (!response.ok) throw new Error('Exchange rate request failed');
    const data = await response.json() as { rates?: Record<string, number> };
    const rates = data.rates || {};
    const next = { ...FALLBACK_UGX_RATES };
    (Object.keys(next) as SupportedCurrency[]).forEach((currency) => {
      if (currency === 'UGX') return;
      const foreignPerUgx = rates[currency];
      if (foreignPerUgx && Number.isFinite(foreignPerUgx)) next[currency] = 1 / foreignPerUgx;
    });
    liveRates = next;
    lastFetchedAt = Date.now();
  } catch {
    // Keep the last known/fallback rates; pricing should never white-screen offline.
  }
  return liveRates;
}

export function convertCurrency(amount: number, from: SupportedCurrency = 'UGX', to: SupportedCurrency = 'UGX') {
  return (amount * liveRates[from]) / liveRates[to];
}

export function formatCurrency(amount: number, currency: SupportedCurrency) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: currency === 'UGX' ? 0 : 2 }).format(amount);
}

export function getUgandaRateSnapshot() {
  return liveRates;
}
