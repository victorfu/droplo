# Password Protection Design

## Summary

Droplo will support optional password protection for uploaded sites. The default remains unchanged: sites are public, require no password, and can be opened from the generated `/s/{siteId}/` URL.

When password protection is enabled, the uploader sets a password before upload. Visitors who open the hosted site must enter that password once per browser session. After successful verification, the same browser session can load the site's HTML and assets without re-entering the password. Passwords cannot be added, changed, or removed after deployment in this feature.

## Goals

- Keep the current no-password upload flow as the default.
- Let uploaders enable password protection before starting an upload.
- Require at least 4 characters for protected site passwords.
- Enforce best-effort password access in the Firebase Cloud Function that serves `/s/**` files.
- Remember successful access only for the current browser session.
- Gate hosted file requests handled by `serveSite`, including `index.html`, CSS, JavaScript, images, and direct asset URLs.
- Keep the feature lightweight and compatible with Droplo's no-account product model.

## Non-Goals

- No password editing after deployment.
- No account-based site dashboard.
- No owner/admin link flow.
- No password recovery.
- No invite lists, per-user permissions, or analytics.
- No persistent "remember me" beyond the browser session.
- No hostile-JavaScript isolation between uploaded sites on the same Firebase Hosting origin.

## Current Context

The app uploads static files to Firebase Storage under `sites/{siteId}/...` and creates a Firestore document in the `sites` collection. Firebase Hosting rewrites `/s/**` to the `serveSite` Cloud Function. `serveSite` reads files from Storage through the Admin SDK and returns them with content type and security headers.

All uploaded sites share the same Firebase Hosting origin and are separated only by path. This implementation is a best-effort password gate on that current architecture; it does not isolate protected content from malicious JavaScript running in another uploaded same-origin site.

Today, Storage read rules are public. For password protection to be meaningful, direct client reads from Storage must no longer be public; hosted files will be served through `serveSite`.

## User Experience

### Upload Page

The upload UI adds a compact password protection control near the drop zone:

- A toggle or checkbox labeled for password protection.
- The control is off by default.
- When enabled, a password input appears.
- If the password is shorter than 4 characters, upload does not start and the page shows a local validation error.
- ZIP, folder, and single HTML uploads all use the same password setting.

The existing drag-and-drop flow remains the primary interaction. Users who do not enable password protection experience the same behavior as today.

### Result Page

After a protected upload completes, the result card will show a small "password protected" hint so the uploader knows visitors need the password. The generated URL remains `/s/{siteId}/`.

### Visitor Password Page

Visitors to a protected site who have not yet authenticated see a simple password page returned by the Cloud Function. This page posts the password back to the same protected URL. It does not load the React app, because the protected site route is handled by the hosting rewrite and must protect the uploaded site's own files.

After successful verification, the visitor is redirected to the originally requested relative URL, including the query string. For example, a visitor who requested `/s/site-id/about.html?preview=1` returns to that URL after entering the correct password.

## Data Model

Site documents in Firestore gain password metadata:

- `passwordEnabled: boolean`

For unprotected sites, `passwordEnabled` is `false` or absent. The serving function treats absent password metadata as public to preserve compatibility with existing site documents.

A separate private Firestore document stores password verification data:

- Collection: `siteSecrets`
- Document ID: `{siteId}`
- Fields: `uid`, `passwordHash`, `createdAt`

`passwordHash` uses an encoded scrypt format containing the salt, work parameters, and derived hash. The plaintext password is never stored in Firestore. `siteSecrets` is not readable or writable by client SDKs; it is created and read by Cloud Functions.

## Upload Flow

1. The user chooses files and optionally enables password protection.
2. The frontend generates the `siteId` before uploading files.
3. If password protection is enabled, the frontend validates that the password has at least 4 characters.
4. If password protection is enabled, the frontend calls a callable Cloud Function with `{ siteId, password }`.
5. The callable function verifies authentication, hashes the password with scrypt, and creates `siteSecrets/{siteId}`.
6. The upload helper uploads files to Storage under `sites/{siteId}/...`.
7. The upload helper creates the public `sites` document with the existing `siteId`, `uid`, file count, total size, original name, timestamp, and `passwordEnabled`.
8. If upload fails after creating a secret, scheduled cleanup removes orphan secrets older than the normal site TTL.
9. The generated site URL stays `${origin}/s/{siteId}/`.

Password hashing happens in Cloud Functions, not in the browser. This keeps hashing implementation details centralized in trusted backend code.

## Serving Flow

`serveSite` handles all `/s/**` requests:

1. Parse and validate `siteId` and requested file path as it does today.
2. Query Firestore for the matching site metadata and detect duplicate `siteId` metadata.
3. If no matching site document exists, return `404`.
4. If more than one site document has the same `siteId`, return a generic `500` and do not read Storage.
5. If the site is not password protected, serve the requested file.
6. If the site is password protected, load `siteSecrets/{siteId}` and verify the session cookie for this `siteId`.
7. If the cookie is valid, serve the requested file.
8. If there is no valid cookie and the request is `GET`, return the password page with a form action set to the original relative URL including its query string.
9. If the visitor submits a password with `POST` and it is wrong, return the password page with a conservative error message.
10. If the visitor submits the correct password, set a session-only `HttpOnly` cookie scoped to the protected site path and redirect to the original relative URL including its query string.

The cookie name is `droplo_site_auth` and its path is `/s/{siteId}`. The cookie does not set `Max-Age` or `Expires`, so browsers treat it as a session cookie. The cookie includes `HttpOnly`, `Secure` in production, and `SameSite=Lax`. The cookie value is an HMAC signature tied to the `siteId` and private password hash, so it cannot be forged without backend-only data.

If `passwordEnabled` is true but the secret document is missing or the stored `passwordHash` is malformed, `serveSite` returns `500` with a generic internal error. This is treated as an inconsistent deployment state.

## Firestore Rules

The existing public read access to `sites` will remain because protected site documents expose only non-sensitive metadata. Password hashes are stored in `siteSecrets`, which denies all client reads and writes.

## Storage Rules

Storage client reads will be denied for uploaded site files so visitors cannot bypass `serveSite`. Writes remain authenticated, non-overwriting, and size-limited as they are today.

Cloud Functions can continue reading Storage through the Admin SDK, which is not blocked by Storage security rules.

## Error Handling

### Upload Errors

- Password protection disabled: no password validation runs.
- Password enabled with fewer than 4 characters: show a local validation error and do not upload.
- Secret creation fails: stop the upload and use the existing upload error state.
- Firestore document creation fails: use the existing upload error state.

### Visitor Errors

- Missing or expired site: return `404`.
- Duplicate public metadata for one `siteId`: return a generic internal error and do not read Storage.
- Protected site without a valid session cookie: show the password page.
- Protected site with a missing or malformed secret: return a generic internal error.
- Wrong password: show the password page with an error.
- Correct password: set the session cookie and redirect to the originally requested relative URL, including the query string.
- Missing, cleared, or invalid cookie: show the password page again.

## Security Notes

This feature provides basic protection for temporary shared previews. It is not a full authentication or authorization system.

This implementation remains on Droplo's current shared-origin Firebase Hosting path architecture. It does not isolate protected content from malicious JavaScript running in another uploaded same-origin site; strong hostile-JS isolation would require a per-site-origin or otherwise origin-isolated architecture.

Within that limitation, the Cloud Function gate provides these controls:

- Uploaded files are no longer publicly readable through client Storage APIs.
- `serveSite` checks site metadata before serving any file.
- Password hashes are stored in backend-only `siteSecrets` documents instead of public `sites` documents.
- Successful access uses a session-only, HttpOnly cookie scoped to one protected site.

Existing public sites and new unprotected sites remain publicly accessible through `/s/{siteId}/`.

## Testing Strategy

- Upload helper tests cover password disabled metadata compatibility.
- Upload helper or hook tests cover password-enabled secret creation and public metadata.
- Frontend tests cover minimum password length validation and default-off behavior.
- Cloud Function tests cover public site serving.
- Cloud Function tests cover protected site password page behavior without a cookie.
- Cloud Function tests cover wrong password rejection.
- Cloud Function tests cover correct password verification, session cookie creation, and redirect.
- Cloud Function tests cover valid cookie access to protected files.
- Firestore rules verification covers denied client access to `siteSecrets`.
- Rules verification covers denied direct client reads from `sites/{siteId}/...`.
- Regression checks cover ZIP, folder, and single HTML uploads with the same password option.

## Implementation Boundaries

Expected files to change during implementation:

- `src/types/index.ts`
- `src/hooks/useUpload.ts`
- `src/lib/upload.ts`
- `src/pages/HomePage.tsx`
- `src/components/DropZone.tsx` or a new focused password options component
- `src/components/ResultCard.tsx`
- `src/locales/en.ts`
- `src/locales/zh-TW.ts`
- `functions/index.js`
- `firestore.rules`
- `storage.rules`
- focused tests for frontend helpers and function behavior

The Cloud Functions source remains JavaScript because `functions/index.js` is explicitly outside the project's TypeScript requirement.
