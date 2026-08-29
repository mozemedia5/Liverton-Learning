# Firestore Rules Deployment Guide

The paste-ready rules are in `FIRESTORE_RULES_PASTE.txt` and are also the repository's `firestore.rules` file.

## Firebase Console

1. Open Firebase Console and select the `liverton-learn` project.
2. Open **Firestore Database → Rules**.
3. Replace the editor contents with the complete contents of `FIRESTORE_RULES_PASTE.txt`.
4. Click **Publish**.
5. Test an authenticated user, a second user, a team member, and a platform admin. In particular, verify that a user cannot read another user's Hanna chat or AI usage record.

## Firebase CLI alternative

From the repository root, after authenticating the Firebase CLI:

```bash
npx firebase-tools login
npx firebase-tools use liverton-learn
npx firebase-tools deploy --only firestore:rules
```

The rules include explicit authorization for Hanna chats/messages, Liv Teams, treasury and AI-credit ledgers, LivFund, LivMart, project verification, AI usage, and Cloudinary asset tracking. Vercel's Firebase Admin writes to `ai_usage` server-side; Firestore Rules intentionally prevent browser writes to that accounting collection.
