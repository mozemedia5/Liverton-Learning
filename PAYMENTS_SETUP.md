# Liverton Learning paid-module payments

## Recommended integration

Liverton should use **Flutterwave Standard hosted checkout** for paid modules. The browser should request a payment link from a server endpoint, redirect the learner to Flutterwave, and then the server should verify the completed transaction before adding the learner to `enrolledStudents` or creating a completed `/payments` record. A client-side success redirect alone must never grant access.

Flutterwave documents this flow as: create the payment server-side, redirect the customer to the returned hosted link, process the callback, and verify the final transaction state on the server.[1]

## Exact values to configure

| Configuration value | Example shape | Where it belongs | Purpose |
|---|---|---|---|
| `FLW_PUBLIC_KEY` | `FLWPUBK_TEST-...` or `FLWPUBK-...` | Browser-safe runtime configuration or server | Identifies the Flutterwave account for client-side checkout integrations. |
| `FLW_SECRET_KEY` | `FLWSECK_TEST-...` or `FLWSECK-...` | Server/Vercel secret only | Authorizes payment creation and transaction verification. **Never expose this in React, `VITE_` variables, Git, or browser JavaScript.** |
| `FLW_SECRET_HASH` | A random webhook secret hash | Server/Vercel secret only | Verifies that incoming Flutterwave webhook notifications came from the configured merchant endpoint. |
| `FLW_ENCRYPTION_KEY` | Flutterwave encryption key | Only if direct card-charge APIs are used | Not required for the recommended Standard hosted checkout flow; Flutterwave describes it as required for encrypting direct card-charge payloads.[1] |

For this project, the minimum implementation should use `FLW_PUBLIC_KEY`, `FLW_SECRET_KEY`, and `FLW_SECRET_HASH`. The encryption key should not be added merely because it exists; it is only needed if the implementation changes from hosted checkout to direct card charging.

## Where to get the keys

Log in to the [Flutterwave Dashboard](https://app.flutterwave.com/dashboard/home), open **Settings**, then select **API Keys** under **Developers**. Flutterwave’s help documentation says test keys and the live public key are available there, while the live secret key must be generated and downloaded when shown.[2]

Use **Test Mode** while developing. Test keys are separate from live keys and are marked with the `_TEST` form. Switch to **Live Mode** only after the checkout, callback, webhook, amount, currency, and access-granting paths have been tested end to end.[1]

## Environment variables

Add these to the deployment secret manager, not to a committed `.env` file:

```bash
# Server-side only
FLW_SECRET_KEY=FLWSECK_TEST-replace-me
FLW_SECRET_HASH=replace-with-webhook-secret-hash

# Only needed if a client-side Flutterwave widget is deliberately used
VITE_FLW_PUBLIC_KEY=FLWPUBK_TEST-replace-me
```

The current frontend has only a payment history/mock payment screen and a `flutterwaveRef` type field; it does not yet have a complete verified Flutterwave checkout endpoint. Until that endpoint exists, paid-module buttons must not grant access. The current implementation therefore routes paid-module intent to the payment page and leaves access gated pending verified checkout.

## Required server-side checks

Before granting module access, the future payment endpoint should verify the transaction reference, transaction status, amount, currency, and the intended module ID. It should also use a unique `tx_ref`, store a pending payment before redirecting, handle the callback and webhook idempotently, and grant access only after a server-side verification response confirms the exact expected amount and currency. Flutterwave recommends comparing transaction details before providing value and recommends webhooks where applicable.[3]

The secret key must be kept in Vercel/server environment variables or another secrets manager. Flutterwave explicitly states that secret-key API calls must originate from the backend, not from the browser, and that keys should not be hardcoded in the codebase.[3]

## References

[1]: https://developer.flutterwave.com/v3.0/docs/authentication "Flutterwave Authentication"
[2]: https://flutterwave.com/gh/support/my-account/getting-your-api-keys "Flutterwave: Getting your API keys"
[3]: https://developer.flutterwave.com/v3.0/docs/best-practices "Flutterwave Best Practices"
