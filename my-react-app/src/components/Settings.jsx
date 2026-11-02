// src/components/Settings.jsx
import Icon from "./Icon"

const GROUPS = [
  {
    key: "accent",
    title: "Barva zvýraznění",
    hint: "Tlačítka, grafy a aktivní položky.",
    options: [
      { value: "purple", label: "Fialová" },
      { value: "blue", label: "Modrá" },
      { value: "emerald", label: "Zelená" },
      { value: "amber", label: "Jantarová" },
    ],
    swatches: true,
  },
  {
    key: "density",
    title: "Rozestupy",
    hint: "Kompaktní zobrazí víc najednou. Ovládací prvky na mobilu zůstanou dost velké na dotyk.",
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
  {
    key: "units",
    title: "Jednotky váhy",
    hint: "Data se ukládají v kg; mění se jen zobrazení a zadávání.",
    options: [
      { value: "metric", label: "Metrické (kg)" },
      { value: "imperial", label: "Imperiální (lb)" },
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
    hint: "Odpočet se spustí sám po „Přidat cvik“. Ve formuláři ho jde spustit i ručně, třeba mezi sériemi.",
    options: [
      { value: "off", label: "Vypnuto" },
      { value: "60", label: "1:00" },
      { value: "90", label: "1:30" },
      { value: "120", label: "2:00" },
      { value: "180", label: "3:00" },
    ],
  },
]

function Settings({ preferences, onChange, user, onLogout }) {
  return (
    <section className="settings" aria-labelledby="settings-title">
      <header className="page-header">
        <h2 id="settings-title" className="page-title">Nastavení</h2>
        <p className="page-subtitle">Ukládá se v tomto prohlížeči.</p>
      </header>

      <div className="settings-grid">
        {GROUPS.map((group) => (
          <fieldset key={group.key} className="card settings-group">
            <legend className="card-title">{group.title}</legend>
            <p className="muted small">{group.hint}</p>
            <div className={`segmented ${group.swatches ? "segmented-swatches" : ""}`} role="radiogroup">
              {group.options.map((opt) => (
                <label key={opt.value} className="segmented-option">
                  <input
                    type="radio"
                    name={group.key}
                    value={opt.value}
                    checked={preferences[group.key] === opt.value}
                    onChange={() => onChange({ ...preferences, [group.key]: opt.value })}
                  />
                  <span>
                    {group.swatches && <i className={`swatch swatch-${opt.value}`} aria-hidden="true" />}
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <section className="card settings-group">
          <h3 className="card-title">Účet</h3>
          <p className="muted small">
            Přihlášen jako <strong className="text">{user.email}</strong>
          </p>
          <button type="button" className="btn btn-secondary" onClick={onLogout}>
            <Icon name="logout" size={18} />
            Odhlásit se
          </button>
        </section>
      </div>
    </section>
  )
}

export default Settings
