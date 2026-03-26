import { useState } from "react";
import FireForm from "../features/fire/fireform";
import FireResult from "../features/fire/fireresult";
import fireService from "../features/fire/fireservice";

const initialFormData = {};

export default function FirePlanner() {
  const [formData, setFormData] = useState(initialFormData);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (data) => {
    setFormData(data);
    setLoading(true);
    setError("");
    try {
      const response = await fireService.generateFirePlan(data);
      setResult(response);
    } catch (err) {
      const message =
        err?.message || "Unable to generate FIRE plan. Please try again.";
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fire-page">
      <div className="fire-shell">
        <header className="fire-hero">
          <div>
            <p className="fire-eyebrow">Plan Your Future</p>
            <h1>🔥 FIRE Planner - Plan Your Future</h1>
            <p className="fire-subtitle">
              Estimate your path to financial independence and early retirement.
            </p>
          </div>
          <div className="fire-hero-panel">
            <div className="fire-hero-card">
              <p className="fire-hero-label">Goal Horizon</p>
              <p className="fire-hero-value">Early retirement in focus</p>
              <p className="fire-hero-meta">
                Snapshot of your glide path, updated every time you submit.
              </p>
            </div>
            <div className="fire-hero-card muted">
              <p className="fire-hero-label">Strategy Mode</p>
              <p className="fire-hero-value">Build, invest, iterate</p>
              <p className="fire-hero-meta">Balance growth with resilience.</p>
            </div>
          </div>
        </header>

        <div className="fire-card">
          <FireForm onSubmit={handleSubmit} />
        </div>

        {loading && (
          <div className="fire-status">
            <span className="fire-pulse" aria-hidden="true"></span>
            <span>Calculating your FIRE plan...</span>
          </div>
        )}

        {error && <div className="fire-error">{error}</div>}

        <div
          className={`fire-card fire-result-shell ${
            result && !loading ? "is-visible" : "is-hidden"
          }`}
        >
          {result && !loading && <FireResult result={result} />}
        </div>
      </div>
    </div>
  );
}
