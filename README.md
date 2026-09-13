# BiyaheBulacan 🗺️

Interactive Travel Directory with User Reviews and Itinerary Planning

---

## Quick Start

### 1. Create a new Vite + React project

```bash
npm create vite@latest biyahe-bulacan -- --template react
cd biyahe-bulacan
npm install
```

### 2. Replace the files

Copy the provided files into your project:

```
src/
  App.jsx   ← replace the default
  App.css   ← replace the default
```

You can delete `src/index.css` and remove its import from `src/main.jsx`.

### 3. Run the dev server

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Pages & Navigation

| Page | Route (state) | Access |
|------|--------------|--------|
| Landing | `landing` | Public |
| Login / Sign Up | `login` | Public |
| User Dashboard | `dashboard` | Logged in |
| Browse Spots | `browse` | Public |
| Spot Detail | `spot-{id}` | Public |
| My Itinerary | `itinerary` | Logged in |
| Community Feed | `feed` | Public |
| Admin Dashboard | `admin` | Admin only |

### Test Credentials (demo, no backend)
- **Regular user** → click "Log In" on the login page
- **Admin** → click "Admin Portal Login" on the login page

---

## Project Structure

```
src/
├── App.jsx          # All pages and components (single file)
├── App.css          # All styles
└── main.jsx         # Entry point (unchanged from Vite default)
```

### Components inside App.jsx

| Component | Description |
|-----------|-------------|
| `Nav` | Top navigation bar (switches between guest/user/admin) |
| `LandingPage` | Hero, features, spot preview, CTA |
| `LoginPage` | Login + Sign Up tabs |
| `DashboardPage` | User home with stats and itinerary preview |
| `BrowsePage` | Searchable/filterable spot directory |
| `SpotCard` | Reusable spot card used across pages |
| `SpotDetailPage` | Full spot info, add to itinerary, reviews |
| `ItineraryPage` | Trip builder with cost summary |
| `FeedPage` | Community posts, composer, trending sidebar |
| `AdminPage` | Admin dashboard with 4 tabs |
| `Avatar` | Initials-based avatar circle |
| `Stars` | Star rating display |
| `Toast` | Bottom-right notification |

---

## Next Steps (Backend Integration)

When you're ready to connect a real backend:

1. Replace the `SPOTS` array with an API call (`GET /api/spots`)
2. Replace `doLogin()` with a real auth request (`POST /api/auth/login`)
3. Wire `handleAddToItinerary` to `POST /api/itinerary`
4. Wire `submitReview` to `POST /api/reviews`
5. Wire `submitPost` to `POST /api/feed`
6. Admin CRUD actions already have placeholder handlers — connect to your REST endpoints

---

## Tech Stack

- React 18 (hooks only, no external state library)
- Vite
- CSS custom properties (no CSS framework)
- Google Fonts: Playfair Display + DM Sans