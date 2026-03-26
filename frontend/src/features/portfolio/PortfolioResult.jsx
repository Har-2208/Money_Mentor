function formatPercent(value) {
  const amount = Number(value || 0);
  return `${amount.toFixed(2)}%`;
}

function formatINR(value) {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function getValue(data, keys) {
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

export default function PortfolioResult({ result }) {
  const analysis =
    result?.portfolio_analysis || result?.analysis || result || {};
  const xirr = getValue(analysis, ["xirr", "xirr_percent", "returns"]);
  const overlap = getValue(analysis, [
    "overlap_score",
    "overlap",
    "overlap_percent",
  ]);
  const expenseDrag = getValue(analysis, ["expense_drag", "expense_impact"]);
  const rebalanceSuggestions = normalizeList(
    getValue(analysis, ["rebalance_suggestions", "rebalance", "suggestions"]),
  );

  if (xirr === null && overlap === null && expenseDrag === null) {
    return (
      <div className="portfolio-empty">
        No portfolio analytics were returned by the server.
      </div>
    );
  }

  const overlapPercent = Number(overlap || 0);
  const overlapWarning = overlapPercent >= 50;

  return (
    <div className="portfolio-result">
      <div className="portfolio-result-header">
        <div>
          <p className="portfolio-eyebrow">Portfolio Health</p>
          <h2>X-Ray Insights</h2>
        </div>
        <div className="portfolio-result-badge">Analysis Ready</div>
      </div>

      <div className="portfolio-metrics-grid">
        <div className="portfolio-metric-card">
          <p className="portfolio-metric-label">XIRR</p>
          <p className="portfolio-metric-value">{formatPercent(xirr)}</p>
          <div className="portfolio-bar">
            <div
              className="portfolio-bar-fill"
              style={{
                width: `${Math.min(100, Math.max(0, Number(xirr || 0)))}%`,
              }}
            ></div>
          </div>
        </div>
        <div
          className={`portfolio-metric-card ${overlapWarning ? "is-warning" : ""}`}
        >
          <p className="portfolio-metric-label">Overlap Score</p>
          <p className="portfolio-metric-value">{formatPercent(overlap)}</p>
          <div className="portfolio-bar">
            <div
              className={`portfolio-bar-fill ${overlapWarning ? "warn" : ""}`}
              style={{
                width: `${Math.min(100, Math.max(0, overlapPercent))}%`,
              }}
            ></div>
          </div>
          {overlapWarning && (
            <p className="portfolio-warning">High overlap detected.</p>
          )}
        </div>
        <div className="portfolio-metric-card">
          <p className="portfolio-metric-label">Expense Drag</p>
          <p className="portfolio-metric-value">{formatINR(expenseDrag)}</p>
          <p className="portfolio-meta">Annual cost impact.</p>
        </div>
        <div className="portfolio-metric-card">
          <p className="portfolio-metric-label">Rebalance Signal</p>
          <p className="portfolio-metric-value">
            {rebalanceSuggestions.length > 0 ? "Suggested" : "Stable"}
          </p>
          <p className="portfolio-meta">Based on fund mix.</p>
        </div>
      </div>

      <div className="portfolio-suggestions">
        <div>
          <p className="portfolio-eyebrow">Rebalance Suggestions</p>
          <ul className="portfolio-list">
            {rebalanceSuggestions.length === 0 && (
              <li>
                Consider reducing overlap and consolidating similar funds.
              </li>
            )}
            {rebalanceSuggestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
