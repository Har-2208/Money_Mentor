import { useEffect, useState } from "react";
import CoupleForm from "../features/couple/CoupleForm";
import CoupleResult from "../features/couple/CoupleResult";
import coupleService from "../features/couple/coupleService";
import { getActiveUserId } from "../services/userIdentity";
import { loadFinancialInputs } from "../services/supabaseDataService";

const initialFormData = {};

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapOnboardingToPartnerFields(profile, partnerPrefix) {
  const annualIncome =
    toNumber(profile?.income?.baseSalary) +
    toNumber(profile?.income?.hra) +
    toNumber(profile?.income?.otherAllowances) +
    toNumber(profile?.income?.otherIncome);

  const monthlyExpenses =
    toNumber(profile?.expenses?.rent) +
    toNumber(profile?.expenses?.food) +
    toNumber(profile?.expenses?.travel) +
    toNumber(profile?.expenses?.subscriptions) +
    toNumber(profile?.expenses?.misc);

  const currentInvestments =
    toNumber(profile?.assets?.cash) +
    toNumber(profile?.assets?.fd) +
    toNumber(profile?.assets?.mutualFunds) +
    toNumber(profile?.assets?.ppf) +
    toNumber(profile?.assets?.stocks);

  return {
    [`${partnerPrefix}_income`]: annualIncome,
    [`${partnerPrefix}_expenses`]: monthlyExpenses * 12,
    [`${partnerPrefix}_investments`]: currentInvestments,
  };
}

export default function CouplePlanner() {
  const [formData, setFormData] = useState(initialFormData);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState("");

  useEffect(() => {
    const prefillCurrentUser = async () => {
      try {
        const userId = await getActiveUserId();
        const profile = await loadFinancialInputs(userId);
        if (!profile) return;

        const mapped = mapOnboardingToPartnerFields(profile, "partner1");
        setFormData((prev) => ({
          ...prev,
          ...mapped,
          risk_preference:
            (profile.riskProfile || "moderate").toString().toLowerCase(),
        }));
      } catch {
        // Keep manual mode if prefill is unavailable.
      }
    };

    prefillCurrentUser();
  }, []);

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

  const handleImportPartner = async (email) => {
    setImportError("");
    setImportBusy(true);
    try {
      const payload = await coupleService.importPartnerProfile(email);
      const imported = payload?.partner_profile || {};

      const nextData = {
        partner2_email: imported.email || email,
        partner2_income: toNumber(imported.annual_income),
        partner2_expenses: toNumber(imported.annual_expenses),
        partner2_investments: toNumber(imported.current_investments),
      };

      setFormData((prev) => ({
        ...prev,
        ...nextData,
        shared_goals: prev.shared_goals || imported.goal_summary || "",
      }));
      return nextData;
    } catch (err) {
      const message = err?.message || "Unable to import partner profile.";
      setImportError(message);
      throw err;
    } finally {
      setImportBusy(false);
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
          <CoupleForm
            onSubmit={handleSubmit}
            initialValues={formData}
            onImportPartner={handleImportPartner}
            importBusy={importBusy}
            importError={importError}
          />
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
