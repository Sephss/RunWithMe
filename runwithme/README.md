# RunWithMe 🏃❤️

> **Every Step Together** — A private fitness journey app for couples.

## Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, ES6+ Modules (no frameworks)
- **Auth**: Firebase Authentication (Email/Password)
- **Database**: Firebase Realtime Database
- **Hosting**: Vercel
- **Charts**: Chart.js
- **Architecture**: Single Page Application (SPA) with `history.pushState` routing

---

## Project Structure

```
runwithme/
├── index.html              # SPA shell (single entry point)
├── vercel.json             # Vercel SPA rewrite rules
├── database.rules.json     # Firebase security rules
├── css/
│   ├── main.css            # Design system, tokens, utilities
│   ├── auth.css            # Login & register styles
│   └── dashboard.css       # Dashboard layout & components
└── js/
    ├── app.js              # Entry point, router setup, auth guard
    ├── router.js           # SPA router (history.pushState)
    ├── firebase.js         # Firebase initialization (SDK v10+)
    ├── auth.js             # Auth: login, register, logout, state
    ├── auth-views.js       # Login, register, pairing screen renderers
    ├── couple.js           # Couple create/join/watch
    ├── activities.js       # Log, fetch, stats, streaks
    ├── goals.js            # Goals, messages, achievements, motivation
    ├── views.js            # All dashboard view renderers
    └── ui.js               # Toast, modal, loading, format helpers
```

---

## Firebase Database Schema

```
/users/{uid}
  name, email, uid, createdAt, coupleId, weeklyGoal

/couples/{coupleId}
  code            # "RUN-4J8KQ2"
  createdAt
  members/
    {uid}: { name, joinedAt }
  sharedGoal: { target, title, updatedAt }
  totalDistance
  totalActivities

/activities/{coupleId}/{uid}/{activityId}
  id, uid, coupleId, type, distance, duration,
  pace, notes, date, createdAt

/messages/{coupleId}/{msgId}
  uid, name, text, sentAt

/goals/{coupleId}/{uid}/weekly
  target, updatedAt

/achievements/{coupleId}/{uid}
  {achievementId}: { unlockedAt }
```

---

## Setup

### 1. Firebase

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication → Email/Password**
3. Create a **Realtime Database** (start in test mode, then apply rules)
4. Copy your config into `js/firebase.js`
5. Upload `database.rules.json` rules in Firebase console → Realtime Database → Rules

### 2. Deploy to Vercel

```bash
# Install Vercel CLI (optional)
npm i -g vercel

# From project root
vercel deploy
```

Or drag-and-drop the folder into [vercel.com/new](https://vercel.com/new).

The `vercel.json` handles SPA routing (all paths → `index.html`).

---

## Features

| Feature | Status |
|---|---|
| Email/Password Auth | ✅ |
| Couple pairing (create + join code) | ✅ |
| Activity logging (walk/jog/run) | ✅ |
| Auto pace calculation | ✅ |
| Daily/weekly/monthly stats | ✅ |
| Streak tracking | ✅ |
| Weekly goal with progress | ✅ |
| Shared couple goal | ✅ |
| Daily motivation messages | ✅ (50+ messages) |
| Encouragement messages (realtime) | ✅ |
| Activity history with filters | ✅ |
| Shared calendar with color indicators | ✅ |
| Achievement badges (12 total) | ✅ |
| Dark sports-couple theme | ✅ |
| Responsive (mobile/tablet/desktop) | ✅ |
| SPA routing (history.pushState) | ✅ |
| Firebase SDK v10+ modular | ✅ |

---

## Couple Flow

1. **Person A** registers → goes to pairing screen → clicks "Create Couple" → gets code e.g. `RUN-4J8KQ2`
2. **Person B** registers → goes to pairing screen → clicks "Join Couple" → enters `RUN-4J8KQ2`
3. Both are now linked. Dashboard unlocks for both users.

---

## Design System

Colors:
- Night:   `#08081A`
- Violet:  `#7C3AED`
- Pink:    `#EC4899`
- Card:    `#12122E`

Typography: `Outfit` (display + UI) + `Inter` (numbers/data)

Signature: Pulsing dual-ring heartbeat animation on auth screens
