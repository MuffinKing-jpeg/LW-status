# LW-status

![LogixyStatus Banner](https://github.com/MuffinKing-jpeg/LW-status/blob/main/public/assets/img/baner.png?raw=true)

## Description

Lightweight, cloud-based utility for tracking state of [Logixy.net](https://logixy.net/)`s server infrastructure.

### Current developed features

- API for checking server online stats;
- Server ping check;
- Dark/snow mode;
- Reload stats button;
- Supporting mobile devices;
- Server list and config storing at Firestore.
- Player activity charts and equipment availability history (24 hours / 7 days / 30 days).

### Monitoring history

The **History** page (`/log`) reads `/api/history?days=1` (also accepts `7` and `30`).
The `collectHistory` scheduled Cloud Function records player counts from the existing
Logixy game API and TCP availability of configured equipment every 5 minutes.
Collection runs independently of website visitors. Samples are stored in the
Firestore `history` collection, with daily cleanup of records older than 30 days.
Direct client access to this collection is denied by the existing Firestore rules;
only the read-only HTTP function exposes history. Hosts and ports are not exposed
in equipment identifiers (stable hashes). Set an explicit unique `id` in each
`config/servers` entry to preserve continuity when changing its host or port.

**Deployment:**

1. Install frontend and function dependencies (`npm ci` in the root and `functions`).
2. Use a Firebase project on the **Blaze** plan with Cloud Scheduler / Pub/Sub
   enabled and the existing `config/config` and `config/servers` documents configured.
3. Run `npm run build`, then `firebase deploy --only functions,hosting`.
   This deploys `status`, `history`, `collectHistory`, `cleanupHistory` and the
   `/api/history` hosting rewrite. A currently supported Cloud Functions Node.js
   runtime is required; the repository's legacy Node 16 configuration must be
   upgraded with compatible Firebase dependencies before deploying to Firebase.
4. Wait for the first scheduled measurement (up to 5 minutes). Historical data
   before deployment cannot be reconstructed; the UI shows an empty state.

For local development, use the existing Firebase emulators and Angular dev server.
The Functions emulator does not trigger schedules automatically: invoke
`collectHistory()` in the Firebase Functions shell to collect a sample into the
Firestore emulator. Player counts are fetched from the real game endpoint, not
the frontend dummy JSON. The history API URL is configured in `src/environments/`.

Uptime is the ratio of successful TCP checks to recorded checks, not a guarantee
of application health. Failed collectors and missing periods are excluded rather
than counted as online or offline. Coverage is shown separately. Outages are
grouped only across consecutive observations; recovery is never inferred across
gaps. Charts aggregate to at most 240 points and show per-bucket average and peak
on hover. Tests: `npm test -- --watch=false --browsers=ChromeHeadless`.

### Update history

- __Mid of 2021__ First usable version.
- __End of 2021__ Better design (*sort of* ).
- __24.02.2022__ __*__WAR IN UKRAINE__*__
- __16.03.2022__ Implemented use of Firestore. *Update your server list and config faster!*
- __22.08.2022__ Implemented asynchronous ping in API.
- __16.10.2022__ Through pain and tears Angular version of service is available!
- __30.01.2024__ Mograte to logixy.net

###### See ya in peace \#nowar
