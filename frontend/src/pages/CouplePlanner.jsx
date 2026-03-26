import { useState } from "react";
import CoupleForm from "../features/couple/CoupleForm";
import CoupleResult from "../features/couple/CoupleResult";
import coupleService from "../features/couple/coupleService";

const initialFormData = {};

export default function CouplePlanner() {
  const [formData, setFormData] = useState(initialFormData);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (data) => {
    setFormData(data);
    setLoading(true);
    setError("");
    try {
      const response = await coupleService.generatePlan(data);
      setResult(response);
    } catch (err) {
      const message =
        err?.message || "Unable to generate couple plan right now.";
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="couple-page">
      <div className="couple-shell">
        <header className="couple-hero">
          <div>
            <p className="couple-eyebrow">Couple Planning</p>
            <h1>❤️ Couple Financial Planner</h1>
            <p className="couple-subtitle">
              Blend finances, align goals, and build a shared plan.
            </p>
          </div>
          <div className="couple-hero-stack">
            <div className="couple-hero-card">
              <p className="couple-hero-label">Shared Snapshot</p>
              <p className="couple-hero-value">Combined view</p>
              <p className="couple-hero-meta">See income + expense synergy.</p>
            </div>
            <div className="couple-hero-card accent">
              <p className="couple-hero-label">Goal Alignment</p>
              <p className="couple-hero-value">Plan together</p>
              <p className="couple-hero-meta">Prioritize goals as a unit.</p>
            </div>
          </div>
        </header>

        <div className="couple-card">
          <CoupleForm onSubmit={handleSubmit} />
        </div>

        {loading && (
          <div className="couple-status">
            <span className="couple-pulse" aria-hidden="true"></span>
            <span>Generating your combined plan...</span>
          </div>
        )}

        {error && <div className="couple-error">{error}</div>}

        <div
          className={`couple-card couple-result-shell ${
            result && !loading ? "is-visible" : "is-hidden"
          }`}
        >
          {result && !loading && <CoupleResult result={result} />}
        </div>
      </div>
    </div>
  );
}
