import { useEffect, useMemo, useState } from "react";
import FireForm from "../features/fire/fireform";
import FireResult from "../features/fire/fireresult";
import fireService from "../features/fire/fireservice";

const initialFormData = {};

function mapStoredInputToForm(inputData) {
  if (!inputData || typeof inputData !== "object") {
    return null;
  }

  const assumptions = {
    inflation_rate:
      inputData?.inflation_rate !== undefined && inputData?.inflation_rate !== null
        ? Number(inputData.inflation_rate) * 100
        : undefined,
    annual_return:
      inputData?.annual_return !== undefined && inputData?.annual_return !== null
        ? Number(inputData.annual_return) * 100
        : undefined,
    safe_withdrawal_rate:
      inputData?.safe_withdrawal_rate !== undefined && inputData?.safe_withdrawal_rate !== null
        ? Number(inputData.safe_withdrawal_rate) * 100
        : undefined,
  };

  return {
    ...inputData,
    ...assumptions,
  };
}

export default function FirePlanner() {
  const [formData, setFormData] = useState(initialFormData);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPrevious, setLoadingPrevious] = useState(true);
  const [error, setError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState("");

  useEffect(() => {
    const loadLatest = async () => {
      setLoadingPrevious(true);
      try {
        const latest = await fireService.getLatestFirePlan();
        if (latest?.found && latest?.fire_run) {
          const storedInput = mapStoredInputToForm(latest.fire_run.input_data);
          if (storedInput) {
            setFormData(storedInput);
          }

          const previousPlan = latest.fire_run.plan_output;
          if (previousPlan?.fire_plan) {
            setResult(previousPlan);
          }
          if (latest.fire_run.created_at) {
            setLastSavedAt(latest.fire_run.created_at);
          }
        }
      } catch {
        // Keep page usable even if previous run cannot be loaded.
      } finally {
        setLoadingPrevious(false);
      }
    };

    loadLatest();
  }, []);

  const lastSavedLabel = useMemo(() => {
    if (!lastSavedAt) {
      return "";
    }
    const parsed = new Date(lastSavedAt);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }
    return parsed.toLocaleString();
  }, [lastSavedAt]);

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
          <FireForm onSubmit={handleSubmit} initialData={formData} />
        </div>

        {!loadingPrevious && lastSavedLabel && (
          <div className="fire-status">
            <span>Loaded your last FIRE run from {lastSavedLabel}.</span>
          </div>
        )}

        {loading && (
          <div className="fire-status">
            <span className="fire-pulse" aria-hidden="true"></span>
            <span>Calculating your FIRE plan...</span>
          </div>
        )}

        {error && <div className="fire-error">{error}</div>}

        {result?.warning && <div className="fire-error">{result.warning}</div>}

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
