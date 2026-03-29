import { useEffect, useState } from "react";

const initialValues = {
  partner1_income: "",
  partner1_expenses: "",
  partner1_investments: "",
  partner2_income: "",
  partner2_expenses: "",
  partner2_investments: "",
  partner2_email: "",
  shared_goals: "",
  risk_preference: "moderate",
};

const riskOptions = [
  { value: "conservative", label: "Conservative" },
  { value: "moderate", label: "Moderate" },
  { value: "aggressive", label: "Aggressive" },
];

export default function CoupleForm({
  onSubmit,
  initialValues,
  onImportPartner,
  importBusy,
  importError,
}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [localImportError, setLocalImportError] = useState("");

  useEffect(() => {
    if (!initialValues) return;
    setValues((prev) => ({
      ...prev,
      ...initialValues,
      partner2_email:
        initialValues.partner2_email !== undefined
          ? initialValues.partner2_email
          : prev.partner2_email,
    }));
  }, [initialValues]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const validate = (data) => {
    const nextErrors = {};
    const requiredFields = [
      "partner1_income",
      "partner1_expenses",
      "partner1_investments",
      "partner2_income",
      "partner2_expenses",
      "partner2_investments",
    ];

    requiredFields.forEach((field) => {
      if (data[field] === "") {
        nextErrors[field] = "This field is required.";
        return;
      }

      const value = Number(data[field]);
      if (Number.isNaN(value) || value < 0) {
        nextErrors[field] = "Enter a valid non-negative amount.";
      }
    });

    if (!data.risk_preference) {
      nextErrors.risk_preference = "Select a risk preference.";
    }

    return nextErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      onSubmit?.({
        partner1_income: Number(values.partner1_income),
        partner1_expenses: Number(values.partner1_expenses),
        partner1_investments: Number(values.partner1_investments),
        partner2_income: Number(values.partner2_income),
        partner2_expenses: Number(values.partner2_expenses),
        partner2_investments: Number(values.partner2_investments),
        shared_goals: values.shared_goals,
        risk_preference: values.risk_preference,
      });
    }
  };

  const handleImportPartner = async () => {
    const email = String(values.partner2_email || "").trim();
    if (!email) {
      setLocalImportError("Enter partner email to import profile.");
      return;
    }
    setLocalImportError("");
    try {
      await onImportPartner?.(email);
    } catch (error) {
      setLocalImportError(error?.message || "Failed to import partner profile.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="couple-form">
      <div className="couple-form-header">
        <div>
          <h2>Two profiles, one plan</h2>
          <p>Compare each partner and merge the path forward.</p>
        </div>
        <div className="couple-form-chip">Couple Mode</div>
      </div>

      <div className="couple-grid">
        <div className="couple-panel">
          <h3>Partner 1</h3>
          <label className="couple-label">
            Income
            <input
              type="number"
              name="partner1_income"
              value={values.partner1_income}
              onChange={handleChange}
              min="0"
              className="couple-input"
              placeholder="1200000"
            />
            {errors.partner1_income && (
              <span className="couple-error-text">
                {errors.partner1_income}
              </span>
            )}
          </label>
          <label className="couple-label">
            Expenses
            <input
              type="number"
              name="partner1_expenses"
              value={values.partner1_expenses}
              onChange={handleChange}
              min="0"
              className="couple-input"
              placeholder="480000"
            />
            {errors.partner1_expenses && (
              <span className="couple-error-text">
                {errors.partner1_expenses}
              </span>
            )}
          </label>
          <label className="couple-label">
            Investments
            <input
              type="number"
              name="partner1_investments"
              value={values.partner1_investments}
              onChange={handleChange}
              min="0"
              className="couple-input"
              placeholder="300000"
            />
            {errors.partner1_investments && (
              <span className="couple-error-text">
                {errors.partner1_investments}
              </span>
            )}
          </label>
        </div>

        <div className="couple-panel">
          <h3>Partner 2</h3>
          <label className="couple-label">
            Partner Email
            <div className="couple-import-row">
              <input
                type="email"
                name="partner2_email"
                value={values.partner2_email}
                onChange={handleChange}
                className="couple-input"
                placeholder="partner@email.com"
              />
              <button
                type="button"
                className="couple-button secondary"
                onClick={handleImportPartner}
                disabled={!!importBusy}
              >
                {importBusy ? "Importing..." : "Import Profile"}
              </button>
            </div>
            {(localImportError || importError) && (
              <span className="couple-error-text">{localImportError || importError}</span>
            )}
          </label>
          <label className="couple-label">
            Income
            <input
              type="number"
              name="partner2_income"
              value={values.partner2_income}
              onChange={handleChange}
              min="0"
              className="couple-input"
              placeholder="900000"
            />
            {errors.partner2_income && (
              <span className="couple-error-text">
                {errors.partner2_income}
              </span>
            )}
          </label>
          <label className="couple-label">
            Expenses
            <input
              type="number"
              name="partner2_expenses"
              value={values.partner2_expenses}
              onChange={handleChange}
              min="0"
              className="couple-input"
              placeholder="360000"
            />
            {errors.partner2_expenses && (
              <span className="couple-error-text">
                {errors.partner2_expenses}
              </span>
            )}
          </label>
          <label className="couple-label">
            Investments
            <input
              type="number"
              name="partner2_investments"
              value={values.partner2_investments}
              onChange={handleChange}
              min="0"
              className="couple-input"
              placeholder="200000"
            />
            {errors.partner2_investments && (
              <span className="couple-error-text">
                {errors.partner2_investments}
              </span>
            )}
          </label>
        </div>
      </div>

      <div className="couple-grid">
        <label className="couple-label">
          Shared Goals (optional)
          <input
            type="text"
            name="shared_goals"
            value={values.shared_goals}
            onChange={handleChange}
            className="couple-input"
            placeholder="Home down payment, travel fund"
          />
        </label>
        <label className="couple-label">
          Risk Preference
          <select
            name="risk_preference"
            value={values.risk_preference}
            onChange={handleChange}
            className="couple-input"
          >
            {riskOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.risk_preference && (
            <span className="couple-error-text">{errors.risk_preference}</span>
          )}
        </label>
      </div>

      <div className="couple-actions">
        <button type="submit" className="couple-button">
          Generate Plan
        </button>
        <p className="couple-helper">
          Partner profile import uses registered data and fills this form automatically.
        </p>
      </div>
    </form>
  );
}
