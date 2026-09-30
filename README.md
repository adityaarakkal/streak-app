# Streak

A daily habit tracker with Google sign-in. Finish **both** goals each day — study for 2 hours and go to the gym — to extend your streak. Miss a day and it resets. A leaderboard shows the longest active streaks.

## Features
- **Google sign-in** (Firebase Auth) that persists across page refreshes
- **Study timer** with progress bar; autosaves every 30 s and stops automatically at the daily goal
- **Gym check-in**, saved per day
- **Streak logic:** a day counts only when both goals are done; consecutive days extend the streak; a missed day resets it; completing the same day twice never double-counts
- **Real leaderboard** of top active streaks, read from Cloud Firestore
- **Firestore security rules:** users can only write their own profile, and a streak can rise by at most 1 per write

## Tech stack
Next.js (App Router), React, Tailwind CSS v4, Firebase Auth, Cloud Firestore.

## Run locally
```bash
npm install
cp .env.example .env.local     # then fill in your Firebase values
npm run dev                    # http://localhost:3000
npm test                       # unit tests for the streak logic
```
Tip: set `NEXT_PUBLIC_STUDY_GOAL_MINUTES=1` in `.env.local` to test a full day quickly.

## Firebase setup (one time)
1. [Firebase console](https://console.firebase.google.com) → create a project → add a **Web app** and copy its config into `.env.local`.
2. **Authentication → Sign-in method** → enable **Google**.
3. **Firestore Database** → create a database.
4. **Firestore → Rules** → paste the contents of [`firestore.rules`](firestore.rules) → **Publish**.
5. When you deploy (e.g. Vercel), add the deployed domain under **Authentication → Settings → Authorized domains**, and add the same env variables in the host's settings.

## How it is structured
```
app/streak.js      pure streak/date logic (unit tested, no Firebase/React)
app/page.js        UI, auth state, Firestore reads/writes
app/firebase.js    Firebase init from env variables
firestore.rules    security rules
tests/             node:test unit tests
```

## Limitations
- Dates come from the user's device clock, so a determined user could cheat; rules only cap how fast a streak can grow. A production version would use server timestamps (Cloud Functions).
- The day rolls over at local midnight; refresh the page after midnight.
- The timer only counts while the tab is open (time is saved at least every 30 s).

## Author
Aditya Arakkal — Computer Engineering, FrCRCE Mumbai. [LinkedIn](https://linkedin.com/in/aditya-arakkal)

## License
MIT
