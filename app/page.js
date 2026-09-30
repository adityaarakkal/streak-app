"use client";

import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import {
  collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc,
} from "firebase/firestore";
import { auth, provider, db } from "./firebase";
import {
  STUDY_GOAL_SECONDS, completeDay, currentStreak, dateKey, emptyDay, formatHMS, isDayComplete,
} from "./streak";

const NEW_PROFILE = { streak: 0, lastCompleted: null };

export default function Home() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState(NEW_PROFILE);
  const [day, setDay] = useState(() => emptyDay(dateKey()));
  const [startedAt, setStartedAt] = useState(null); // ms timestamp while the timer runs
  const [now, setNow] = useState(() => Date.now());
  const [board, setBoard] = useState([]);
  const [message, setMessage] = useState("");

  const today = dateKey();
  const running = startedAt !== null;
  const elapsed = running ? Math.floor((now - startedAt) / 1000) : 0;
  const studySeconds = day.studySeconds + elapsed;
  const streak = currentStreak(profile, today);
  const studyDone = studySeconds >= STUDY_GOAL_SECONDS;
  const completedToday = profile.lastCompleted === today;

  const loadBoard = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, "users"), orderBy("streak", "desc"), limit(20)));
      const key = dateKey();
      const rows = snap.docs
        .map((d) => ({ id: d.id, name: d.data().name, streak: currentStreak(d.data(), key) }))
        .filter((r) => r.streak > 0)
        .sort((a, b) => b.streak - a.streak)
        .slice(0, 5);
      setBoard(rows);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Stay signed in across refreshes and load this user's saved data.
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const ref = doc(db, "users", u.uid);
          const snap = await getDoc(ref);
          const key = dateKey();
          if (snap.exists()) {
            const data = snap.data();
            setProfile({ streak: data.streak, lastCompleted: data.lastCompleted ?? null });
            setDay(data.today?.date === key ? data.today : emptyDay(key));
          } else {
            const fresh = emptyDay(key);
            await setDoc(ref, { name: u.displayName ?? "Anonymous", ...NEW_PROFILE, today: fresh });
            setProfile(NEW_PROFILE);
            setDay(fresh);
          }
          loadBoard();
        } catch (err) {
          console.error(err);
          setMessage("Couldn't load your data. Check your connection and Firestore rules.");
        }
      } else {
        setProfile(NEW_PROFILE);
        setDay(emptyDay(dateKey()));
        setStartedAt(null);
        setBoard([]);
      }
      setAuthReady(true);
    });
  }, [loadBoard]);

  // Save progress; if both goals are met today, extend the streak.
  const commit = useCallback(async (nextDay) => {
    if (!user) return;
    let nextProfile = profile;
    if (isDayComplete(nextDay) && profile.lastCompleted !== nextDay.date) {
      nextProfile = completeDay(profile, nextDay.date);
    }
    setDay(nextDay);
    setProfile(nextProfile);
    try {
      await setDoc(doc(db, "users", user.uid), {
        name: user.displayName ?? "Anonymous",
        streak: nextProfile.streak,
        lastCompleted: nextProfile.lastCompleted,
        today: nextDay,
      });
      if (nextProfile !== profile) {
        setMessage(`Day complete! Streak: ${nextProfile.streak}`);
        loadBoard();
      }
    } catch (err) {
      console.error(err);
      setMessage("Couldn't save. Check your connection and try again.");
    }
  }, [user, profile, loadBoard]);

  // Tick once a second while the timer runs; stop automatically when the goal is reached.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const total = day.studySeconds + Math.floor((t - startedAt) / 1000);
      if (total >= STUDY_GOAL_SECONDS) {
        setStartedAt(null);
        commit({ ...day, studySeconds: total });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [running, startedAt, day, commit]);

  // Autosave study time every 30 s while running.
  useEffect(() => {
    if (!running || !user) return;
    const id = setInterval(() => {
      const total = day.studySeconds + Math.floor((Date.now() - startedAt) / 1000);
      setDoc(doc(db, "users", user.uid), {
        name: user.displayName ?? "Anonymous",
        streak: profile.streak,
        lastCompleted: profile.lastCompleted,
        today: { ...day, studySeconds: total },
      }).catch(console.error);
    }, 30000);
    return () => clearInterval(id);
  }, [running, user, day, startedAt, profile]);

  const handleLogin = async () => {
    setMessage("");
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      setMessage("Login failed. Please try again.");
    }
  };

  const toggleTimer = () => {
    if (!user) return setMessage("Log in first.");
    setMessage("");
    if (running) {
      setStartedAt(null);
      commit({ ...day, studySeconds: Math.floor(studySeconds) });
    } else {
      setNow(Date.now());
      setStartedAt(Date.now());
    }
  };

  const markGym = () => {
    if (!user) return setMessage("Log in first.");
    if (day.gymDone) return setMessage("Gym already marked for today.");
    setMessage("");
    commit({ ...day, gymDone: true });
  };

  if (!authReady) {
    return <div className="min-h-screen bg-black text-gray-400 p-4">Loading…</div>;
  }

  return (
    <main className="min-h-screen bg-black text-white p-4 max-w-md mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-xl font-bold">🔥 {streak} Day Streak</h1>
          <p className="text-gray-400">
            {user ? `Welcome, ${user.displayName}` : "Not logged in"}
          </p>
          {completedToday && <p className="text-green-400 text-sm mt-1">Today complete ✅</p>}
        </div>
        {user ? (
          <button onClick={() => signOut(auth)} className="text-sm text-gray-400 underline">
            Log out
          </button>
        ) : (
          <button onClick={handleLogin} className="bg-white text-black px-4 py-2 rounded-lg">
            Login with Google
          </button>
        )}
      </div>

      {message && <p role="status" className="mb-4 text-yellow-300 text-sm">{message}</p>}

      <p className="text-gray-400 text-sm mb-3">
        Finish both goals to keep your streak alive today.
      </p>

      <div className="space-y-4">
        <section className="bg-gray-900 p-4 rounded-xl">
          <h2 className="text-lg">📚 Study {Math.round(STUDY_GOAL_SECONDS / 3600 * 10) / 10} h {studyDone && "✅"}</h2>
          <p className="text-gray-400 mt-1">
            {formatHMS(studySeconds)} / {formatHMS(STUDY_GOAL_SECONDS)}
          </p>
          <div className="h-2 bg-gray-800 rounded mt-2">
            <div
              className="h-2 bg-blue-500 rounded"
              style={{ width: `${Math.min(100, (studySeconds / STUDY_GOAL_SECONDS) * 100)}%` }}
            />
          </div>
          <button onClick={toggleTimer} className="mt-3 bg-blue-500 px-4 py-2 rounded-lg">
            {running ? "Stop Timer" : "Start Timer"}
          </button>
        </section>

        <section className="bg-gray-900 p-4 rounded-xl">
          <h2 className="text-lg">💪 Gym {day.gymDone && "✅"}</h2>
          <button
            onClick={markGym}
            disabled={day.gymDone}
            className="mt-2 bg-green-500 px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {day.gymDone ? "Done" : "Mark Done"}
          </button>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="text-lg mb-2">🏆 Leaderboard</h2>
        {board.length === 0 ? (
          <p className="text-gray-400">
            {user ? "No active streaks yet. Be the first!" : "Log in to see the leaderboard."}
          </p>
        ) : (
          <ol className="space-y-1">
            {board.map((r, i) => (
              <li key={r.id} className="text-gray-300">
                {i + 1}. {r.name} — 🔥 {r.streak}
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
