# Liverton Learning: Profile Save and PDF Preview Diagnostic Report

**Author:** Manus AI  
**Repository:** [mozemedia5/Liverton-Learning](https://github.com/mozemedia5/Liverton-Learning)  
**Date:** 25 August 2026

## Executive summary

The repository contains two independent failure surfaces that can present as one problem. First, profile saving performs the main profile write and then performs several secondary writes: a username claim, role-specific profile synchronization, searchable-directory synchronization, account-setup reminder maintenance, and identity refresh. The main `/users/{uid}` write is authorized by the checked-in rules, but the UI awaited secondary work and surfaced any late `permission-denied` error as if the profile itself had failed. This is especially likely when production Firestore rules are older than the rules committed in the repository.

Second, the PDF reader loads the PDF successfully and then updates `pageCount` in the same `try` block. If that metadata update is rejected—most commonly because a shared document is not writable by the current viewer, or because deployed rules differ from the checked-in rules—the code catches the error and labels the whole PDF as unreadable. The previous UI then offered only a red error state and no preview fallback. The PDF itself may therefore be valid even when the page says “Failed to load PDF.”

I applied a local, source-controlled fix for both masking problems. Profile saves now treat directory indexing, old-username cleanup, and account-setup notifications as non-blocking secondary effects. PDF page-count persistence is now best effort, and the reader displays the original file through a native browser PDF iframe if PDF.js cannot initialize. The repository still needs production-rule verification and deployment; I did not push or deploy these changes.

## Scope and verification

I inspected the profile page, authentication context, username service, account-setup service, document library, document reader, Cloudinary upload/signing code, Firebase configuration, Firestore rules, and recent Git history. The public production landing page at [liverton-learning.vercel.app](https://liverton-learning.vercel.app/) loads successfully. A signed-in end-to-end reproduction was not possible from the available session because it would require the user’s authenticated account and the exact deployed Firebase/Vercel environment.

| Check | Result |
|---|---|
| Repository clone and clean baseline | Passed |
| Production frontend entry point | Loads successfully |
| `npm run build` after changes | Passed; Vite/PWA build completed |
| `npm test -- --run` after changes | Passed; 13 test files and 74 tests |
| `git diff --check` | Passed |
| Live authenticated Firestore reproduction | Not completed; requires signed-in account and deployed-rule inspection |
| Live PDF URL/CORS/network reproduction | Not completed; requires an actual document URL and browser network trace |

## Finding 1: profile saves are coupled to secondary permission-sensitive writes

The profile form sends `fullName`, `username`, `phone`, `address`, `bio`, education fields, subjects, and experience to `updateUserProfile()` in [`src/pages/features/Profile.tsx`](https://github.com/mozemedia5/Liverton-Learning/blob/main/src/pages/features/Profile.tsx). The email input is deliberately disabled and the page states “Email cannot be changed.” Therefore, changing the email through this form is not supported by the current product design; email verification status is updated separately.

The save method in [`src/contexts/AuthContext.tsx`](https://github.com/mozemedia5/Liverton-Learning/blob/main/src/contexts/AuthContext.tsx) follows this sequence:

| Stage | Firestore path or operation | Role in save | Failure impact before fix |
|---|---|---|---|
| 1 | `usernames/{normalizedUsername}` transaction | Reserve or confirm username | Correctly blocks duplicate usernames; a rules mismatch blocks the save before the profile write |
| 2 | `users/{uid}` `setDoc(..., { merge: true })` | Primary user profile | The actual profile write |
| 3 | `{role}s/{uid}` `setDoc(..., { merge: true })` | Legacy/role-specific mirror | Can fail if deployed rules omit the relevant role collection |
| 4 | `userDirectory/{uid}` | Search/discovery index | Secondary; should not make a successful profile edit look failed |
| 5 | `notifications/account-setup-{uid}-{date}` | Setup reminder | Secondary; can return `permission-denied` under stale rules |
| 6 | Additional identity/setup synchronization | Refresh directory and setup state | Any awaited error reached the profile page’s catch block |

The checked-in rules allow a signed-in user to read and write their own `users/{uid}` document. They also allow the user to manage their own `userDirectory/{uid}` entry and username claim. The role-specific collections are allowed through the repository’s catch-all list, which includes `students`, `teachers`, `parents`, and `school_admins`. However, Firebase evaluates the rules deployed in the Firebase project, not the local file; a production project with an older ruleset will behave differently from this checkout. Firebase’s rules model is explicitly authorization-based and must be deployed to the target project before it governs production requests [1].

The most important defect is error-boundary design: profile persistence and convenience synchronization were treated as one atomic operation even though they are separate documents with separate rules. Consequently, a late notification or directory error can produce a failure toast after the primary profile document has already been updated. This explains the user-visible pattern in which fields such as username or bio appear not to save, while a refresh may reveal that some fields did in fact persist.

### Username-specific behavior

The username is subject to stricter logic than ordinary fields. It is normalized to lowercase without a leading `@`, validated to 3–30 characters, and claimed in a transaction. The availability check reads both `userDirectory` and `usernames`. A `permission-denied` during the availability check or claim can prevent the save entirely. A stale deployed ruleset that does not contain the checked-in `usernames` permissions is therefore a direct explanation for username-only failures.

There is also a consistency risk when a username claim succeeds but a later profile write fails. The existing code attempts a rollback, which is good, but the rollback itself could fail under the same rules mismatch. The local fix now logs failed cleanup instead of replacing the original error and also makes later directory/reminder synchronization non-blocking.

## Finding 2: PDF preview errors are being misclassified

PDF uploads are recorded in [`src/pages/features/Documents.tsx`](https://github.com/mozemedia5/Liverton-Learning/blob/main/src/pages/features/Documents.tsx) with `type`, `mimeType`, `fileUrl`, `pageCount: 0`, owner, sharing, and visibility metadata. The upload service classifies documents as Cloudinary `raw` assets, and the signing endpoint confirms `resourceType: 'raw'` for documents. Cloudinary documents state that raw PDFs can be delivered as-is, but raw assets do not support PDF transformations [2]. Raw delivery is not inherently invalid, but it makes the browser URL, response headers, content type, and CORS behavior important to verify.

The PDF path in [`src/pages/features/DocumentEditor.tsx`](https://github.com/mozemedia5/Liverton-Learning/blob/main/src/pages/features/DocumentEditor.tsx) does the following:

1. Reads document metadata from Firestore.
2. Reads the viewer’s reading-progress subdocument.
3. Loads PDF.js from a CDN.
4. Calls `pdfjs.getDocument(docMeta.fileUrl)`.
5. Sets the PDF document and page count.
6. If `pageCount` is zero, calls `updateDoc()` on the parent `/documents/{docId}` record.
7. Reads the first page and renders canvases.

Before the fix, steps 4–7 shared one `try/catch`. Therefore, a successful PDF fetch followed by a rejected `updateDoc()` entered the catch block and displayed “Failed to load PDF document. Corrupted or password protected.” That message is inaccurate for a permission failure and can mislead debugging.

The checked-in document rules allow an owner to update their document and allow a shared user to update it as well. This is broader than necessary for a read-only viewer: a person who can read a shared document may not logically be entitled to modify its metadata. If the deployed rules are narrower, or if the record’s owner/share fields do not match the current UID, the page-count update may be rejected even though the file was readable. The reader should not require that optional metadata write in order to display the file.

PDF.js also requires the browser to fetch the source URL, and cross-origin delivery must be browser-compatible. The PDF.js project documents that it fetches the PDF from the supplied URL and that URL handling and server delivery matter for custom integrations [3]. If the Cloudinary response is blocked by CORS, returns a non-PDF body, or is inaccessible on a particular browser, the custom renderer can fail even though opening the URL directly works. The prior interface had no native-browser fallback, so users had no preview path when PDF.js failed.

## Changes applied locally

### Profile reliability

In [`src/contexts/AuthContext.tsx`](https://github.com/mozemedia5/Liverton-Learning/blob/main/src/contexts/AuthContext.tsx), the primary profile write remains awaited and authoritative. Directory indexing, account-setup reminder creation/clearing, and release of an old username claim are now treated as best-effort secondary operations. Their failures are logged and do not convert a successful profile write into a failure toast. The authentication refresh path already used defensive logging for some side effects; the new handling makes the profile-save path consistent with that principle.

This does not weaken the authorization boundary for the primary user profile or username claim. It only prevents optional synchronization from masking the result of the primary operation. A duplicate username or invalid username still blocks the save as it should.

### PDF reliability

In [`src/pages/features/DocumentEditor.tsx`](https://github.com/mozemedia5/Liverton-Learning/blob/main/src/pages/features/DocumentEditor.tsx), page-count persistence is now best effort. If the PDF has loaded, a page-count permission error is logged without replacing the loaded PDF state with a generic corruption error. If PDF.js itself fails, the page now embeds the original `fileUrl` in a native browser PDF iframe, with a clear message that the enhanced reader failed but the original preview remains available.

This is a resilience fix, not a substitute for checking the asset response. The production URL should still be verified to return `200`, `Content-Type: application/pdf`, and browser-allowed cross-origin headers where PDF.js requires them.

## Recommended production actions

| Priority | Action | Why it matters |
|---|---|---|
| P0 | Deploy the repository’s current `firestore.rules` to the exact Firebase project used by the production frontend, or reconcile the deployed rules manually | The client cannot fix a production `permission-denied` caused by an older deployed ruleset |
| P0 | Confirm Vercel’s `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_AUTH_DOMAIN`, and `VITE_FIREBASE_STORAGE_BUCKET` point to `liverton-learn` | The client has fallbacks to `liverton-learn`; an environment mismatch can authenticate against one project while rules/data exist in another |
| P0 | Test profile saving with a real user and inspect the browser Network/Console logs | This distinguishes username-claim denial, role-mirror denial, or notification-side-effect denial |
| P0 | Test one owned PDF and one shared PDF in production | Shared documents are the most likely case for optional page-count write restrictions |
| P1 | Add an automated rules test matrix for owner, shared viewer, unauthenticated user, and each role | Current unit tests validate application logic but do not prove the deployed Firestore rules |
| P1 | Move page-count extraction to an upload/server job or make it an owner-only metadata update | A viewer should not need write permission to read a PDF |
| P1 | Store PDFs with an explicitly verified `application/pdf` response and document Cloudinary delivery behavior | Prevents content-type/CORS ambiguity in PDF.js and native iframe viewers |
| P1 | Replace CDN-loaded PDF.js with a pinned application dependency or add a CDN failure timeout | Removes reliance on a third-party script at runtime and makes worker versioning deterministic |
| P2 | Add a user-facing “Saved, but indexing is pending” status when secondary synchronization fails | Makes eventual consistency visible without blocking the user |
| P2 | Add an admin-only repair/backfill job for `userDirectory` and username registry consistency | Recovers records created before the current indexing logic or during a partial failure |

## Recommended verification procedure

First, in the Firebase Console for the production project, inspect the deployed Firestore rules and compare them with [`firestore.rules`](https://github.com/mozemedia5/Liverton-Learning/blob/main/firestore.rules). Confirm that the `users`, `userDirectory`, `usernames`, `documents`, nested `userProgress`, `notifications`, and role-specific collection paths all match the client’s actual writes. Firebase’s official rules guidance recommends deploying and testing rules against the intended project rather than assuming a local rules file is active [1].

Next, sign in as a normal user, open Profile, and save only the bio. If bio-only saving succeeds but username saving fails, inspect the `usernames/{normalizedUsername}` transaction and the availability query. If the primary `/users/{uid}` write succeeds but the UI still shows an error, inspect the subsequent `userDirectory` or `notifications` request. The patched code should now show success for the primary write while logging the optional failure.

Finally, upload one small PDF, open it as the owner, and open a separately shared PDF as a viewer. In the browser network panel, verify the Cloudinary response status, MIME type, redirects, and CORS headers. If PDF.js fails but the iframe works, keep the fallback and address PDF.js delivery separately. If both fail, the stored `fileUrl` or Cloudinary delivery configuration is the root issue rather than Firestore page-count permissions.

## Files changed

| File | Change |
|---|---|
| `src/contexts/AuthContext.tsx` | Made directory, reminder, and old-username cleanup side effects non-blocking after the primary profile write |
| `src/pages/features/DocumentEditor.tsx` | Isolated optional page-count update errors and added a native iframe fallback for PDF preview |
| `LIVERTON_PROFILE_PDF_DIAGNOSTIC_REPORT.md` | Added this diagnostic report |

The changes are present in the local checkout but have **not been pushed to GitHub or deployed**. Before deployment, I recommend reviewing the diff and running the production verification procedure above against the actual Firebase project and a real authenticated account.

## References

[1]: https://firebase.google.com/docs/firestore/security/get-started "Get started with Cloud Firestore Security Rules — Firebase"
[2]: https://cloudinary.com/documentation/upload_parameters "Upload parameters — Cloudinary"
[3]: https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions "Frequently Asked Questions — Mozilla PDF.js"
