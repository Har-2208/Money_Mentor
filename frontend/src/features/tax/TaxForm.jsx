import { useState } from "react";

const initialValues = {
  annual_salary: "",
  basic_salary: "",
  hra: "",
  other_allowances: "",
  deductions_80C: "",
  deductions_80D: "",
  other_deductions: "",
  city_type: "metro",
};

const cityOptions = [
  { value: "metro", label: "Metro" },
  { value: "non-metro", label: "Non-metro" },
];

export default function TaxForm({ onSubmit }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const validate = (data) => {
    const nextErrors = {};
    const fields = [
      "annual_salary",
      "basic_salary",
      "hra",
      "other_allowances",
      "deductions_80C",
      "deductions_80D",
      "other_deductions",
    ];

    fields.forEach((field) => {
      if (data[field] === "") {
        nextErrors[field] = "This field is required.";
        return;
      }

      const value = Number(data[field]);
      if (Number.isNaN(value) || value < 0) {
        nextErrors[field] = "Enter a valid non-negative amount.";
      }
    });

    if (!data.city_type) {
      nextErrors.city_type = "Select a city type.";
    }

    return nextErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      onSubmit?.({
        annual_salary: Number(values.annual_salary),
        basic_salary: Number(values.basic_salary),
        hra: Number(values.hra),
        other_allowances: Number(values.other_allowances),
        deductions_80C: Number(values.deductions_80C),
        deductions_80D: Number(values.deductions_80D),
        other_deductions: Number(values.other_deductions),
        city_type: values.city_type,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="tax-form">
      <div className="tax-form-header">
        <div>
          <h2>Tell us about your salary</h2>
          <p>We use this to compare old vs new regime outcomes.</p>
        </div>
        <div className="tax-form-chip">Tax Lens</div>
      </div>

      <div className="tax-form-grid">
        <label className="tax-label">
          <span className="tax-label-title">
            <span className="tax-label-icon" aria-hidden="true">
              💼
            </span>
            Annual Salary
          </span>
          <input
            type="number"
            name="annual_salary"
            value={values.annual_salary}
            onChange={handleChange}
            min="0"
            className="tax-input"
            placeholder="1200000"
          />
          {errors.annual_salary && (
            <span className="tax-error-text">{errors.annual_salary}</span>
          )}
        </label>

        <label className="tax-label">
          <span className="tax-label-title">
            <span className="tax-label-icon" aria-hidden="true">
              📌
            </span>
            Basic Salary
          </span>
          <input
            type="number"
            name="basic_salary"
            value={values.basic_salary}
            onChange={handleChange}
            min="0"
            className="tax-input"
            placeholder="500000"
          />
          {errors.basic_salary && (
            <span className="tax-error-text">{errors.basic_salary}</span>
          )}
        </label>

        <label className="tax-label">
          <span className="tax-label-title">
            <span className="tax-label-icon" aria-hidden="true">
              🏠
            </span>
            HRA
          </span>
          <input
            type="number"
            name="hra"
            value={values.hra}
            onChange={handleChange}
            min="0"
            className="tax-input"
            placeholder="240000"
          />
          {errors.hra && <span className="tax-error-text">{errors.hra}</span>}
        </label>

        <label className="tax-label">
          <span className="tax-label-title">
            <span className="tax-label-icon" aria-hidden="true">
              🎁
            </span>
            Other Allowances
          </span>
          <input
            type="number"
            name="other_allowances"
            value={values.other_allowances}
            onChange={handleChange}
            min="0"
            className="tax-input"
            placeholder="100000"
          />
          {errors.other_allowances && (
            <span className="tax-error-text">{errors.other_allowances}</span>
          )}
        </label>

        <label className="tax-label">
          <span className="tax-label-title">
            <span className="tax-label-icon" aria-hidden="true">
              🧾
            </span>
            Deductions 80C
          </span>
          <input
            type="number"
            name="deductions_80C"
            value={values.deductions_80C}
            onChange={handleChange}
            min="0"
            className="tax-input"
            placeholder="150000"
          />
          {errors.deductions_80C && (
            <span className="tax-error-text">{errors.deductions_80C}</span>
          )}
        </label>

        <label className="tax-label">
          <span className="tax-label-title">
            <span className="tax-label-icon" aria-hidden="true">
              🩺
            </span>
            Deductions 80D
          </span>
          <input
            type="number"
            name="deductions_80D"
            value={values.deductions_80D}
            onChange={handleChange}
            min="0"
            className="tax-input"
            placeholder="25000"
          />
          {errors.deductions_80D && (
            <span className="tax-error-text">{errors.deductions_80D}</span>
          )}
        </label>

        <label className="tax-label">
          <span className="tax-label-title">
            <span className="tax-label-icon" aria-hidden="true">
              🧮
            </span>
            Other Deductions
          </span>
          <input
            type="number"
            name="other_deductions"
            value={values.other_deductions}
            onChange={handleChange}
            min="0"
            className="tax-input"
            placeholder="10000"
          />
          {errors.other_deductions && (
            <span className="tax-error-text">{errors.other_deductions}</span>
          )}
        </label>

        <label className="tax-label">
          <span className="tax-label-title">
            <span className="tax-label-icon" aria-hidden="true">
              🏙️
            </span>
            City Type
          </span>
          <select
            name="city_type"
            value={values.city_type}
            onChange={handleChange}
            className="tax-input"
          >
            {cityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.city_type && (
            <span className="tax-error-text">{errors.city_type}</span>
          )}
        </label>
      </div>

      <div className="tax-actions">
        <button type="submit" className="tax-button">
          Calculate Tax
        </button>
        <p className="tax-helper">
          Secure by design. We only analyze your inputs.
        </p>
      </div>
    </form>
  );
}
