# Monitoring administration

The `/admin` page manages the configuration currently used by monitoring:

- `config/servers`: add, rename, edit host/port/icon, pause and remove equipment;
- `config/config`: TCP timeout (100–10000 ms) and additional configuration JSON;
- the latest 20 successful edits in the server-written `adminAudit` collection.

Unknown legacy fields on each device and on the `config/servers` document are
retained. Existing settings appear in the JSON editor (excluding timeout, which
has its own input). This is not a general-purpose Firestore document editor:
news, raw history, admin membership and unrelated collections are not editable.

## Authentication and permissions

Sign-in uses Firebase Authentication's Email/Password REST API. Passwords go
directly over HTTPS to Google, never to the monitoring backend. There is no
registration or permission-granting endpoint in the app. A valid Firebase
account is **not** enough: every admin API request checks both the ID token
(including revocation/disabled-account checks) and `admins/<Firebase Auth UID>`
with the boolean field `enabled: true`.

The Web API key in `src/environments/firebase-client.ts` is a public Firebase
project identifier, not a service-account credential. Check the project's API
key restrictions if sign-in is denied. Do not put private keys in environments.
For a different Firebase project, replace this public Web API key and update the
project ID, API URLs and allowed admin origins in `functions/admin-api.js`.

Session tokens are held only in memory. They are not written to localStorage,
sessionStorage, cookies or URLs; refresh tokens are not retained. Sessions expire
within an hour. Full page reload requires signing in again; navigation inside the
app keeps the current in-memory session. Do not share an admin account. Configure
a strong Firebase password policy (for example at least 12 characters), enable
email-enumeration protection and use a password manager. This version does not
implement MFA; use an appropriately configured identity provider/MFA before
extending it to higher-risk administration.

All admin responses are `no-store`. Writes require a JSON body and Bearer token.
Requests from unsupported browser origins are rejected. There are no cookie-based
sessions, so cross-site requests cannot automatically attach admin credentials.

## First administrator: one-time Firebase Console setup

1. Deploy the code **and the restrictive Firestore rules** described below
   **before enabling any new sign-in provider**. The old broad rules must not
   remain active when new Firebase accounts can be created.
2. Open **Authentication → Get started** if authentication is not initialized.
3. Under **Sign-in method**, enable **Email/Password**. Email-link login is not
   required. Do not enable any additional providers just for this feature.
4. Under **Users → Add user**, create a dedicated account with a strong password.
   Copy its **UID**, not the email address.
5. In **Firestore Database → Data**, create collection `admins`, document with
   that exact UID, field `enabled` of type **boolean** with value **true**.
   Optionally add an `email` string for human reference (authorization uses UID).
6. Sign in at
   `https://status.logixy.net/admin` with that account.

Only a trusted project administrator can grant membership. Public clients cannot
create, read or change membership documents under the supplied security rules.
Never grant access based only on an email supplied by the frontend.

Additional accounts follow the same process. To revoke access, set `enabled` to
false or delete the membership document; the next admin request is denied.
Disabling/deleting a Firebase Auth account also blocks access.

### Optional access-management script

From a trusted Cloud Shell/project-administrator environment with Application
Default Credentials (Firebase CLI login alone is not always enough for the Admin
SDK), Node 22 and installed function dependencies:

```sh
export GOOGLE_CLOUD_PROJECT=lw-status
node functions/scripts/admin-access.js grant admin@example.com
node functions/scripts/admin-access.js revoke admin@example.com
```

The Firebase Auth user must already exist. Revocation also revokes Firebase
refresh tokens. Access changes are recorded in the private `adminAccessAudit`
collection. The script is not an HTTP endpoint. If ADC is missing, configure it
using `gcloud auth application-default login` in your trusted environment, or use
the Firebase Console steps above. Do not download/share service-account keys to
sign into the web UI.

## Deployment

After building the Angular site and switching to Node 22 for Firebase CLI:

```sh
npx --yes firebase-tools@15.34.2 deploy --only functions,hosting,firestore:rules --project lw-status
```

This includes the new `adminApi` function, its `/api/admin` Hosting rewrite, and
the rules that prevent direct client writes to configuration. Deploying only the
frontend is insufficient. The production GitHub workflow includes all three
targets and backend/frontend tests. Its service account must also have permission
to release Firestore rules (Firebase Rules), in addition to its existing deployment
permissions. Preview deploys never change rules or backend functions.
The `adminApi` runtime service account needs Firestore access and Firebase Auth
user-read permission for revoked/disabled-account checks. An IAM failure is
reported as a service error, not as a bad password.

The old rules allowed **any** authenticated user to edit configuration. The new
rules deny direct client access to `config`, `admins`, `adminAudit`,
`adminAccessAudit` and `history`; the Admin SDK accesses them on the server.
Public news reads are unchanged; news writes now require enabled membership.
Check any other external clients that depended on the old broad config access.

### Local development

Run the Functions/Firestore emulators and `npm start`, then visit
`http://localhost:4200/admin`. `ADMIN_API_URL` in the development environment
points to `http://localhost:5001/lw-status/us-central1/adminApi`.
Admin login still uses the **real project's Firebase Authentication**, not the
history demo or an authentication emulator. Seed `admins/<UID>` and config
documents in the **Firestore emulator** to authorize that user locally. Never
point local development at a production write endpoint unintentionally.

## Save behavior

- The public status endpoint reads fresh config on each request; history uses
  the new settings at its next five-minute collection.
- Paused equipment is omitted from checks rather than recorded as offline.
- Legacy device IDs are derived from the original host/port before their first
  edit; saving persists that ID. Editing the host or port then retains the same
  history hash. New devices receive random IDs. IDs are deliberately not editable.
- Removing a device hides it from History for all periods, including its outages
  and contribution to equipment summaries. The API filters past observations
  against the current inventory. Stored samples are not physically deleted;
  normal 30-day cleanup still applies. Recreating it as a new device starts a
  separate identity. Pausing a configured device keeps its history visible.
- Newly configured devices appear in History immediately after refreshing, with
  no-data segments until their first scheduled observation. History responses
  are not cached, so refresh reflects inventory changes immediately.
- Both configuration documents are saved in one Firestore transaction together
  with an audit entry. Nanosecond-precision document revisions reject stale edits
  with HTTP 409 instead of silently overwriting another administrator's changes.
- Conflicting/failed saves keep local edits. Reloading warns before discarding
  them. Search only filters the view; hidden devices are still saved.
- Audit entries identify the authenticated author, changed device IDs and settings
  keys, without recording passwords, tokens or full configuration values.

## Checks

```sh
# Node 22; backend authorization, validation and transaction tests:
npm test --prefix functions
# Legacy Angular toolchain; Chrome is required:
node node_modules/@angular/cli/bin/ng.js test --watch=false --browsers=ChromeHeadless
```

Backend tests use an isolated mock Firestore/Auth implementation. They do not
write to the live project. They do not replace testing deployed Firestore rules
and real Firebase Auth setup in a staging/emulator environment.
