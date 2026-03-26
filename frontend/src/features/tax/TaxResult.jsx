function formatINR(value) {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function getTaxValue(data, keys) {
  for (const key of keys) {
    if (data?.[key] !== undefined && data?.[key] !== null) return data[key];
  }
  return null;
}

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string")
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  return [];
}

export default function TaxResult({ result }) {
  const taxData = result?.tax_analysis || result?.tax_result || result || {};
  const oldTax = getTaxValue(taxData, [
    "old_regime_tax",
    "old_tax",
    "oldRegimeTax",
  ]);
  const newTax = getTaxValue(taxData, [
    "new_regime_tax",
    "new_tax",
    "newRegimeTax",
  ]);
  const bestOption =
    getTaxValue(taxData, ["best_option", "best_regime", "bestOption"]) || "-";
  const savings = getTaxValue(taxData, ["tax_savings", "savings"]) || 0;
  const missingDeductions = normalizeList(
    getTaxValue(taxData, ["missing_deductions", "missingDeductions"]),
  );
  const recommendations = normalizeList(
    getTaxValue(taxData, ["recommendations", "suggestions"]),
  );

  if (!oldTax && !newTax) {
    return (
      <div className="tax-empty">
        No tax comparison data was returned by the server.
      </div>
    );
  }

  const maxTax = Math.max(Number(oldTax || 0), Number(newTax || 0), 1);
  const oldPercent = (Number(oldTax || 0) / maxTax) * 100;
  const newPercent = (Number(newTax || 0) / maxTax) * 100;

  const bestNormalized = String(bestOption).toLowerCase();
  const isOldBest = bestNormalized.includes("old");
  const isNewBest = bestNormalized.includes("new");

  return (
    <div className="tax-result">
      <div className="tax-result-header">
        <div>
          <p className="tax-eyebrow">Tax Outcome</p>
          <h2>Best regime for you</h2>
        </div>
        <div className="tax-result-badge">Analysis Ready</div>
      </div>

      <div className="tax-metrics-grid">
        <div className={`tax-metric-card ${isOldBest ? "is-best" : ""}`}>
          <p className="tax-metric-label">Old Regime Tax</p>
          <p className="tax-metric-value">{formatINR(oldTax)}</p>
        </div>
        <div className={`tax-metric-card ${isNewBest ? "is-best" : ""}`}>
          <p className="tax-metric-label">New Regime Tax</p>
          <p className="tax-metric-value">{formatINR(newTax)}</p>
        </div>
        <div className="tax-metric-card highlight">
          <p className="tax-metric-label">Best Option</p>
          <p className="tax-metric-value">{bestOption}</p>
        </div>
        <div className="tax-metric-card">
          <p className="tax-metric-label">Tax Savings</p>
          <p className="tax-metric-value">{formatINR(savings)}</p>
        </div>
      </div>

      <div className="tax-compare">
        <div className="tax-compare-row">
          <span>Old Regime</span>
          <div className="tax-compare-bar">
            <div
              className="tax-compare-fill"
              style={{ width: `${oldPercent}%` }}
            ></div>
          </div>
          <strong>{formatINR(oldTax)}</strong>
        </div>
        <div className="tax-compare-row">
          <span>New Regime</span>
          <div className="tax-compare-bar">
            <div
              className="tax-compare-fill alt"
              style={{ width: `${newPercent}%` }}
            ></div>
          </div>
          <strong>{formatINR(newTax)}</strong>
        </div>
      </div>

      <div className="tax-insights">
        <div>
          <p className="tax-eyebrow">Missing Deductions</p>
          <ul className="tax-list">
            {missingDeductions.length === 0 && <li>None detected.</li>}
            {missingDeductions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="tax-eyebrow">Recommendations</p>
          <ul className="tax-list">
            {recommendations.length === 0 && (
              <li>Consider ELSS, NPS, and tax-saving FDs.</li>
            )}
            {recommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
