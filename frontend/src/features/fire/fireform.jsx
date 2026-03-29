import { useEffect, useState } from "react";

const initialValues = {
  current_age: "",
  retirement_age: "",
  monthly_income: "",
  monthly_expenses: "",
  current_investments: "",
  monthly_investment: "",
  risk_level: "moderate",
  inflation_rate: "6",
  annual_return: "12",
  safe_withdrawal_rate: "4",
};

const riskOptions = [
  { value: "conservative", label: "Conservative" },
  { value: "moderate", label: "Moderate" },
  { value: "aggressive", label: "Aggressive" },
];

export default function FireForm({ onSubmit, initialData }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!initialData) {
      return;
    }
    setValues((prev) => ({
      ...prev,
      ...Object.fromEntries(
        Object.entries(initialData).map(([key, value]) => [
          key,
          value === null || value === undefined ? "" : String(value),
        ]),
      ),
    }));
  }, [initialData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const validate = (data) => {
    const nextErrors = {};
    const currentAge = Number(data.current_age);
    const retirementAge = Number(data.retirement_age);
    const monthlyIncome = Number(data.monthly_income);
    const monthlyExpenses = Number(data.monthly_expenses);
    const currentInvestments = Number(data.current_investments);
    const monthlyInvestment = Number(data.monthly_investment);
    const inflationRate = Number(data.inflation_rate);
    const annualReturn = Number(data.annual_return);
    const swr = Number(data.safe_withdrawal_rate);

    if (!data.current_age) nextErrors.current_age = "Current age is required.";
    if (!data.retirement_age)
      nextErrors.retirement_age = "Retirement age is required.";
    if (!data.monthly_income)
      nextErrors.monthly_income = "Monthly income is required.";
    if (!data.monthly_expenses)
      nextErrors.monthly_expenses = "Monthly expenses are required.";
    if (!data.current_investments)
      nextErrors.current_investments = "Current investments are required.";
    if (data.monthly_investment === "") {
      nextErrors.monthly_investment = "Monthly investment is required.";
    }

    if (
      data.current_age &&
      (Number.isNaN(currentAge) || currentAge < 18 || currentAge > 120)
    ) {
      nextErrors.current_age = "Enter a valid age between 18 and 120.";
    }
    if (
      data.retirement_age &&
      (Number.isNaN(retirementAge) || retirementAge < 30 || retirementAge > 120)
    ) {
      nextErrors.retirement_age =
        "Enter a valid retirement age between 30 and 120.";
    }
    if (
      data.current_age &&
      data.retirement_age &&
      retirementAge <= currentAge
    ) {
      nextErrors.retirement_age =
        "Retirement age must be greater than current age.";
    }
    if (
      data.monthly_income &&
      (Number.isNaN(monthlyIncome) || monthlyIncome <= 0)
    ) {
      nextErrors.monthly_income = "Enter a positive income amount.";
    }
    if (
      data.monthly_expenses &&
      (Number.isNaN(monthlyExpenses) || monthlyExpenses <= 0)
    ) {
      nextErrors.monthly_expenses = "Enter a positive expense amount.";
    }
    if (
      data.monthly_income &&
      data.monthly_expenses &&
      monthlyExpenses > monthlyIncome
    ) {
      nextErrors.monthly_expenses = "Expenses should not exceed income.";
    }
    if (
      data.current_investments &&
      (Number.isNaN(currentInvestments) || currentInvestments < 0)
    ) {
      nextErrors.current_investments = "Enter a valid investment amount.";
    }
    if (
      data.monthly_investment !== "" &&
      (Number.isNaN(monthlyInvestment) || monthlyInvestment < 0)
    ) {
      nextErrors.monthly_investment = "Enter a valid monthly investment amount.";
    }
    if (
      data.inflation_rate === "" ||
      Number.isNaN(inflationRate) ||
      inflationRate < 0 ||
      inflationRate > 20
    ) {
      nextErrors.inflation_rate = "Inflation rate must be between 0 and 20.";
    }
    if (
      data.annual_return === "" ||
      Number.isNaN(annualReturn) ||
      annualReturn <= 0 ||
      annualReturn > 30
    ) {
      nextErrors.annual_return = "Expected return must be between 0 and 30.";
    }
    if (
      data.safe_withdrawal_rate === "" ||
      Number.isNaN(swr) ||
      swr <= 0 ||
      swr > 8
    ) {
      nextErrors.safe_withdrawal_rate = "SWR must be between 0 and 8.";
    }
    if (!data.risk_level) nextErrors.risk_level = "Select a risk level.";

    return nextErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      onSubmit?.({
        current_age: Number(values.current_age),
        retirement_age: Number(values.retirement_age),
        monthly_income: Number(values.monthly_income),
        monthly_expenses: Number(values.monthly_expenses),
        current_investments: Number(values.current_investments),
        monthly_investment: Number(values.monthly_investment),
        risk_level: values.risk_level,
        inflation_rate: Number(values.inflation_rate),
        annual_return: Number(values.annual_return),
        safe_withdrawal_rate: Number(values.safe_withdrawal_rate),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="fire-form">
      <div className="fire-form-header">
        <div>
          <h2>Craft your timeline</h2>
          <p>Provide the essentials to model your path to independence.</p>
        </div>
        <div className="fire-form-chip">FIRE Blueprint</div>
      </div>

      <div className="fire-form-grid">
        <label className="fire-label">
          <span className="fire-label-title">
            <span className="fire-label-icon" aria-hidden="true">
              🎯
            </span>
            Current Age
          </span>
          <input
            type="number"
            name="current_age"
            value={values.current_age}
            onChange={handleChange}
            min="18"
            max="120"
            className="fire-input"
            placeholder="28"
          />
          {errors.current_age && (
            <span className="fire-error-text">{errors.current_age}</span>
          )}
        </label>

        <label className="fire-label">
          <span className="fire-label-title">
            <span className="fire-label-icon" aria-hidden="true">
              💳
            </span>
            Monthly Investment
          </span>
          <input
            type="number"
            name="monthly_investment"
            value={values.monthly_investment}
            onChange={handleChange}
            min="0"
            className="fire-input"
            placeholder="25000"
          />
          {errors.monthly_investment && (
            <span className="fire-error-text">{errors.monthly_investment}</span>
          )}
        </label>

        <label className="fire-label">
          <span className="fire-label-title">
            <span className="fire-label-icon" aria-hidden="true">
              🏁
            </span>
            Retirement Age
          </span>
          <input
            type="number"
            name="retirement_age"
            value={values.retirement_age}
            onChange={handleChange}
            min="30"
            max="120"
            className="fire-input"
            placeholder="50"
          />
          {errors.retirement_age && (
            <span className="fire-error-text">{errors.retirement_age}</span>
          )}
        </label>

        <label className="fire-label">
          <span className="fire-label-title">
            <span className="fire-label-icon" aria-hidden="true">
              💸
            </span>
            Monthly Income
          </span>
          <input
            type="number"
            name="monthly_income"
            value={values.monthly_income}
            onChange={handleChange}
            min="0"
            className="fire-input"
            placeholder="4500"
          />
          {errors.monthly_income && (
            <span className="fire-error-text">{errors.monthly_income}</span>
          )}
        </label>

        <label className="fire-label">
          <span className="fire-label-title">
            <span className="fire-label-icon" aria-hidden="true">
              🧾
            </span>
            Monthly Expenses
          </span>
          <input
            type="number"
            name="monthly_expenses"
            value={values.monthly_expenses}
            onChange={handleChange}
            min="0"
            className="fire-input"
            placeholder="2600"
          />
          {errors.monthly_expenses && (
            <span className="fire-error-text">{errors.monthly_expenses}</span>
          )}
        </label>

        <label className="fire-label">
          <span className="fire-label-title">
            <span className="fire-label-icon" aria-hidden="true">
              🏦
            </span>
            Current Investments
          </span>
          <input
            type="number"
            name="current_investments"
            value={values.current_investments}
            onChange={handleChange}
            min="0"
            className="fire-input"
            placeholder="25000"
          />
          {errors.current_investments && (
            <span className="fire-error-text">
              {errors.current_investments}
            </span>
          )}
        </label>

        <label className="fire-label">
          <span className="fire-label-title">
            <span className="fire-label-icon" aria-hidden="true">
              🧭
            </span>
            Risk Level
          </span>
          <select
            name="risk_level"
            value={values.risk_level}
            onChange={handleChange}
            className="fire-input"
          >
            {riskOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.risk_level && (
            <span className="fire-error-text">{errors.risk_level}</span>
          )}
        </label>

        <label className="fire-label">
          <span className="fire-label-title">
            <span className="fire-label-icon" aria-hidden="true">
              📉
            </span>
            Inflation Rate (%)
          </span>
          <input
            type="number"
            name="inflation_rate"
            value={values.inflation_rate}
            onChange={handleChange}
            min="0"
            max="20"
            step="0.1"
            className="fire-input"
            placeholder="6"
          />
          {errors.inflation_rate && (
            <span className="fire-error-text">{errors.inflation_rate}</span>
          )}
        </label>

        <label className="fire-label">
          <span className="fire-label-title">
            <span className="fire-label-icon" aria-hidden="true">
              📈
            </span>
            Expected Return (%)
          </span>
          <input
            type="number"
            name="annual_return"
            value={values.annual_return}
            onChange={handleChange}
            min="0.1"
            max="30"
            step="0.1"
            className="fire-input"
            placeholder="12"
          />
          {errors.annual_return && (
            <span className="fire-error-text">{errors.annual_return}</span>
          )}
        </label>

        <label className="fire-label">
          <span className="fire-label-title">
            <span className="fire-label-icon" aria-hidden="true">
              🧮
            </span>
            Safe Withdrawal Rate (%)
          </span>
          <input
            type="number"
            name="safe_withdrawal_rate"
            value={values.safe_withdrawal_rate}
            onChange={handleChange}
            min="0.1"
            max="8"
            step="0.1"
            className="fire-input"
            placeholder="4"
          />
          {errors.safe_withdrawal_rate && (
            <span className="fire-error-text">{errors.safe_withdrawal_rate}</span>
          )}
        </label>
      </div>

      <div className="fire-actions">
        <button type="submit" className="fire-button">
          Generate FIRE Plan
        </button>
        <p className="fire-helper">
          We never store your entries without consent.
        </p>
      </div>
    </form>
  );
}
