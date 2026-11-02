// src/lib/fonts.js
// Font styles for headings and numbers ("Styl písma" in Settings), each with the
// mood of a game genre. Body text always stays in the readable UI font.
// The fonts are OFL-licensed Fontsource packages bundled with the app (no
// request to Google Fonts), and each one is downloaded only when it is used.
// The CSS for each style (family, size adjustment) is in App.css under [data-font].

export const FONT_THEMES = [
  { value: "default", label: "Výchozí", mood: "Čisté a čitelné", load: null },
  { value: "arcade", label: "Arkáda", mood: "8-bit automaty", load: () => import("@fontsource/press-start-2p/400.css") },
  { value: "terminal", label: "Terminál", mood: "Zelený monitor, postapo", load: () => import("@fontsource/vt323/400.css") },
  { value: "scifi", label: "Sci-fi", mood: "Futuristické střílečky", load: () => import("@fontsource/audiowide/400.css") },
  { value: "fantasy", label: "Fantasy", mood: "Epická RPG", load: () => import("@fontsource/cinzel/700.css") },
  { value: "comic", label: "Komiks", mood: "Battle royale", load: () => import("@fontsource/bangers/400.css") },
  { value: "tactical", label: "Taktické", mood: "Vojenské šablony", load: () => import("@fontsource/black-ops-one/400.css") },
]

// Starts downloading a font style's CSS and font files. Safe to call often:
// the browser and Vite load each module once. Never throws; a font that fails
// to load just falls back to the UI font.
export function loadFontTheme(value) {
  const theme = FONT_THEMES.find((t) => t.value === value)
  if (!theme?.load) return Promise.resolve()
  return theme.load().then(
    () => {},
    () => {}
  )
}
