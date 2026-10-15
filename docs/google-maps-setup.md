# Google Maps and commuting setup (Phases 1 and 2)

Destination pages now show an interactive location map. Itinerary pages show
numbered destination pins; **View Map** focuses a stop inside the page. Admins
can click a map, drag the pin, or enter coordinates and confirm the visitor
location. Existing destinations remain unverified until an admin reviews them.
The same panel includes driving, walking, and Google transit directions, and
verified local commuting guides under **Commute**.

## Google Cloud and Vercel setup

1. Create or select a Google Cloud project and enable billing.
2. Enable **Maps JavaScript API** and **Routes API**. Routing uses the supported
   Maps JavaScript Routes library directly in the browser. Separate Places,
   Geocoding, and server routing keys are not required for the current UI.
3. Create a browser API key. Under application restrictions, select **Websites**
   and allow the actual production URL, approved Vercel preview URLs, and
   `http://localhost:3000/*` for local development. Restrict the key to
   **Maps JavaScript API** and **Routes API**. Avoid allowing all Vercel domains.
4. Create a **JavaScript map ID** for advanced markers. The built-in
   `DEMO_MAP_ID` fallback is for evaluation; use your map ID in production.
5. Add these variables in Vercel's project settings for the environments you
   deploy to, then rebuild/redeploy:

   ```text
   REACT_APP_GOOGLE_MAPS_API_KEY=<restricted browser API key>
   REACT_APP_GOOGLE_MAPS_MAP_ID=<JavaScript map ID>
   ```

   For local development, put these values in ignored `.env.local`, following
   `.env.example`, and restart the development server. Do not put real values
   into `.env.example` or commit them.
6. Configure request quotas and billing alerts in Google Cloud. Alerts are
   notifications, not spending caps. Maps load only on destination, populated
   itinerary, and admin pin-picker screens. One SDK download is shared across
   components, but each map instance may incur its own map-load charge. Routes
   are requested only when the traveler presses **Show route** or **Find transit
   route**. No repeated GPS routing or background requests are performed.

The browser key is intentionally visible in the built JavaScript. HTTP-referrer
and API restrictions protect its usage; it is not a server secret.

## Destination review

- Review each destination in Admin > Spots. Zoom to the entrance, parking area,
  or drop-off point and click to place the pin. Choose what the pin represents,
  add a useful entrance/landmark description, and check the confirmation box.
- Moving the pin, editing coordinates, or changing the location description
  resets the confirmation. Confirm again before saving.
- Unknown locations can have both coordinates blank. The app stores `null`
  and displays an unavailable state instead of substituting a default pin.
- A single missing coordinate or an out-of-range value blocks saving.
- Legacy coordinates, including any historical default pins, are not silently
  corrected or considered verified. Review them manually.

## Verification

```powershell
$env:CI = 'true'
npm test -- --watchAll=false --runInBand --testPathPattern='coordinates.test|googleMaps.test|DestinationMap.test|spotService.location.test|routeService.test|commuting.test|commuteService.test|TravelPlanner.test|CommuteHelper.test|CommuteAdmin.test'
npm run build
```

With a configured key, check a real destination and an itinerary on desktop and
mobile: pan/zoom, fullscreen, numbered pins, stop focus, marker details, empty
locations, dark mode, and an administrator placing/dragging/saving a pin. Verify
that reopening the destination uses the saved numeric coordinates and its
verification status. Check missing keys, blocked scripts, and key restrictions.
Test manual addresses, denied location access, driving/walking/transit results,
changing destinations during a request, and starting from a previous itinerary
stop. Provider warnings and returned boarding/alighting details are displayed.

## Firebase setup for local commuting guides

The new `commuteGuides` and `commuteReports` collections require the updated
Firestore rules and guide index. Vercel deployment does **not** deploy these.
Deploy them to the same project as `src/services/firebase.js`:

```powershell
firebase deploy --only firestore:rules,firestore:indexes --project byahe-bulacan-v2
```

The runtime Firebase project and `.firebaserc` default both target
`byahe-bulacan-v2`. Use the explicit project above for deployment.
Wait for the `commuteGuides` index to finish building before testing public
guide queries.

Only administrators can write guides. Visitors can read published, verified
guides; drafts stay private. Signed-in travelers can submit reports for published
guides, and only admins can view/resolve reports.

## Creating usable local guides

1. Open **Admin Center > Commuting** and select an existing destination.
2. Name the starting hub precisely, including its municipality. The guide is
   explicitly from this hub; it does not claim to cover any arbitrary origin.
3. Add the journey's steps in order, including jeepney/bus/tricycle/walking
   connections. Every transport step needs a route/signboard, a boarding point,
   an alighting point, and an instruction. Include recognizable landmarks.
4. Optionally add boarding or landmark pins using the step's map picker or
   numeric coordinates. These represent points; the system does not invent
   transport route lines for manually curated guides.
5. Add final entrance/walking instructions, a verification source and date,
   optional total fare range, and optional duration estimate.
6. Save unfinished information as a draft. Check the verification confirmation
   and publish when the journey has been checked. Editing fields resets this
   confirmation. Saving a published guide as a draft unpublishes it.
7. Review traveler reports in the same admin tab. Correct or unpublish affected
   instructions, then mark the report reviewed. Guides checked over 90 days ago
   display a review reminder to travelers.

No real local routes are seeded: transport instructions must come from verified
operator/tourism information or checked journeys. A destination with no published
guide shows this clearly. Google transit coverage can be incomplete, so local
guides remain accessible even when no Google transit result is returned.

Check publishing validation, draft visibility with a guest account, reporting
with a regular account, admin report review, and persistence after reload on the
configured Firebase project. Automated tests mock provider and database calls;
live Google routing and Firestore permissions still need configured credentials
and deployed rules for end-to-end verification.

Live position tracking, automatic turn progression, and voice guidance remain
outside these two phases.

References:
- [Load Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/load-maps-js-api)
- [Advanced markers](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview)
- [API security](https://developers.google.com/maps/api-security-best-practices)
- [Usage and billing](https://developers.google.com/maps/documentation/javascript/usage-and-billing)
- [Routes library setup](https://developers.google.com/maps/documentation/javascript/routes/start)
