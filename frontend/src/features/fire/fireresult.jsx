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
    </div>
  );
}
