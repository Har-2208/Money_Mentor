import { useState } from "react";

const eventOptions = [
  { value: "bonus", label: "Bonus received", icon: "💰" },
  { value: "marriage", label: "Marriage", icon: "💍" },
  { value: "job change", label: "Job change", icon: "💼" },
  { value: "buying house", label: "Buying house", icon: "🏠" },
];

export default function EventInput({
  selectedEvent,
  onSelectEvent,
  onSubmit,
  loading = false,
}) {
  const [customEvent, setCustomEvent] = useState("");

  const handleSelect = (value) => {
    setCustomEvent("");
    onSelectEvent?.(value);
  };

  const handleCustomChange = (event) => {
    const value = event.target.value;
    setCustomEvent(value);
    onSelectEvent?.(value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.(customEvent.trim() || selectedEvent.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="life-form">
      <div className="life-form-header">
        <div>
          <h2>Choose your moment</h2>
          <p>Select a life event to get personalized next steps.</p>
        </div>
        <div className="life-form-chip">Advisor Mode</div>
      </div>

      <div className="life-options-grid">
        {eventOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`life-option ${
              selectedEvent === option.value ? "is-selected" : ""
            }`}
            onClick={() => handleSelect(option.value)}
          >
            <span className="life-option-icon" aria-hidden="true">
              {option.icon}
            </span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      <div className="life-custom-row">
        <label className="life-label">
          Custom event
          <input
            type="text"
            value={customEvent}
            onChange={handleCustomChange}
            placeholder="E.g., moved abroad"
            className="life-input"
          />
        </label>
      </div>

      <div className="life-actions">
        <button type="submit" className="life-button" disabled={loading}>
          Get Advice
        </button>
        <p className="life-helper">Your input powers the recommendation.</p>
      </div>
    </form>
  );
}
