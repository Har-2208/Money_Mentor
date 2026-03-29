function formatINR(value) {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatPercent(value) {
  const percentage = Number(value || 0) * 100;
  return `${percentage.toFixed(0)}%`;
}

export default function FireResult({ result }) {
  const plan = result?.fire_plan;

  if (!plan) {
    return (
      <div className="fire-empty">
        No FIRE plan data was returned by the server.
      </div>
    );
  }

  const allocationEntries = Object.entries(plan.asset_allocation || {});
  const warnings = Array.isArray(plan.warnings) ? plan.warnings : [];
  const assumptions = plan.assumptions || {};
  const summaryCards = [
    {
      label: "Retirement Corpus",
      value: formatINR(plan.target_corpus ?? plan.retirement_corpus),
      icon: "🏁",
    },
    {
      label: "Monthly SIP",
      value: formatINR(plan.monthly_sip),
      icon: "📈",
    },
    {
      label: "Additional SIP Needed",
      value: formatINR(plan.additional_sip_needed),
      icon: "➕",
    },
    {
      label: "Years to Retirement",
      value: plan.timeline?.years_to_retire ?? plan.years_to_retire ?? "-",
      icon: "⏳",
    },
    {
      label: "Insurance Gap",
      value: formatINR(plan.insurance_gap),
      icon: "🛡️",
    },
  ];

  return (
    <div className="fire-result">
      <div className="fire-result-header">
        <div>
          <p className="fire-eyebrow">Your FIRE Plan</p>
          <h2>Strategy Snapshot</h2>
        </div>
        <div className="fire-result-badge">Projection Ready</div>
      </div>

      <div className="fire-metrics-grid">
        {summaryCards.map((card) => (
          <div key={card.label} className="fire-metric-card">
            <p className="fire-metric-label">
              {card.icon} {card.label}
            </p>
            <p className="fire-metric-value">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="fire-allocation">
        <div className="fire-allocation-header">
          <div>
            <p className="fire-eyebrow">Suggested Asset Allocation</p>
            <h3>Blend for balance</h3>
          </div>
          <span className="fire-allocation-note">
            Auto-adjusted for risk level
          </span>
        </div>
        <div className="fire-allocation-grid">
          {allocationEntries.length === 0 && (
            <p className="fire-empty">No allocation breakdown available.</p>
          )}
          {allocationEntries.map(([asset, weight]) => (
            <div key={asset} className="fire-allocation-card">
              <div>
                <p className="fire-allocation-title">{asset}</p>
                <p className="fire-allocation-value">{formatPercent(weight)}</p>
              </div>
              <div className="fire-bar">
                <div
                  className="fire-bar-fill"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, Number(weight || 0) * 100),
                    )}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fire-allocation">
        <div className="fire-allocation-header">
          <div>
            <p className="fire-eyebrow">Cashflow Fit</p>
            <h3>Affordability check</h3>
          </div>
        </div>
        <div className="fire-allocation-grid">
          <div className="fire-allocation-card">
            <div>
              <p className="fire-allocation-title">Monthly Surplus</p>
              <p className="fire-allocation-value">{formatINR(plan.monthly_surplus)}</p>
            </div>
          </div>
          <div className="fire-allocation-card">
            <div>
              <p className="fire-allocation-title">Savings Rate</p>
              <p className="fire-allocation-value">{formatPercent(plan.savings_rate)}</p>
            </div>
          </div>
          <div className="fire-allocation-card">
            <div>
              <p className="fire-allocation-title">Projected Existing Corpus</p>
              <p className="fire-allocation-value">
                {formatINR(plan.projected_current_corpus + plan.projected_existing_contributions)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="fire-allocation">
        <div className="fire-allocation-header">
          <div>
            <p className="fire-eyebrow">Assumptions Used</p>
            <h3>Model parameters</h3>
          </div>
        </div>
        <div className="fire-allocation-grid">
          <div className="fire-allocation-card">
            <p className="fire-allocation-title">Inflation</p>
            <p className="fire-allocation-value">{formatPercent(assumptions.inflation_rate)}</p>
          </div>
          <div className="fire-allocation-card">
            <p className="fire-allocation-title">Expected Return</p>
            <p className="fire-allocation-value">{formatPercent(assumptions.annual_return)}</p>
          </div>
          <div className="fire-allocation-card">
            <p className="fire-allocation-title">SWR</p>
            <p className="fire-allocation-value">{formatPercent(assumptions.safe_withdrawal_rate)}</p>
          </div>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="fire-allocation">
          <div className="fire-allocation-header">
            <div>
              <p className="fire-eyebrow">Watchouts</p>
              <h3>Before you act</h3>
            </div>
          </div>
          <div className="fire-allocation-grid">
            {warnings.map((item) => (
              <div key={item} className="fire-allocation-card">
                <p className="fire-allocation-title">⚠ {item}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
