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

function getValue(data, keys) {
  for (const key of keys) {
    if (data?.[key] !== undefined && data?.[key] !== null) return data[key];
  }
  return null;
}

export default function EventResult({ result }) {
  const analysis = result?.life_event_plan || result?.advice || result || {};
  const allocation = normalizeList(
    getValue(analysis, ["allocation_strategy", "allocation", "strategy"]),
  );
  const taxImpact = normalizeList(
    getValue(analysis, ["tax_impact", "tax_changes", "taxImpact"]),
  );
  const suggestions = normalizeList(
    getValue(analysis, ["suggestions", "smart_suggestions", "recommendations"]),
  );
  const warnings = normalizeList(getValue(analysis, ["warnings", "risks"]));

  if (
    allocation.length === 0 &&
    taxImpact.length === 0 &&
    suggestions.length === 0
  ) {
    return (
      <div className="life-empty">
        No life event advice was returned by the server.
      </div>
    );
  }

  return (
    <div className="life-result">
      <div className="life-result-header">
        <div>
          <p className="life-eyebrow">Your Action Plan</p>
          <h2>Next best steps</h2>
        </div>
        <div className="life-result-badge">Guidance Ready</div>
      </div>

      <div className="life-result-grid">
        <section className="life-result-card">
          <p className="life-result-title">💰 Investment Plan</p>
          <ul className="life-list">
            {allocation.length === 0 && (
              <li>No allocation shifts suggested.</li>
            )}
            {allocation.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="life-result-card">
          <p className="life-result-title">💸 Tax Changes</p>
          <ul className="life-list">
            {taxImpact.length === 0 && <li>No major tax changes detected.</li>}
            {taxImpact.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="life-result-card warning">
          <p className="life-result-title">⚠️ Warnings</p>
          <ul className="life-list">
            {warnings.length === 0 && <li>No immediate risks flagged.</li>}
            {warnings.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <div className="life-suggestions">
        <p className="life-eyebrow">Smart Suggestions</p>
        <ul className="life-list emphasize">
          {suggestions.length === 0 && (
            <li>Review emergency fund and rebalance investments.</li>
          )}
          {suggestions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
