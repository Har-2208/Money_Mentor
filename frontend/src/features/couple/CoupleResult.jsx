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

function formatSplit(primary, secondary) {
  const total = Number(primary || 0) + Number(secondary || 0);
  if (!total) return "-";
  const primaryShare = Math.round((Number(primary || 0) / total) * 100);
  const secondaryShare = Math.round((Number(secondary || 0) / total) * 100);
  return `${primaryShare}% / ${secondaryShare}%`;
}

export default function CoupleResult({ result }) {
  const analysis = result?.couple_plan || result?.plan || result || {};
  const combinedIncome = getValue(analysis, [
    "combined_income",
    "total_income",
  ]);
  const combinedExpenses = getValue(analysis, [
    "combined_expenses",
    "total_expenses",
  ]);
  const netSavings = getValue(analysis, ["net_savings", "savings"]);
  const monthlySurplus = getValue(analysis, ["monthly_surplus"]);
  const savingsRate = getValue(analysis, ["savings_rate"]);
  const emergencyTarget = getValue(analysis, ["emergency_fund_target"]);
  const emergencyGap = getValue(analysis, ["emergency_fund_gap"]);
  const monthlyEmergency = getValue(analysis, [
    "recommended_monthly_emergency_contribution",
  ]);
  const monthlyInvestment = getValue(analysis, ["recommended_monthly_investment"]);
  const warnings = normalizeList(getValue(analysis, ["warnings"]));
  const investmentStrategy = normalizeList(
    getValue(analysis, ["investment_strategy", "strategy"]),
  );
  const budgetSuggestions = normalizeList(
    getValue(analysis, ["budget_suggestions", "cashflow_suggestions"]),
  );
  const goalStrategy = normalizeList(
    getValue(analysis, ["goal_strategy", "goals"]),
  );
  const partner1Income = getValue(analysis, [
    "partner1_income",
    "p1_income",
    "income_partner1",
  ]);
  const partner2Income = getValue(analysis, [
    "partner2_income",
    "p2_income",
    "income_partner2",
  ]);
  const partner1Expenses = getValue(analysis, [
    "partner1_expenses",
    "p1_expenses",
    "expenses_partner1",
  ]);
  const partner2Expenses = getValue(analysis, [
    "partner2_expenses",
    "p2_expenses",
    "expenses_partner2",
  ]);
  const partner1Investments = getValue(analysis, [
    "partner1_investments",
    "p1_investments",
    "investments_partner1",
  ]);
  const partner2Investments = getValue(analysis, [
    "partner2_investments",
    "p2_investments",
    "investments_partner2",
  ]);

  const splitChips = [
    {
      label: "Income Split",
      value: formatSplit(partner1Income, partner2Income),
      isVisible: partner1Income !== null && partner2Income !== null,
    },
    {
      label: "Expense Split",
      value: formatSplit(partner1Expenses, partner2Expenses),
      isVisible: partner1Expenses !== null && partner2Expenses !== null,
    },
    {
      label: "Investment Split",
      value: formatSplit(partner1Investments, partner2Investments),
      isVisible: partner1Investments !== null && partner2Investments !== null,
    },
  ].filter((chip) => chip.isVisible);

  if (!combinedIncome && !combinedExpenses && !netSavings) {
    return (
      <div className="couple-empty">
        No couple plan data was returned by the server.
      </div>
    );
  }

  return (
    <div className="couple-result">
      <div className="couple-result-header">
        <div>
          <p className="couple-eyebrow">Combined Overview</p>
          <h2>Shared Financial Snapshot</h2>
        </div>
        <div className="couple-result-badge">Plan Ready</div>
      </div>

      <div className="couple-metrics-grid">
        <div className="couple-metric-card highlight">
          <p className="couple-metric-label">Combined Income</p>
          <p className="couple-metric-value">{formatINR(combinedIncome)}</p>
        </div>
        <div className="couple-metric-card">
          <p className="couple-metric-label">Combined Expenses</p>
          <p className="couple-metric-value">{formatINR(combinedExpenses)}</p>
        </div>
        <div className="couple-metric-card">
          <p className="couple-metric-label">Net Savings</p>
          <p className="couple-metric-value">{formatINR(netSavings)}</p>
        </div>
        <div className="couple-metric-card">
          <p className="couple-metric-label">Monthly Surplus</p>
          <p className="couple-metric-value">{formatINR(monthlySurplus)}</p>
        </div>
        <div className="couple-metric-card">
          <p className="couple-metric-label">Savings Rate</p>
          <p className="couple-metric-value">
            {`${Math.max(0, Number(savingsRate || 0) * 100).toFixed(1)}%`}
          </p>
        </div>
      </div>

      <div className="couple-metrics-grid">
        <div className="couple-metric-card">
          <p className="couple-metric-label">Emergency Fund Target</p>
          <p className="couple-metric-value">{formatINR(emergencyTarget)}</p>
        </div>
        <div className="couple-metric-card">
          <p className="couple-metric-label">Emergency Gap</p>
          <p className="couple-metric-value">{formatINR(emergencyGap)}</p>
        </div>
        <div className="couple-metric-card">
          <p className="couple-metric-label">Monthly Emergency Top-up</p>
          <p className="couple-metric-value">{formatINR(monthlyEmergency)}</p>
        </div>
        <div className="couple-metric-card">
          <p className="couple-metric-label">Monthly Investment Capacity</p>
          <p className="couple-metric-value">{formatINR(monthlyInvestment)}</p>
        </div>
      </div>

      <div className="couple-chip-row">
        {splitChips.length === 0 && (
          <div className="couple-chip muted">
            Add partner details to see contribution split.
          </div>
        )}
        {splitChips.map((chip) => (
          <div key={chip.label} className="couple-chip">
            <span>{chip.label}</span>
            <strong>{chip.value}</strong>
          </div>
        ))}
      </div>

      <div className="couple-strategy-grid">
        <section className="couple-strategy-card">
          <p className="couple-strategy-title">📊 Investment Strategy</p>
          <ul className="couple-list">
            {investmentStrategy.length === 0 && (
              <li>Rebalance based on shared risk tolerance.</li>
            )}
            {investmentStrategy.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section className="couple-strategy-card">
          <p className="couple-strategy-title">💸 Cashflow Optimization</p>
          <ul className="couple-list">
            {budgetSuggestions.length === 0 && (
              <li>Set shared category limits and automate monthly savings.</li>
            )}
            {budgetSuggestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section className="couple-strategy-card">
          <p className="couple-strategy-title">🎯 Goal Planning</p>
          <ul className="couple-list">
            {goalStrategy.length === 0 && (
              <li>Align timelines and assign contributions.</li>
            )}
            {goalStrategy.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        {warnings.length > 0 && (
          <section className="couple-strategy-card">
            <p className="couple-strategy-title">⚠️ Key Warnings</p>
            <ul className="couple-list">
              {warnings.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
