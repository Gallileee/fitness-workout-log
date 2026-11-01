// src/lib/workoutTypes.js
// Workout types shared by the form, the filters and the weekly plan.
export const WORKOUT_TYPES = [
  { value: "push", label: "Push" },
  { value: "pull", label: "Pull" },
  { value: "legs", label: "Legs" },
  { value: "fullbody", label: "Full body" },
  { value: "core", label: "Core" },
  { value: "other", label: "Other" },
]

export function workoutTypeLabel(value) {
  return WORKOUT_TYPES.find((t) => t.value === value)?.label ?? "Bez typu"
}
