import { useMemo, useState } from "react";

const initialValues = {
  current_age: "",
  retirement_age: "",
  monthly_income: "",
  monthly_expenses: "",
  current_investments: "",
  risk_level: "moderate",
};

const riskOptions = [
  { value: "conservative", label: "Conservative" },
  { value: "moderate", label: "Moderate" },
  { value: "aggressive", label: "Aggressive" },
];

export default function FireForm({ onSubmit }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

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

    if (!data.current_age) nextErrors.current_age = "Current age is required.";
    if (!data.retirement_age)
      nextErrors.retirement_age = "Retirement age is required.";
    if (!data.monthly_income)
      nextErrors.monthly_income = "Monthly income is required.";
    if (!data.monthly_expenses)
      nextErrors.monthly_expenses = "Monthly expenses are required.";
    if (!data.current_investments)
      nextErrors.current_investments = "Current investments are required.";

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
    if (!data.risk_level) nextErrors.risk_level = "Select a risk level.";

    return nextErrors;
  };

  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

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
        risk_level: values.risk_level,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm text-slate-200">
          Current Age
          <input
            type="number"
            name="current_age"
            value={values.current_age}
            onChange={handleChange}
            min="18"
            max="120"
            className="mt-2 w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="28"
          />
          {errors.current_age && (
            <p className="mt-1 text-xs text-rose-300">{errors.current_age}</p>
          )}
        </label>

        <label className="block text-sm text-slate-200">
          Retirement Age
          <input
            type="number"
            name="retirement_age"
            value={values.retirement_age}
            onChange={handleChange}
            min="30"
            max="120"
            className="mt-2 w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="50"
          />
          {errors.retirement_age && (
            <p className="mt-1 text-xs text-rose-300">
              {errors.retirement_age}
            </p>
          )}
        </label>

        <label className="block text-sm text-slate-200">
          Monthly Income
          <input
            type="number"
            name="monthly_income"
            value={values.monthly_income}
            onChange={handleChange}
            min="0"
            className="mt-2 w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="4500"
          />
          {errors.monthly_income && (
            <p className="mt-1 text-xs text-rose-300">
              {errors.monthly_income}
            </p>
          )}
        </label>

        <label className="block text-sm text-slate-200">
          Monthly Expenses
          <input
            type="number"
            name="monthly_expenses"
            value={values.monthly_expenses}
            onChange={handleChange}
            min="0"
            className="mt-2 w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="2600"
          />
          {errors.monthly_expenses && (
            <p className="mt-1 text-xs text-rose-300">
              {errors.monthly_expenses}
            </p>
          )}
        </label>

        <label className="block text-sm text-slate-200">
          Current Investments
          <input
            type="number"
            name="current_investments"
            value={values.current_investments}
            onChange={handleChange}
            min="0"
            className="mt-2 w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="25000"
          />
          {errors.current_investments && (
            <p className="mt-1 text-xs text-rose-300">
              {errors.current_investments}
            </p>
          )}
        </label>

        <label className="block text-sm text-slate-200">
          Risk Level
          <select
            name="risk_level"
            value={values.risk_level}
            onChange={handleChange}
            className="mt-2 w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {riskOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.risk_level && (
            <p className="mt-1 text-xs text-rose-300">{errors.risk_level}</p>
          )}
        </label>
      </div>

      <button
        type="submit"
        className="w-full md:w-auto px-6 py-2.5 rounded-full bg-emerald-400 text-slate-900 font-semibold text-sm tracking-wide shadow-lg shadow-emerald-500/20 hover:bg-emerald-300 transition"
        disabled={hasErrors}
      >
        Generate FIRE Plan
      </button>
    </form>
  );
}
