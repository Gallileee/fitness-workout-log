// src/components/NumberStepper.jsx
// A labelled number input with − / + buttons, so common changes take one tap
// instead of opening the keyboard. The input stays editable for any other value.
import { stepNumber } from "../lib/history"

function NumberStepper({ id, label, value, onChange, step = 1, min = 0, inputMode = "numeric" }) {
  const stepText = step.toLocaleString("cs-CZ")
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="stepper">
        <button
          type="button"
          className="stepper-btn"
          aria-label={`${label}: ubrat ${stepText}`}
          onClick={() => onChange(stepNumber(value, -step, { min }))}
        >
          −
        </button>
        <input
          id={id}
          className="input stepper-input"
          type="number"
          inputMode={inputMode}
          min={min}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="stepper-btn"
          aria-label={`${label}: přidat ${stepText}`}
          onClick={() => onChange(stepNumber(value, step, { min }))}
        >
          +
        </button>
      </div>
    </div>
  )
}

export default NumberStepper
