// src/components/Settings.jsx
// Settings grouped into sections (Vzhled, Trénink, Účet with the CSV export). Every choice is one
// row with the same structure: title and hint on the left, the control on the
// right. Wide controls (colours, font styles) go full width under the title.
import { useEffect } from "react"
import Icon from "./Icon"
import { FONT_THEMES, loadFontTheme } from "../lib/fonts"
import { workoutsToCsv, csvBlob, exportFileName } from "../lib/csvExport"

const ACCENTS = [
  { value: "purple", label: "Fialová" },
  { value: "blue", label: "Modrá" },
  { value: "cyan", label: "Tyrkysová" },
  { value: "emerald", label: "Smaragdová" },
  { value: "lime", label: "Limetková" },
  { value: "amber", label: "Jantarová" },
  { value: "orange", label: "Oranžová" },
  { value: "rose", label: "Růžová" },
  { value: "fuchsia", label: "Purpurová" },
  { value: "mono", label: "Monochromatická" },
]

const APPEARANCE_ROWS = [
  {
    key: "density",
    title: "Rozestupy",
    hint: "Kompaktní zobrazí víc najednou. Na mobilu zůstanou ovládací prvky dost velké na dotyk.",
    options: [
      { value: "comfortable", label: "Pohodlné" },
      { value: "compact", label: "Kompaktní" },
    ],
  },
  {
    key: "layout",
    title: "Rozložení",
    hint: "Automaticky podle šířky okna, nebo vždy počítačové / mobilní.",
    options: [
      { value: "auto", label: "Automaticky" },
      { value: "desktop", label: "Počítač" },
      { value: "mobile", label: "Mobil" },
    ],
  },
]

const TRAINING_ROWS = [
  {
    key: "units",
    title: "Jednotky váhy",
    hint: "Data se ukládají v kg; mění se jen zobrazení a zadávání.",
    options: [
      { value: "metric", label: "kg" },
      { value: "imperial", label: "lb" },
    ],
  },
  {
    key: "repRange",
    title: "Rozsah opakování",
    hint: "Pro návrh dalšího tréninku: přidávej opakování až k horní hranici, pak přidej váhu a začni zase dole.",
    options: [
      { value: "4-6", label: "4–6" },
      { value: "6-10", label: "6–10" },
      { value: "8-12", label: "8–12" },
      { value: "12-15", label: "12–15" },
    ],
  },
  {
    key: "restTimer",
    title: "Pauza po přidání cviku",
    hint: "Odpočet se spustí sám po „Přidat cvik“. Ručně ho spustíš tlačítkem Pauza.",
    options: [
      { value: "off", label: "Vyp." },
      { value: "60", label: "1:00" },
      { value: "90", label: "1:30" },
      { value: "120", label: "2:00" },
      { value: "180", label: "3:00" },
    ],
  },
]

function Settings({ preferences, onChange, user, onLogout, workouts = [] }) {
  const set = (key, value) => onChange({ ...preferences, [key]: value })

  // The font cards preview every style, so load them all while Settings is open.
  useEffect(() => {
    for (const theme of FONT_THEMES) loadFontTheme(theme.value)
  }, [])

  return (
    <section className="settings" aria-labelledby="settings-title">
      <header className="page-header">
        <h2 id="settings-title" className="page-title">
          Nastavení
        </h2>
        <p className="page-subtitle">Ukládá se v tomto prohlížeči a projeví se hned.</p>
      </header>

      <div className="settings-layout">
        <SettingsSection title="Vzhled" icon="brand">
          <SettingRow title="Barva zvýraznění" hint="Tlačítka, grafy a aktivní položky." wide>
            <div className="swatch-picker" role="radiogroup" aria-label="Barva zvýraznění">
              {ACCENTS.map((a) => (
                <label key={a.value} className="swatch-option" title={a.label}>
                  <input
                    type="radio"
                    name="accent"
                    value={a.value}
                    checked={preferences.accent === a.value}
                    onChange={() => set("accent", a.value)}
                    aria-label={a.label}
                  />
                  <span className={`swatch swatch-${a.value}`} aria-hidden="true" />
                </label>
              ))}
            </div>
          </SettingRow>

          <SettingRow title="Styl písma" hint="Nadpisy a čísla dostanou náladu herního žánru. Běžný text zůstává čitelný." wide>
            <div className="font-picker" role="radiogroup" aria-label="Styl písma">
              {FONT_THEMES.map((f) => (
                <label key={f.value} className="font-option" data-font={f.value}>
                  <input
                    type="radio"
                    name="font"
                    value={f.value}
                    checked={preferences.font === f.value}
                    onChange={() => set("font", f.value)}
                    aria-label={`${f.label}: ${f.mood}`}
                  />
                  <span className="font-option-body" aria-hidden="true">
                    <span className="font-sample">4×8 · 90</span>
                    <span className="font-option-label">{f.label}</span>
                    <span className="font-option-mood">{f.mood}</span>
                  </span>
                </label>
              ))}
            </div>
          </SettingRow>

          {APPEARANCE_ROWS.map((row) => (
            <ChoiceRow key={row.key} row={row} value={preferences[row.key]} onSelect={set} />
          ))}
        </SettingsSection>

        <div className="settings-column">
          <SettingsSection title="Trénink" icon="timer">
            {TRAINING_ROWS.map((row) => (
              <ChoiceRow key={row.key} row={row} value={preferences[row.key]} onSelect={set} />
            ))}
          </SettingsSection>

          <SettingsSection title="Účet" icon="settings">
            <SettingRow title="Přihlášen jako" hint={<strong className="text">{user.email}</strong>}>
              <button type="button" className="btn btn-secondary" onClick={onLogout}>
                <Icon name="logout" size={18} />
                Odhlásit se
              </button>
            </SettingRow>
            <SettingRow title="Export tréninků" hint={exportHint(workouts.length)}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => downloadCsv(workouts)}
                disabled={workouts.length === 0}
              >
                <Icon name="download" size={18} />
                Stáhnout CSV
              </button>
            </SettingRow>
          </SettingsSection>
        </div>
      </div>
    </section>
  )
}

function exportHint(count) {
  if (count === 0) return "Zatím není co exportovat."
  const noun = count === 1 ? "trénink" : count < 5 ? "tréninky" : "tréninků"
  return `${count} ${noun} jako tabulka pro Excel nebo Google Sheets. Váhy jsou v kg.`
}

// Saves the CSV through a temporary link, so no server is involved. The URL is
// released a moment later, after the browser has started the download.
function downloadCsv(workouts) {
  const url = URL.createObjectURL(csvBlob(workoutsToCsv(workouts)))
  const link = document.createElement("a")
  link.href = url
  link.download = exportFileName()
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function SettingsSection({ title, icon, children }) {
  return (
    <section className="card settings-section">
      <h3 className="settings-section-title">
        <span className="settings-section-icon" aria-hidden="true">
          <Icon name={icon} size={16} />
        </span>
        {title}
      </h3>
      <div className="settings-rows">{children}</div>
    </section>
  )
}

function SettingRow({ title, hint, wide = false, children }) {
  return (
    <div className={`setting-row ${wide ? "setting-row-wide" : ""}`}>
      <div className="setting-text">
        <div className="setting-title">{title}</div>
        {hint && <div className="setting-hint">{hint}</div>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  )
}

// A setting with a few exclusive choices, shown as a segmented control.
function ChoiceRow({ row, value, onSelect }) {
  return (
    <SettingRow title={row.title} hint={row.hint}>
      <div className="segmented" role="radiogroup" aria-label={row.title}>
        {row.options.map((opt) => (
          <label key={opt.value} className="segmented-option">
            <input
              type="radio"
              name={row.key}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onSelect(row.key, opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </SettingRow>
  )
}

export default Settings
