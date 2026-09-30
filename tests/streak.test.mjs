// Run with: npm test   (uses Node's built-in test runner, no extra dependencies)
import test from "node:test";
import assert from "node:assert/strict";
import { completeDay, currentStreak, dateKey, isDayComplete, shiftKey } from "../app/streak.js";

test("dateKey uses local calendar date", () => {
  assert.equal(dateKey(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
});

test("shiftKey crosses month and year boundaries", () => {
  assert.equal(shiftKey("2026-03-01", -1), "2026-02-28");
  assert.equal(shiftKey("2026-01-01", -1), "2025-12-31");
  assert.equal(shiftKey("2024-03-01", -1), "2024-02-29"); // leap year
});

test("first ever completion starts streak at 1", () => {
  assert.deepEqual(completeDay({ streak: 0, lastCompleted: null }, "2026-05-10"),
    { streak: 1, lastCompleted: "2026-05-10" });
});

test("consecutive day extends the streak", () => {
  assert.equal(completeDay({ streak: 4, lastCompleted: "2026-05-09" }, "2026-05-10").streak, 5);
});

test("missed day resets to 1", () => {
  assert.equal(completeDay({ streak: 9, lastCompleted: "2026-05-07" }, "2026-05-10").streak, 1);
});

test("completing the same day twice does not double count", () => {
  const p = { streak: 3, lastCompleted: "2026-05-10" };
  assert.equal(completeDay(p, "2026-05-10").streak, 3);
});

test("displayed streak drops to 0 once a day is missed", () => {
  const p = { streak: 6, lastCompleted: "2026-05-08" };
  assert.equal(currentStreak(p, "2026-05-09"), 6); // yesterday: still alive
  assert.equal(currentStreak(p, "2026-05-10"), 0); // 2 days ago: lapsed
});

test("a day needs BOTH study goal and gym", () => {
  assert.equal(isDayComplete({ studySeconds: 7200, gymDone: false }, 7200), false);
  assert.equal(isDayComplete({ studySeconds: 7199, gymDone: true }, 7200), false);
  assert.equal(isDayComplete({ studySeconds: 7200, gymDone: true }, 7200), true);
});
