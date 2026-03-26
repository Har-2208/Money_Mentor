import { useState } from "react";
import TaxForm from "../features/tax/TaxForm";
import TaxResult from "../features/tax/TaxResult";
import taxService from "../features/tax/taxService";

const initialFormData = {};

export default function TaxPlanner() {
  const [formData, setFormData] = useState(initialFormData);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (data) => {
    setFormData(data);
    setLoading(true);
    setError("");
    try {
      const response = await taxService.calculateTax(data);
      setResult(response);
    } catch (err) {
      const message =
        err?.message ||
        "Unable to calculate taxes right now. Please try again.";
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tax-page">
      <div className="tax-shell">
        <header className="tax-hero">
          <div>
            <p className="tax-eyebrow">Tax Optimization</p>
            <h1>💰 Tax Wizard - Save More Taxes</h1>
            <p className="tax-subtitle">
              Compare regimes, reveal deductions, and keep more of your income.
            </p>
          </div>
          <div className="tax-hero-stack">
            <div className="tax-hero-card">
              <p className="tax-hero-label">Regime Comparison</p>
              <p className="tax-hero-value">Old vs new, side-by-side</p>
              <p className="tax-hero-meta">Auto-highlight the best option.</p>
            </div>
            <div className="tax-hero-card accent">
              <p className="tax-hero-label">Savings Ideas</p>
              <p className="tax-hero-value">ELSS, NPS, FD prompts</p>
              <p className="tax-hero-meta">Actionable next steps.</p>
            </div>
          </div>
        </header>

        <div className="tax-card">
          <TaxForm onSubmit={handleSubmit} />
        </div>

        {loading && (
          <div className="tax-status">
            <span className="tax-pulse" aria-hidden="true"></span>
            <span>Calculating the best tax path...</span>
          </div>
        )}

        {error && <div className="tax-error">{error}</div>}

        <div
          className={`tax-card tax-result-shell ${
            result && !loading ? "is-visible" : "is-hidden"
          }`}
        >
          {result && !loading && <TaxResult result={result} />}
        </div>
      </div>
    </div>
  );
}
