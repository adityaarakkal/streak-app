// Pure streak logic (no Firebase / React) so it can be unit-tested.

export const STUDY_GOAL_SECONDS =
  (Number(process.env.NEXT_PUBLIC_STUDY_GOAL_MINUTES) || 120) * 60;

/** Local-calendar date as "YYYY-MM-DD" (not UTC, so midnight matches the user's day). */
export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Shift a "YYYY-MM-DD" key by a number of days (negative = past). */
export function shiftKey(key, days) {
  const [y, m, d] = key.split("-").map(Number);
  return dateKey(new Date(y, m - 1, d + days));
}

export function emptyDay(key) {
  return { date: key, studySeconds: 0, gymDone: false };
}

/** A day counts toward the streak when BOTH goals are done. */
export function isDayComplete(day, goalSeconds = STUDY_GOAL_SECONDS) {
  return day.studySeconds >= goalSeconds && day.gymDone;
}

/** Streak to DISPLAY: it is alive only if you completed today or yesterday. */
export function currentStreak(profile, todayKey) {
  if (!profile || !profile.lastCompleted) return 0;
  const alive =
    profile.lastCompleted === todayKey ||
    profile.lastCompleted === shiftKey(todayKey, -1);
  return alive ? profile.streak : 0;
}

/** Record today as completed. Idempotent; a gap of more than one day restarts at 1. */
export function completeDay(profile, todayKey) {
  if (profile.lastCompleted === todayKey) return profile;
  const continues = profile.lastCompleted === shiftKey(todayKey, -1);
  return { streak: continues ? profile.streak + 1 : 1, lastCompleted: todayKey };
}

export function formatHMS(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}
