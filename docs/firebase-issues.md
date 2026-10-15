# Firebase issues and handoff

This document records the remaining Firebase work for BiyaheBulacan. It is a
handoff for the Firebase project owner and the developer maintaining the app.
It does not mean that the production rules, indexes, functions, or data have
been changed.

## What is blocking the system now

The app now connects to Firebase project **`byahe-bulacan-v2`**, as selected by
the owner. The previous configuration used `biyahe-bulacan`; earlier access
findings below refer to that project. Access to v2 and its deployed services
still needs verification.

Google Maps and Firebase are separate services. The Google Maps API key enables
map and routing requests. Firebase stores accounts, destinations, reviews,
posts, itineraries, local commuting guides, and reports. Adding Google Maps
variables in Vercel cannot change Firebase permissions or publish Firestore
rules.

The immediate blocker is the local commuting-guide query. During the
investigation on **14 October 2026**, an unauthenticated query using the same
destination/status/verification filters as the application returned:

```text
HTTP 403
PERMISSION_DENIED
Missing or insufficient permissions.
```

This confirms that public guide reads were rejected at the time of the check.
It does not establish the exact deployed rule contents or whether the guide
index exists. Those require authorized access to the Firebase project.

## Status and responsibility

| Issue | Evidence / status | What is needed |
| --- | --- | --- |
| Access to the production project | User reports no access | Project owner grants the necessary permissions or performs deployment |
| App and CLI point to different projects | Confirmed in repository files | Owner confirms the intended project and aligns configuration |
| Local guides fail to load | Confirmed live `PERMISSION_DENIED` | Owner investigates deployed rules and applies reviewed commuting rules |
| Commuting index readiness | Index definition exists locally; live status unverified | Deploy/check index and wait until ready |
| Local transport instructions | Publishing tools exist; actual guide coverage unverified | Administrator supplies and verifies real journeys |
| Application admin roles | Depend on Firestore profile records | Owner verifies/bootstrap legitimate admin profiles |
| Account/profile consistency | Recovery exists but has gaps | Developer distinguishes missing profiles from failed reads and tests recovery |
| Itinerary persistence and restoration | Confirmed implementation gaps | Developer changes saving, querying, restoration, and deletion |
| Like/comment counters | Confirmed separate read/write operations | Developer adds atomic updates and stronger rule validation |
| Review aggregate ratings | Review creation does not update destination totals | Developer implements consistent aggregate updates |
| Premium updates | Backend incomplete in checked-in source; deployment unverified | Owner and developer configure and verify the payment-to-Firestore flow |
| Remaining rules and data validation | Local rules reviewed; live equivalents unknown | Developer tests and tightens validation before owner deployment |
| End-to-end verification | New automated tests mock Firebase/provider calls | Owner enables live checks or developer adds emulator coverage |

## 1. Project ownership and access

### Why this matters

There are three different kinds of access:

| Access | What it permits |
| --- | --- |
| Vercel project access | Deploy the website and set its build variables |
| Firebase / Google Cloud project permissions | Manage Firebase rules, indexes, Authentication, functions, and project configuration according to the assigned role |
| App admin role in `users/{uid}` | Use the website's destination and commuting administration tools |

Being an administrator inside the website does not grant Firebase Console or
CLI deployment access. Possessing the browser Firebase configuration or a
Google Maps key does not grant project administration rights either.

### Owner action

Identify the owner of `byahe-bulacan-v2`. They can either:

1. Deploy the reviewed rules and indexes themselves; or
2. Invite the maintainer's Google account and grant permissions appropriate for
   managing Firestore rules/indexes and any other agreed services.

The owner can manage access through Firebase project settings **Users and
permissions**, or Google Cloud IAM. Grant only the access required for the work.
Signing into the CLI is not enough if the account has no project permissions.

The local Firebase CLI also failed its project-listing check with an HTTP 401
diagnostic. An authorized maintainer should reauthenticate before deployment.
The exact cause of that CLI authorization failure was not established.

## 2. Project targets aligned in source

The repository currently contains:

| File | Target |
| --- | --- |
| `src/services/firebase.js` | `projectId: "byahe-bulacan-v2"` |
| `.firebaserc` | Default CLI project: `byahe-bulacan-v2` |
| `firebase.json` | References `firestore.rules`, `firestore.indexes.json`, and the `functions` source directory |

The app configuration and CLI default now target the same project. Redeploy
the website to apply this configuration to the hosted app.

### Required resolution

The owner selected `byahe-bulacan-v2` and supplied its web app configuration.
Changing configuration does not migrate accounts or records from
`biyahe-bulacan`. Confirm the required users and data exist in v2, and deploy
rules, indexes, and functions explicitly to `byahe-bulacan-v2`.

The Firebase functions use `admin.initializeApp()`, so their database target
follows the environment in which the owner deploys them. Deploying the webhook
to the wrong project could upgrade users in a different database, or fail to
find their profiles.

## 3. Commuting-guide permissions and deployment

### Current behavior

`src/services/commuteService.js` requests guides with all three filters:

```text
spotId == selected destination ID
status == "published"
verified == true
```

The app distinguishes a failed request from an empty result:

- **Local guides could not be loaded** means the request failed.
- **No verified local commuting guide has been published** means the request
  succeeded but there were no matching guides.

The first message is the current reported Firebase problem. Supplying more
content will not fix a rejected read until the permissions problem is resolved.

### Rules already prepared in the repository

`firestore.rules` defines these intended permissions:

| Collection | Intended access |
| --- | --- |
| `commuteGuides` | Visitors read only published, verified guides; app admins read drafts and create/update/delete guides |
| `commuteReports` | Signed-in travelers create open reports for published guides; app admins read and resolve reports |

These definitions are local source files. Pushing to GitHub or deploying Vercel
does not publish them to Firestore.

### Owner deployment steps

First inspect/back up the current deployed rules and review the complete local
rules file. A rules deployment replaces the deployed ruleset; it does not
automatically merge only the new collection sections. Preserve any legitimate
production collections or conditions that are not represented in this checkout.

Then, from an authorized account:

```powershell
cd C:\Users\12DOM03\byahebulacan
firebase login --reauth
firebase deploy --only firestore:rules,firestore:indexes --project byahe-bulacan-v2
```

Use this project ID only after confirming it is the intended production target.
If a compatible Firebase CLI is not installed, the owner should install it using
the official CLI instructions.

If permissions still fail after deployment, check the exact Firebase error,
the selected database/project, the request's authentication state, and any
enforced App Check configuration. App Check enforcement was not inspected and
is not a confirmed cause. The app currently does not initialize App Check.

## 4. Commuting index

`firestore.indexes.json` contains the `commuteGuides` collection index for:

```text
spotId ASCENDING
status ASCENDING
verified ASCENDING
```

The owner must verify the index exists and is ready in the same project as the
app. Index creation can take time. A permission error and a missing-index error
are different problems; the live permission failure prevented confirmation of
the query's full index requirements/readiness.

After permissions work, an index-related error should be investigated using
Firebase's exact diagnostic rather than treated as a lack of commuting content.

## 5. Real commuting data still needs to be entered

The administration and publishing workflow is implemented. It does not seed or
invent real jeepney/bus routes.

Once Firebase permissions work, an app administrator should use **Admin Center
> Commuting** to publish checked journeys containing:

- An existing destination and a named starting hub/terminal.
- Ordered transport/walking steps.
- Vehicle/route signboards, boarding points, alighting points, and landmarks.
- Transfer instructions and final walking/entrance instructions.
- Verification source and date.
- Fare ranges, duration estimates, and boarding/landmark coordinates when known.

Drafts must remain private. Publishing requires explicit confirmation; changing
instructions resets that confirmation. Published guides can be saved as drafts
to unpublish them. Traveler reports require sign-in and are reviewed by admins.

Google returning **No transit route was found** is separate from Firebase guide
loading. Fixing Firestore permissions does not add coverage to Google's transit
database. Local guides provide the checked information that Google may not have.

## 6. Administrator accounts and profile recovery

The local `isAdmin()` rules function checks the signed-in user's Firestore
profile at `users/{uid}` for `role == "admin"`. The React app reads the same role
to decide which interface to display.

### Owner checks

- Confirm legitimate admins have a Firebase Authentication account and a
  matching `users/{uid}` record with the correct UID and role.
- Bootstrap the first admin through a trusted owner/admin process. Regular
  users must not be allowed to promote themselves through browser writes.
- Verify email/password Authentication is enabled and production domain settings
  are appropriate for the Authentication flows in use.
- Check that normal users can read and update their own permitted profile fields,
  while admin role and premium fields remain protected.

### Remaining code issue

Signup creates the Authentication account before writing the Firestore profile.
If that second operation fails, the Authentication account can exist without a
profile. `useAuth.js` includes repair on explicit sign-in, but
`fetchUserProfile()` returns `null` both for a genuinely absent document and for
a failed read. A denied read should not be treated as proof that a profile is
missing.

Session restoration also substitutes an empty profile when it cannot read the
record. This can present a real admin/premium user as a regular user until the
profile becomes available.

**Developer work:** distinguish not-found, permission, and network failures;
repair only confirmed missing profiles; preserve existing roles/premium state;
and show a recoverable profile-loading error rather than silently assuming a
regular account.

## 7. Itinerary saving and restoration

These are code issues in addition to any deployment issues:

1. `saveItinerary()` uses `addDoc()` every time, creating another record instead
   of updating the same saved trip.
2. It stores `userId`, `tripName`, `spots`, fee totals, and timestamps, but not the
   trip date, checklist, minimum stop gap, or completion metadata as separate
   trip fields.
3. `getUserItinerary()` reads the entire collection and filters by `userId` in
   the browser. Under the local owner-only read rules, a normal user's
   collection-wide query cannot be authorized just because the browser later
   filters its results. Security rules do not act as result filters.
4. That fetcher is not wired into login/session restoration. `setItineraries()`
   exists in app context but is not called by a database-loading flow.
5. The UI's trip deletion removes in-memory state, not the saved Firestore record.

**Developer work:** design stable trip IDs (or user-owned trip subcollections),
save the complete trip metadata, query by ownership, restore trips into context
after login, and connect updates/deletion to the database. Test refresh and
cross-user isolation. Existing saved records may need migration to the new shape.

## 8. Community counters and review totals

### Likes and comments

`likePost()`, `unlikePost()`, `addComment()`, and `deleteComment()` perform separate
record and counter writes. They read the current count and then write a new
number. Concurrent requests can overwrite each other's updates, and a partial
failure can leave a record and its displayed counter out of sync. Repeating a
like request can increase a count even when the deterministic like record
already exists.

**Developer work:** use transactions/batched writes as appropriate, atomic
increments where safe, and idempotent like/unlike behavior. Ensure counter changes
correspond to real record changes and cannot produce negative totals.

### Destination ratings

`addReview()` creates a review but does not update the destination's `rating` or
`reviews` aggregate fields. Destination cards can therefore show stale totals
after a new review is submitted.

**Developer work:** calculate aggregates from trusted review records or maintain
them using a verified backend/transactional design, including edits and deletions.

## 9. Remaining security-rule validation work

The checked-in rules enforce several ownership boundaries, but require further
review beyond deploying the commuting additions:

- Ordinary signed-in users can update the `likes` and `comments` fields on any
  post. The current rule limits field names but does not enforce numeric types,
  non-negative values, or correspondence with actual like/comment records.
- Review/comment update rules authorize the existing owner without explicitly
  making ownership and parent references immutable. Add field/type validation
  and restrict which values an owner can change.
- Validate review star ranges, text lengths, required fields, and ownership on
  creation. Browser validation alone does not protect direct database requests.
- Decide the public visibility policy for posts, reviews, and comments. Current
  local rules make them publicly readable.
- `likes` are readable by any signed-in account under the current local rules;
  decide whether other users' like records should be visible.
- Consider read limits and consistent schemas for private itineraries and user
  profiles.
- Deleting a destination currently deletes its spot document only. Review
  related reviews, commuting guides, and stored trip references so deleted
  destinations do not leave confusing published records behind.

These are source-review findings. The deployed rules could differ, so the owner
must compare both versions before deciding what to deploy. Test guest, normal
user, owner-of-record, and admin behavior with the Firestore emulator.

## 10. Firebase premium/payment backend

The current browser code in `src/App.js` does **not** grant premium based solely
on `?payment=success`. It displays a verification message instead. The remaining
premium work is in the trusted backend and profile refresh flow.

The checked-in `functions/index.js` still has:

- A placeholder PayMongo secret, rather than configured server-side credentials.
- Localhost redirect URLs in the Firebase checkout function.
- A webhook that reads the request body and updates `users/{uid}.isPremium`
  without implementing signature verification in the checked-in source.
- No explicit method/payload validation or processed-event tracking.
- A success response even if the Firestore upgrade write fails, which needs a
  deliberate retry/reconciliation strategy.

The Vercel checkout endpoint and Firebase checkout function are separate
implementations. The app currently calls `/api/checkout`, while the Firestore
premium updater lives in the Firebase webhook source. The owner must verify
which backend is actually deployed and whether PayMongo is configured to call
the correct endpoint. The Vercel checkout source also contains a production
redirect domain different from the currently reported website.

**Owner/developer work:** confirm the intended Firebase project and runtime,
configure server secrets, authenticate checkout requests, validate successful
payments and webhook signatures against current provider documentation, handle
replays/retries, and upgrade the correct user's profile. Never solve payment
updates by granting normal clients permission to write `isPremium`.

The frontend reads the profile on login/auth-session restoration and has no
Firestore profile listener. A webhook update can therefore require a refresh
before the active UI sees premium access. Add a controlled profile refresh or
listener and verify the update after a payment has been confirmed server-side.

No live payment, Cloud Functions deployment, or Firebase premium upgrade was
verified during this work.

## 11. Errors, old records, and verification limits

Several existing fetchers in `spotService.js` catch errors and return `[]` or
`null`. This can make a permission/network failure look like an empty database
or missing record. The new commuting UI distinguishes those outcomes, but the
older screens need the same treatment.

Reviews, posts, and comments query with `orderBy("createdAt")`. Documents without
that field do not appear in such ordered queries. The owner should audit legacy
records and backfill timestamps where appropriate rather than deleting records
that appear to be missing from the UI.

The new feature's 71 targeted tests and production build passed, but Firebase
calls in these tests are mocked. They do not verify live IAM permissions,
deployed rules, live index status, App Check, real record migration, or payment
webhooks. Those checks remain outstanding.

Diagnostic logs such as `firebase-debug.log` can contain sign-in details. Keep
them out of commits and public handoffs. This document contains no account
tokens, API-key values, or server secrets.

## If access to the existing project cannot be obtained

A separate Firebase project is an option, but it is a migration, not a rules-only
fix. Before changing the app's target:

1. Create an owned project and register its web app.
2. Enable the required Authentication provider and create Firestore.
3. Replace the complete Firebase web configuration and align the CLI target.
4. Deploy reviewed rules/indexes and bootstrap a legitimate app administrator.
5. Plan migration of users/profiles, destination IDs, reviews, posts, itineraries,
   premium entitlements, commuting guides, and reports. Preserve relationships
   based on Firebase UIDs and document IDs, or explicitly map changed IDs.
6. Reconfigure any payment backend/webhooks for the new project.
7. Verify the new environment before switching production traffic.

Existing Authentication accounts, passwords, profiles, and Firestore records
will not transfer just because the configuration changes. Export/import access
and a migration plan are needed; if the original owner cannot provide them, some
accounts/data may have to be recreated through an agreed process.

## Recommended progression for the owner and developer

1. Confirm project ownership and the intended production project.
2. Restore authorized CLI access; compare local and deployed rules.
3. Deploy the reviewed commuting rules/index to the correct project.
4. Verify guest guide reads, draft privacy, admin publishing, and traveler reports.
5. Publish checked local commuting content and confirm it persists after reload.
6. Address account recovery, itinerary persistence, counters, ratings, and rule
   validation with targeted tests.
7. Configure and verify the premium backend separately before relying on payments.
8. Complete emulator and live verification, document backups/migration, and hand
   project access to the ongoing maintainer.

## Acceptance checks

- [ ] Project owner and authorized maintainers are identified.
- [ ] App, CLI, rules/index deployment, and functions target the intended project.
- [ ] Guest users can read only published, verified commuting guides.
- [ ] Draft guides and reports are inaccessible to unauthorized users.
- [ ] A normal signed-in user can report a published guide as themselves.
- [ ] An app administrator can create/edit/publish/unpublish guides and review reports.
- [ ] Empty guide results show the empty state, rather than a permission error.
- [ ] Accounts and profiles survive signup/login/session restoration consistently.
- [ ] Saved itineraries reload correctly and remain isolated between users.
- [ ] Likes, comments, and review totals remain correct under concurrent actions.
- [ ] Premium changes follow verified server-side payment events.
- [ ] Deletion/migration processes preserve or intentionally handle related records.
- [ ] Live/emulator checks complement the existing mocked unit tests.

## Relevant repository files

- [Firebase client configuration](../src/services/firebase.js)
- [CLI project target](../.firebaserc)
- [Firebase deployment configuration](../firebase.json)
- [Firestore rules](../firestore.rules)
- [Firestore indexes](../firestore.indexes.json)
- [Account/profile logic](../src/hooks/useAuth.js)
- [Destination/community/itinerary services](../src/services/spotService.js)
- [Commuting services](../src/services/commuteService.js)
- [Firebase payment functions](../functions/index.js)
- [Vercel checkout endpoint](../api/checkout.js)
- [Google Maps and commuting setup](google-maps-setup.md)

## Official references

- [Firebase project access and roles](https://firebase.google.com/docs/projects/iam/overview)
- [Firebase CLI setup](https://firebase.google.com/docs/cli)
- [Queries and security rules](https://firebase.google.com/docs/firestore/security/rules-query)
- [Managing Firestore indexes](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Transactions and batched writes](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Ordering and limiting queries](https://firebase.google.com/docs/firestore/query-data/order-limit-data)
- [Testing Firestore rules](https://firebase.google.com/docs/firestore/security/test-rules-emulator)
