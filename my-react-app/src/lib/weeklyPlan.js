// src/lib/weeklyPlan.js
// Default weekly plan (push/pull/legs split). Kept out of the component file so
// React Fast Refresh can treat WeeklyPlan.jsx as a component-only module.
export function createDefaultWeeklyPlan() {
  return [
    { day: "Pondělí",  type: "push" },
    { day: "Úterý",    type: "pull" },
    { day: "Středa",   type: "legs" },
    { day: "Čtvrtek",  type: "off" },
    { day: "Pátek",    type: "push" },
    { day: "Sobota",   type: "pull" },
    { day: "Neděle",   type: "off" },
  ]
}
