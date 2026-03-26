import { useState } from "react";
import EventInput from "../features/lifeEvent/EventInput";
import EventResult from "../features/lifeEvent/EventResult";
import lifeEventService from "../features/lifeEvent/lifeEventService";

export default function LifeEventPlanner() {
  const [selectedEvent, setSelectedEvent] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (eventText) => {
    if (!eventText) {
      setError("Please select or enter a life event.");
      return;
    }

    setSelectedEvent(eventText);
    setLoading(true);
    setError("");
    try {
      const response = await lifeEventService.getAdvice(eventText);
      setResult(response);
    } catch (err) {
      const message =
        err?.message || "Unable to analyze your situation right now.";
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="life-page">
      <div className="life-shell">
        <header className="life-hero">
          <div>
            <p className="life-eyebrow">Life Event Planning</p>
            <h1>👶 Life Event Advisor</h1>
            <p className="life-subtitle">
              Get tailored moves for the moment that just happened.
            </p>
          </div>
          <div className="life-hero-stack">
            <div className="life-hero-card">
              <p className="life-hero-label">Smart Moves</p>
              <p className="life-hero-value">Actionable steps</p>
              <p className="life-hero-meta">Built from your event context.</p>
            </div>
            <div className="life-hero-card accent">
              <p className="life-hero-label">Risk + Tax</p>
              <p className="life-hero-value">Balanced adjustments</p>
              <p className="life-hero-meta">Stay protected and efficient.</p>
            </div>
          </div>
        </header>

        <div className="life-card">
          <EventInput
            selectedEvent={selectedEvent}
            onSelectEvent={setSelectedEvent}
            onSubmit={handleSubmit}
            loading={loading}
          />
        </div>

        {loading && (
          <div className="life-status">
            <span className="life-pulse" aria-hidden="true"></span>
            <span>Analyzing your situation...</span>
          </div>
        )}

        {error && <div className="life-error">{error}</div>}

        <div
          className={`life-card life-result-shell ${
            result && !loading ? "is-visible" : "is-hidden"
          }`}
        >
          {result && !loading && <EventResult result={result} />}
        </div>
      </div>
    </div>
  );
}
