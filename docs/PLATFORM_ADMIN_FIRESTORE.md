# Creating a Liverton Platform Administrator

## 1. Create the account in Firebase Authentication

Create the administrator in **Firebase Console → Authentication → Users → Add user**. Use the administrator’s real email address and a strong password. Copy the generated Firebase Auth **UID**. The Firestore document ID must match this UID exactly.

Public registration does not expose the `platform_admin` role. Platform administrators should be created manually by a trusted operator, then assigned the Firestore role below.

## 2. Create the Firestore document

Open **Firestore Database → `users` → Add document**. Set the document ID to the copied Firebase Auth UID, not the email address.

| Field | Firestore type | Example | Required by the app |
|---|---|---|---|
| `uid` | string | `firebase-auth-uid` | Yes |
| `email` | string | `admin@example.com` | Yes |
| `fullName` | string | `Platform Administrator` | Yes |
| `role` | string | `platform_admin` | Yes; this controls access |
| `sex` | string | `other` | Yes; accepted values are `male`, `female`, `other` |
| `age` | number | `35` | Yes |
| `country` | string | `Global` | Yes |
| `permissions` | array of strings | `['manage_users', 'manage_content', 'manage_payments', 'view_analytics', 'moderate_content']` | Recommended for the admin record |
| `status` | string | `active` | Recommended; accepted operational values are `active`, `suspended`, `pending` |
| `isVerified` | boolean | `true` | Recommended |
| `createdAt` | timestamp | current server timestamp | Recommended |
| `updatedAt` | timestamp | current server timestamp | Recommended |
| `profilePicture` | string | `''` | Optional |
| `bio` | string | `Liverton platform operations` | Optional |

A safe starter document is:

```json
{
  "uid": "PASTE_FIREBASE_AUTH_UID",
  "email": "admin@example.com",
  "fullName": "Platform Administrator",
  "role": "platform_admin",
  "sex": "other",
  "age": 35,
  "country": "Global",
  "permissions": [
    "manage_users",
    "manage_content",
    "manage_payments",
    "view_analytics",
    "moderate_content"
  ],
  "status": "active",
  "isVerified": true,
  "createdAt": "Firestore server timestamp",
  "updatedAt": "Firestore server timestamp",
  "profilePicture": "",
  "bio": "Liverton platform operations"
}
```

In the Firebase Console, choose **Timestamp** for `createdAt` and `updatedAt`; do not paste the words `Firestore server timestamp` as a string.

## 3. Sign in and verify the role

Sign in with the same Authentication email and password. The application reads `users/{uid}`, loads `role`, and routes `platform_admin` users to `/admin/dashboard`. The admin navigation exposes user management, analytics, moderation, monitoring, payments, and dashboard-banner management.

The codebase also contains a legacy fallback for `infoliverton@gmail.com`, but the reliable setup is still a valid Firebase Auth user plus a matching `users/{uid}` document with `role: 'platform_admin'`.

## 4. Important security note

The Firestore document controls client-side routing and interface visibility, but it must not be treated as the only security boundary. Firestore rules and server-side functions should enforce the same role and permission checks for user management, payment records, moderation, financial operations, and other privileged writes. Never place a Firebase Admin SDK private key in the browser or in public environment variables.
