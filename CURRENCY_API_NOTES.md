# Currency conversion integration notes

Liverton’s educator pricing preview and student paid-module display use the ExchangeRate-API open-access endpoint documented at https://www.exchangerate-api.com/docs/free.

The endpoint is `https://open.er-api.com/v6/latest/{BASE}`. The response provides a `rates` object, the base currency, and last/next update timestamps. The provider documentation states that the open endpoint requires no API key, updates once per day, is rate limited, allows caching, and requires attribution. The implementation caches each base-currency response in browser local storage for 12 hours and displays the provider attribution link alongside educator UGX estimates.

This conversion is indicative display data only. Flutterwave checkout continues to charge the module price and currency stored by the educator, and payment verification compares the provider transaction amount and currency against the stored module price.
