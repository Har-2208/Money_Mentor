import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, Link, useNavigate } from "react-router-dom";
import FirePlanner from "./pages/fireplanner";
import TaxPlanner from "./pages/TaxPlanner";
import PortfolioAnalyzer from "./pages/PortfolioAnalyzer";
import LifeEventPlanner from "./pages/LifeEventPlanner";
import CouplePlanner from "./pages/CouplePlanner";
import agentService from "./services/agentService";
import {
  getCurrentSessionUser,
  signInWithEmail,
  signOutSession,
  signUpWithEmail,
} from "./services/authService";
import {
  addTransaction as addSupabaseTransaction,
  loadFinancialInputs,
  listTransactions,
  upsertFinancialInputs,
} from "./services/supabaseDataService";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createEmptyFinance() {
  return {
    monthlyBudget: 0,
    balance: 0,
    spent: 0,
    income: 0,
    expenses: 0,
    goal: {
      name: "Primary Goal",
      target: 0,
      saved: 0,
    },
    assets: {
      savings: 0,
      investments: 0,
      realEstate: 0,
      otherAssets: 0,
    },
    liabilities: {
      homeLoan: 0,
      personalLoan: 0,
      creditCard: 0,
    },
    insurance: {
      health: false,
      life: false,
      coverage: 0,
    },
    emergencyFund: 0,
    emergencyFundTarget: 0,
    debt: 0,
    taxSavings: 0,
    retirement: 0,
    transactions: [],
  };
}

function buildFinanceFromProfile(profile) {
  if (!profile) return createEmptyFinance();

  const monthlyIncome =
    (toNumber(profile.income.baseSalary) +
      toNumber(profile.income.hra) +
      toNumber(profile.income.otherAllowances) +
      toNumber(profile.income.otherIncome)) /
    12;

  const monthlyExpenses =
    toNumber(profile.expenses.rent) +
    toNumber(profile.expenses.food) +
    toNumber(profile.expenses.travel) +
    toNumber(profile.expenses.subscriptions) +
    toNumber(profile.expenses.misc) +
    toNumber(profile.liabilities.emi);

  const savings = toNumber(profile.assets.cash) + toNumber(profile.assets.fd);
  const investments =
    toNumber(profile.assets.mutualFunds) +
    toNumber(profile.assets.ppf) +
    toNumber(profile.assets.stocks);

  const debt =
    toNumber(profile.liabilities.homeLoan) +
    toNumber(profile.liabilities.creditCardDues);

  const primaryGoal = profile.goals?.[0] || {
    type: "Primary Goal",
    targetAmount: 0,
  };
  const targetGoalAmount = toNumber(primaryGoal.targetAmount);
  const monthlyBudget = monthlyIncome > 0 ? monthlyIncome : monthlyExpenses;

  return {
    monthlyBudget: Math.max(monthlyBudget, 0),
    balance: Math.max(savings, 0),
    spent: Math.max(monthlyExpenses, 0),
    income: Math.max(monthlyIncome, 0),
    expenses: Math.max(monthlyExpenses, 0),
    goal: {
      name: primaryGoal.type || "Primary Goal",
      target: targetGoalAmount,
      saved: Math.max(0, Math.min(savings, targetGoalAmount || savings)),
    },
    assets: {
      savings,
      investments,
      realEstate: 0,
      otherAssets: 0,
    },
    liabilities: {
      homeLoan: toNumber(profile.liabilities.homeLoan),
      personalLoan: 0,
      creditCard: toNumber(profile.liabilities.creditCardDues),
    },
    insurance: {
      health: toNumber(profile.insurance.healthInsurance) > 0,
      life: toNumber(profile.insurance.lifeInsurance) > 0,
      coverage:
        toNumber(profile.insurance.healthInsurance) +
        toNumber(profile.insurance.lifeInsurance),
    },
    emergencyFund: savings,
    emergencyFundTarget: monthlyExpenses * 6,
    debt,
    taxSavings: 0,
    retirement: investments,
    transactions: [],
  };
}

function formatINR(value) {
  return `INR ${Math.round(value).toLocaleString("en-IN")}`;
}

const AUTO_DETECT_EXPENSE_CATEGORY = "Auto Detect";

const EXPENSE_CATEGORIES = [
  "Food",
  "Travel",
  "Housing",
  "Utilities",
  "Healthcare",
  "Shopping",
  "Entertainment",
  "Education",
  "Insurance",
  "Debt/EMI",
  "Family",
  "Personal Care",
  "Subscriptions",
  "Investments",
  "Other",
];

const INCOME_CATEGORIES = [
  "Salary",
  "Bonus",
  "Freelance",
  "Business",
  "Investment Income",
  "Interest",
  "Rental Income",
  "Gift",
  "Refund",
  "Other Income",
];

function classifyExpenseCategory(description) {
  const text = (description || "").toLowerCase();

  const rules = [
    { name: "Food", keywords: ["food", "grocery", "groceries", "restaurant", "swiggy", "zomato", "dining"] },
    { name: "Travel", keywords: ["travel", "uber", "ola", "fuel", "petrol", "diesel", "cab", "metro", "bus", "train", "flight", "taxi"] },
    { name: "Housing", keywords: ["rent", "maintenance", "society", "housing"] },
    { name: "Utilities", keywords: ["electricity", "water", "internet", "wifi", "mobile", "recharge", "gas", "utility"] },
    { name: "Healthcare", keywords: ["health", "hospital", "medical", "medicine", "doctor", "pharmacy"] },
    { name: "Shopping", keywords: ["shopping", "amazon", "flipkart", "clothes", "apparel", "electronics"] },
    { name: "Entertainment", keywords: ["movie", "netflix", "spotify", "entertainment", "game", "concert"] },
    { name: "Education", keywords: ["course", "education", "tuition", "books", "exam", "school", "college"] },
    { name: "Insurance", keywords: ["insurance", "premium"] },
    { name: "Debt/EMI", keywords: ["emi", "loan", "debt", "repayment"] },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      return rule.name;
    }
  }

  return "Other";
}

function cleanAgentLine(line) {
  if (!line) return "";
  return line
    .replace(/\*\*\*(.*?)\*\*\*/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`+/g, "")
    .replace(/^#+\s*/, "")
    .replace(/^>\s*/, "")
    .replace(/^"+|"+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function structureAgentExplanation(explanation) {
  const fallback = {
    answer: "No AI response was returned.",
    reasoning: "The backend did not return a readable explanation.",
    points: [],
  };

  if (typeof explanation !== "string" || !explanation.trim()) {
    return fallback;
  }

  const lines = explanation
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !/^["'`]{3,}$/.test(line) && !/^(\*{3,}|-{3,}|_{3,})$/.test(line),
    );

  const paragraphs = [];
  const points = [];

  lines.forEach((line) => {
    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    const numberedMatch = line.match(/^\d+[.)]\s+(.+)$/);
    const content = bulletMatch
      ? bulletMatch[1]
      : numberedMatch
        ? numberedMatch[1]
        : line;
    const cleaned = cleanAgentLine(content);
    if (!cleaned) return;

    if (bulletMatch || numberedMatch) {
      points.push(cleaned);
    } else {
      paragraphs.push(cleaned);
    }
  });

  const dedupedPoints = [...new Set(points)].slice(0, 6);
  const answer = paragraphs[0] || dedupedPoints[0] || fallback.answer;
  const reasoning =
    paragraphs.slice(1).join(" ") ||
    (dedupedPoints.length > 0
      ? "Key recommendations are structured below."
      : fallback.reasoning);

  return {
    answer,
    reasoning,
    points: dedupedPoints,
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Initial onboarding state
const initialOnboarding = {
  personalInfo: {
    age: "",
    city: "",
    maritalStatus: "",
    dependents: 0,
  },
  income: {
    baseSalary: "",
    hra: "",
    otherAllowances: "",
    bonus: "",
    otherIncome: "",
  },
  expenses: {
    rent: "",
    food: "",
    travel: "",
    subscriptions: "",
    misc: "",
  },
  assets: {
    mutualFunds: "",
    ppf: "",
    stocks: "",
    fd: "",
    cash: "",
  },
  liabilities: {
    homeLoan: "",
    emi: "",
    creditCardDues: "",
  },
  insurance: {
    healthInsurance: "",
    lifeInsurance: "",
  },
  goals: [
    { type: "Retirement", targetAmount: "", years: "" },
    { type: "Car", targetAmount: "", years: "" },
    { type: "Travel", targetAmount: "", years: "" },
  ],
  riskProfile: "",
  completed: false,
};

function getFirstIncompleteProfileSection(data) {
  if (
    !data.personalInfo.age ||
    !data.personalInfo.city ||
    !data.personalInfo.maritalStatus ||
    data.personalInfo.dependents === ""
  )
    return 0;
  if (
    !data.income.baseSalary ||
    !data.income.hra ||
    !data.income.otherAllowances ||
    !data.income.otherIncome
  )
    return 1;
  if (
    !data.expenses.rent ||
    !data.expenses.food ||
    !data.expenses.travel ||
    !data.expenses.subscriptions ||
    !data.expenses.misc
  )
    return 2;
  if (
    !data.assets.mutualFunds ||
    !data.assets.ppf ||
    !data.assets.stocks ||
    !data.assets.fd ||
    !data.assets.cash
  )
    return 3;
  if (
    !data.liabilities.homeLoan ||
    !data.liabilities.emi ||
    !data.liabilities.creditCardDues
  )
    return 4;
  if (!data.insurance.healthInsurance || !data.insurance.lifeInsurance)
    return 5;
  if (data.goals.some((goal) => !goal.targetAmount || !goal.years)) return 6;
  if (!data.riskProfile) return 7;
  return 7;
}

function OnboardingPage({ user, onComplete }) {
  const navigate = useNavigate();
  const userId = user?.user_id || user?.id;
  const [currentSection, setCurrentSection] = useState(0);
  const [data, setData] = useState(initialOnboarding);
  const [skipWarning, setSkipWarning] = useState(false);

  const sections = [
    "Personal Info",
    "Income",
    "Expenses",
    "Assets & Investments",
    "Liabilities",
    "Insurance",
    "Goals",
    "Risk Profile",
  ];

  useEffect(() => {
    const loadSavedInputs = async () => {
      try {
        const existing = await loadFinancialInputs(userId);
        if (existing) {
          setData(existing);
        }
      } catch {
        // Keep empty onboarding state if Supabase read fails.
      }
    };
    loadSavedInputs();
  }, [userId]);

  const handleNext = async () => {
    try {
      await upsertFinancialInputs(userId, data);
    } catch {
      // Keep UX uninterrupted when Supabase write fails mid-onboarding.
    }

    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkipSection = () => {
    setSkipWarning(false);
    handleNext();
  };

  const handleComplete = async () => {
    const completedPayload = {
      ...data,
      completed: true,
    };
    try {
      await upsertFinancialInputs(userId, completedPayload);
    } catch {
      // Let users proceed even if network write fails.
    }

    onComplete();
    navigate("/");
  };

  const handleSkip = () => {
    setSkipWarning(true);
  };

  const updateField = (path, value) => {
    const newData = JSON.parse(JSON.stringify(data));
    const keys = path.split(".");
    let current = newData;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    setData(newData);
  };

  const updateArrayField = (arrayName, index, field, value) => {
    const newData = JSON.parse(JSON.stringify(data));
    newData[arrayName][index][field] = value;
    setData(newData);
  };

  return (
    <div className="onboarding-container">
      <div className="bg-orb orb-a"></div>
      <div className="bg-orb orb-b"></div>

      <section className="onboarding-gate">
        <article className="onboarding-card glass">
          {/* Progress bar */}
          <div className="onboarding-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${((currentSection + 1) / sections.length) * 100}%`,
                }}
              ></div>
            </div>
            <p className="progress-text">
              Section {currentSection + 1} of {sections.length}
            </p>
          </div>

          {/* Skip warning */}
          {skipWarning && (
            <div className="warning-box">
              <strong>Skip onboarding?</strong>
              <p>
                You can always complete this later from your profile settings.
              </p>
              <div className="button-group">
                <button onClick={handleComplete} className="btn-primary">
                  Yes, Go to Dashboard
                </button>
                <button
                  onClick={() => setSkipWarning(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!skipWarning && (
            <>
              <div className="onboarding-content">
                <h2>{sections[currentSection]}</h2>

                {/* Section 1: Personal Info */}
                {currentSection === 0 && (
                  <div className="section-form">
                    <label>
                      Age
                      <input
                        type="number"
                        value={data.personalInfo.age}
                        onChange={(e) =>
                          updateField("personalInfo.age", e.target.value)
                        }
                        min="18"
                        max="120"
                      />
                    </label>
                    <label>
                      City
                      <input
                        type="text"
                        value={data.personalInfo.city}
                        onChange={(e) =>
                          updateField("personalInfo.city", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Marital Status
                      <select
                        value={data.personalInfo.maritalStatus}
                        onChange={(e) =>
                          updateField(
                            "personalInfo.maritalStatus",
                            e.target.value,
                          )
                        }
                      >
                        <option value="">Select...</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                      </select>
                    </label>
                    <label>
                      Number of Dependents
                      <input
                        type="number"
                        value={data.personalInfo.dependents}
                        onChange={(e) =>
                          updateField("personalInfo.dependents", e.target.value)
                        }
                        min="0"
                      />
                    </label>
                  </div>
                )}

                {/* Section 2: Income */}
                {currentSection === 1 && (
                  <div className="section-form">
                    <label>
                      Base Salary (Annual)
                      <input
                        type="number"
                        value={data.income.baseSalary}
                        onChange={(e) =>
                          updateField("income.baseSalary", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      HRA (Annual)
                      <input
                        type="number"
                        value={data.income.hra}
                        onChange={(e) =>
                          updateField("income.hra", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Other Allowances (Annual)
                      <input
                        type="number"
                        value={data.income.otherAllowances}
                        onChange={(e) =>
                          updateField("income.otherAllowances", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Bonus (Annual, optional)
                      <input
                        type="number"
                        value={data.income.bonus}
                        onChange={(e) =>
                          updateField("income.bonus", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Other Income (Annual)
                      <input
                        type="number"
                        value={data.income.otherIncome}
                        onChange={(e) =>
                          updateField("income.otherIncome", e.target.value)
                        }
                      />
                    </label>
                  </div>
                )}

                {/* Section 3: Expenses */}
                {currentSection === 2 && (
                  <div className="section-form">
                    <p className="section-hint">Enter monthly amounts:</p>
                    <label>
                      Rent (Monthly)
                      <input
                        type="number"
                        value={data.expenses.rent}
                        onChange={(e) =>
                          updateField("expenses.rent", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Food & Groceries (Monthly)
                      <input
                        type="number"
                        value={data.expenses.food}
                        onChange={(e) =>
                          updateField("expenses.food", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Travel & Transport (Monthly)
                      <input
                        type="number"
                        value={data.expenses.travel}
                        onChange={(e) =>
                          updateField("expenses.travel", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Subscriptions & Services (Monthly)
                      <input
                        type="number"
                        value={data.expenses.subscriptions}
                        onChange={(e) =>
                          updateField("expenses.subscriptions", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Miscellaneous (Monthly)
                      <input
                        type="number"
                        value={data.expenses.misc}
                        onChange={(e) =>
                          updateField("expenses.misc", e.target.value)
                        }
                      />
                    </label>
                  </div>
                )}

                {/* Section 4: Assets & Investments */}
                {currentSection === 3 && (
                  <div className="section-form">
                    <label>
                      Mutual Funds Total Value
                      <input
                        type="number"
                        value={data.assets.mutualFunds}
                        onChange={(e) =>
                          updateField("assets.mutualFunds", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Public Provident Fund (PPF)
                      <input
                        type="number"
                        value={data.assets.ppf}
                        onChange={(e) =>
                          updateField("assets.ppf", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Stocks Value
                      <input
                        type="number"
                        value={data.assets.stocks}
                        onChange={(e) =>
                          updateField("assets.stocks", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Fixed Deposits (FD)
                      <input
                        type="number"
                        value={data.assets.fd}
                        onChange={(e) =>
                          updateField("assets.fd", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Cash on Hand
                      <input
                        type="number"
                        value={data.assets.cash}
                        onChange={(e) =>
                          updateField("assets.cash", e.target.value)
                        }
                      />
                    </label>
                  </div>
                )}

                {/* Section 5: Liabilities */}
                {currentSection === 4 && (
                  <div className="section-form">
                    <label>
                      Home Loan Outstanding
                      <input
                        type="number"
                        value={data.liabilities.homeLoan}
                        onChange={(e) =>
                          updateField("liabilities.homeLoan", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Monthly EMI
                      <input
                        type="number"
                        value={data.liabilities.emi}
                        onChange={(e) =>
                          updateField("liabilities.emi", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Credit Card Dues
                      <input
                        type="number"
                        value={data.liabilities.creditCardDues}
                        onChange={(e) =>
                          updateField(
                            "liabilities.creditCardDues",
                            e.target.value,
                          )
                        }
                      />
                    </label>
                  </div>
                )}

                {/* Section 6: Insurance */}
                {currentSection === 5 && (
                  <div className="section-form">
                    <label>
                      Health Insurance Premium (Annual)
                      <input
                        type="number"
                        value={data.insurance.healthInsurance}
                        onChange={(e) =>
                          updateField(
                            "insurance.healthInsurance",
                            e.target.value,
                          )
                        }
                      />
                    </label>
                    <label>
                      Life Insurance Premium (Annual)
                      <input
                        type="number"
                        value={data.insurance.lifeInsurance}
                        onChange={(e) =>
                          updateField("insurance.lifeInsurance", e.target.value)
                        }
                      />
                    </label>
                  </div>
                )}

                {/* Section 7: Goals */}
                {currentSection === 6 && (
                  <div className="section-form">
                    {data.goals.map((goal, idx) => (
                      <div key={idx} className="goal-group">
                        <h4>{goal.type}</h4>
                        <label>
                          Target Amount
                          <input
                            type="number"
                            value={goal.targetAmount}
                            onChange={(e) =>
                              updateArrayField(
                                "goals",
                                idx,
                                "targetAmount",
                                e.target.value,
                              )
                            }
                          />
                        </label>
                        <label>
                          Time Horizon (Years)
                          <input
                            type="number"
                            value={goal.years}
                            onChange={(e) =>
                              updateArrayField(
                                "goals",
                                idx,
                                "years",
                                e.target.value,
                              )
                            }
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {/* Section 8: Risk Profile */}
                {currentSection === 7 && (
                  <div className="section-form">
                    <p className="section-hint">
                      How comfortable are you with investment risk?
                    </p>
                    <div className="radio-group">
                      <label>
                        <input
                          type="radio"
                          value="Conservative"
                          checked={data.riskProfile === "Conservative"}
                          onChange={(e) =>
                            updateField("riskProfile", e.target.value)
                          }
                        />
                        Conservative (Stable returns, low volatility)
                      </label>
                      <label>
                        <input
                          type="radio"
                          value="Moderate"
                          checked={data.riskProfile === "Moderate"}
                          onChange={(e) =>
                            updateField("riskProfile", e.target.value)
                          }
                        />
                        Moderate (Balanced growth and stability)
                      </label>
                      <label>
                        <input
                          type="radio"
                          value="Aggressive"
                          checked={data.riskProfile === "Aggressive"}
                          onChange={(e) =>
                            updateField("riskProfile", e.target.value)
                          }
                        />
                        Aggressive (High growth potential, higher risk)
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="onboarding-actions">
                <div className="button-group-flex">
                  <button
                    className="btn-prev-section"
                    onClick={() =>
                      setCurrentSection(Math.max(0, currentSection - 1))
                    }
                    disabled={currentSection === 0}
                  >
                    ← Previous
                  </button>
                  <button
                    className="btn-fill-later"
                    onClick={async () => {
                      try {
                        await upsertFinancialInputs(userId, data);
                      } catch {
                        // Continue with in-memory state if Supabase write fails.
                      }
                      navigate("/");
                    }}
                  >
                    Fill Later
                  </button>
                  <button onClick={handleNext} className="btn-primary">
                    {currentSection === sections.length - 1
                      ? "Complete Setup"
                      : "Next Section →"}
                  </button>
                </div>
              </div>
              <div className="onboarding-skip">
                <button onClick={handleSkip} className="btn-skip-text">
                  Skip Onboarding
                </button>
              </div>
            </>
          )}
        </article>
      </section>
    </div>
  );
}

function AuthLayout({ children }) {
  return (
    <>
      <div className="bg-orb orb-a"></div>
      <div className="bg-orb orb-b"></div>
      <section className="auth-gate" aria-label="Authentication">
        <article className="auth-card glass">{children}</article>
      </section>
    </>
  );
}

function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const user = await signInWithEmail({
        email: email.trim().toLowerCase(),
        password,
      });
      onLogin(user);
      navigate("/", { replace: true });
    } catch (error) {
      setMessage(error?.message || "Invalid credentials. Try again.");
    }
  };

  return (
    <AuthLayout>
      <p className="card-label">Secure Access</p>
      <h2>Welcome to AI Money Mentor</h2>
      <p className="auth-copy">
        Sign in to continue with your financial assistant, insights, and
        decision dashboards.
      </p>

      <form className="auth-form" onSubmit={submit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit">Login to Dashboard</button>
      </form>

      <p className="auth-switch">
        Dont have an account ?{" "}
        <Link to="/signup" className="auth-link">
          Sign Up
        </Link>
      </p>
      <p className="auth-message">{message}</p>
    </AuthLayout>
  );
}

function SignupPage({ onSignup }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();

    if (!name.trim() || !isValidEmail(normalized)) {
      setMessage("Please enter a valid name and email.");
      return;
    }
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }

    try {
      const { sessionUser, requiresEmailVerification } = await signUpWithEmail({
        fullName: name.trim(),
        email: normalized,
        password,
      });

      if (sessionUser) {
        onSignup(sessionUser);
        navigate("/onboarding", { replace: true });
        return;
      }

      if (requiresEmailVerification) {
        setMessage(
          "Signup successful. Please verify your email, then login.",
        );
        navigate("/login", { replace: true });
      }
    } catch (error) {
      setMessage(error?.message || "Signup failed. Please try again.");
    }
  };

  return (
    <AuthLayout>
      <p className="card-label">Create Account</p>
      <h2>Sign Up for AI Money Mentor</h2>
      <p className="auth-copy">
        Set up your account to unlock personalized AI guidance, insights, and
        planning tools.
      </p>

      <form className="auth-form" onSubmit={submit}>
        <label>
          Full Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <label>
          Confirm Password
          <input
            type="password"
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </label>
        <button type="submit">Create Account</button>
      </form>

      <p className="auth-switch">
        Already have an account ?{" "}
        <Link to="/login" className="auth-link">
          Login
        </Link>
      </p>
      <p className="auth-message">{message}</p>
    </AuthLayout>
  );
}

function DashboardApp({ user, onLogout }) {
  const [activeScreen, setActiveScreen] = useState("dashboard");
  const [profileData, setProfileData] = useState(initialOnboarding);
  const [finance, setFinance] = useState(() => buildFinanceFromProfile(initialOnboarding));
  const [chatInput, setChatInput] = useState("");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentProfileSection, setCurrentProfileSection] = useState(0);
  const [chatMessages, setChatMessages] = useState([
    {
      role: "ai",
      answer: "Ask a question to begin personalized guidance.",
      reasoning:
        "Warning: This is AI-generated guidance, not licensed financial advice.",
      impact: "",
    },
  ]);
  const [chatPending, setChatPending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [notification, setNotification] = useState({
    type: "good",
    text: "You are within healthy budget range.",
  });
  const [txnForm, setTxnForm] = useState({
    type: "Debit",
    category: AUTO_DETECT_EXPENSE_CATEGORY,
    desc: "",
    amount: "",
  });
  const userId = user?.user_id || user?.id;

  useEffect(() => {
    if (!userId) return;

    const loadSupabaseProfile = async () => {
      try {
        const existing = await loadFinancialInputs(userId);
        if (existing) {
          setProfileData(existing);
        }
      } catch {
        // Keep default state if Supabase read fails.
      }
    };

    loadSupabaseProfile();
  }, [userId]);

  useEffect(() => {
    if (showProfileModal) {
      setCurrentProfileSection(getFirstIncompleteProfileSection(profileData));
    }
  }, [showProfileModal]);

  useEffect(() => {
    setFinance((prev) => {
      const base = buildFinanceFromProfile(profileData);
      const txns = prev.transactions || [];
      const netTxnAmount = txns.reduce((sum, txn) => sum + toNumber(txn.amount), 0);
      const debitTxnTotal = txns.reduce(
        (sum, txn) => (toNumber(txn.amount) < 0 ? sum + Math.abs(toNumber(txn.amount)) : sum),
        0,
      );

      return {
        ...base,
        balance: Math.max(base.balance + netTxnAmount, 0),
        spent: Math.max(base.expenses + debitTxnTotal, 0),
        transactions: txns,
      };
    });
  }, [profileData]);

  useEffect(() => {
    if (activeScreen !== "insights") {
      return;
    }

    const loadInsights = async () => {
      setInsightsLoading(true);
      try {
        const salary =
          toNumber(profileData.income.baseSalary) +
          toNumber(profileData.income.otherIncome) * 12;
        const deductions = {
          "80C": Math.max(0, toNumber(profileData.assets.ppf)),
          "80D": Math.max(0, toNumber(profileData.insurance.healthInsurance)),
        };

        const [tax, fire, lifeEvent, couple] = await Promise.all([
          agentService.getTaxAnalysis(userId, salary || null, deductions),
          agentService.getFirePlan(
            userId,
            toNumber(profileData.goals?.[0]?.years)
              ? toNumber(profileData.personalInfo.age) +
                  toNumber(profileData.goals[0].years)
              : null,
          ),
          agentService.getLifeEventPlan(
            userId,
            "Annual financial planning review",
            false,
          ),
          agentService.getCouplePlan(userId, false),
        ]);

        setAgentInsights({ tax, fire, lifeEvent, couple });
      } catch {
        setAgentInsights({
          tax: null,
          fire: null,
          lifeEvent: null,
          couple: null,
        });
      } finally {
        setInsightsLoading(false);
      }
    };

    loadInsights();
  }, [activeScreen, profileData, userId]);

  useEffect(() => {
    if (!userId) return;

    const loadTransactionsFromSupabase = async () => {
      try {
        const rows = await listTransactions(userId);
        const normalized = rows.map((row) => {
          const amount = toNumber(row.amount);
          return {
            id: row.id,
            desc: row.description || "Transaction",
            category: row.category || "Other",
            amount: row.txn_type === "debit" ? -Math.abs(amount) : Math.abs(amount),
          };
        });

        setFinance((prev) => ({
          ...prev,
          transactions: normalized,
        }));
      } catch {
        // Keep local transactions as fallback if Supabase read fails.
      }
    };

    loadTransactionsFromSupabase();
  }, [userId]);
  // Calculate profile completion percentage
  const profileCompletion = useMemo(() => {
    let filledFields = 0;
    let totalFields = 0;

    // Personal Info
    totalFields += 4;
    if (profileData.personalInfo.age) filledFields++;
    if (profileData.personalInfo.city) filledFields++;
    if (profileData.personalInfo.maritalStatus) filledFields++;
    if (profileData.personalInfo.dependents) filledFields++;

    // Income
    totalFields += 5;
    if (profileData.income.baseSalary) filledFields++;
    if (profileData.income.hra) filledFields++;
    if (profileData.income.otherAllowances) filledFields++;
    if (profileData.income.bonus) filledFields++;
    if (profileData.income.otherIncome) filledFields++;

    // Expenses
    totalFields += 5;
    if (profileData.expenses.rent) filledFields++;
    if (profileData.expenses.food) filledFields++;
    if (profileData.expenses.travel) filledFields++;
    if (profileData.expenses.subscriptions) filledFields++;
    if (profileData.expenses.misc) filledFields++;

    // Assets
    totalFields += 5;
    if (profileData.assets.mutualFunds) filledFields++;
    if (profileData.assets.ppf) filledFields++;
    if (profileData.assets.stocks) filledFields++;
    if (profileData.assets.fd) filledFields++;
    if (profileData.assets.cash) filledFields++;

    // Liabilities
    totalFields += 3;
    if (profileData.liabilities.homeLoan) filledFields++;
    if (profileData.liabilities.emi) filledFields++;
    if (profileData.liabilities.creditCardDues) filledFields++;

    // Insurance
    totalFields += 2;
    if (profileData.insurance.healthInsurance) filledFields++;
    if (profileData.insurance.lifeInsurance) filledFields++;

    // Goals
    totalFields += 3;
    profileData.goals.forEach((goal) => {
      if (goal.targetAmount) filledFields++;
    });

    // Risk Profile
    totalFields += 1;
    if (profileData.riskProfile) filledFields++;

    return Math.round((filledFields / totalFields) * 100);
  }, [profileData]);

  // Money Health Score Calculation (0-100)
  const hasMoneyHealthInputs = useMemo(() => {
    const incomeTotal =
      toNumber(profileData.income.baseSalary) +
      toNumber(profileData.income.hra) +
      toNumber(profileData.income.otherAllowances) +
      toNumber(profileData.income.bonus) +
      toNumber(profileData.income.otherIncome);

    const expenseTotal =
      toNumber(profileData.expenses.rent) +
      toNumber(profileData.expenses.food) +
      toNumber(profileData.expenses.travel) +
      toNumber(profileData.expenses.subscriptions) +
      toNumber(profileData.expenses.misc);

    const assetTotal =
      toNumber(profileData.assets.mutualFunds) +
      toNumber(profileData.assets.ppf) +
      toNumber(profileData.assets.stocks) +
      toNumber(profileData.assets.fd) +
      toNumber(profileData.assets.cash);

    const liabilityTotal =
      toNumber(profileData.liabilities.homeLoan) +
      toNumber(profileData.liabilities.emi) +
      toNumber(profileData.liabilities.creditCardDues);

    const insuranceTotal =
      toNumber(profileData.insurance.healthInsurance) +
      toNumber(profileData.insurance.lifeInsurance);

    const goalTotal = profileData.goals.reduce(
      (sum, goal) => sum + toNumber(goal.targetAmount),
      0,
    );

    return (
      incomeTotal > 0 ||
      expenseTotal > 0 ||
      assetTotal > 0 ||
      liabilityTotal > 0 ||
      insuranceTotal > 0 ||
      goalTotal > 0
    );
  }, [profileData]);

  const moneyHealthScore = useMemo(() => {
    const emptyBreakdown = {
      emergencyFund: 0,
      insurance: 0,
      debt: 0,
      investment: 0,
      tax: 0,
      retirement: 0,
    };

    if (!hasMoneyHealthInputs) {
      return { available: false, total: 0, breakdown: emptyBreakdown };
    }

    const annualIncome = Math.max(0, (finance.income || 0) * 12);
    const totalDebt =
      finance.liabilities.homeLoan +
      finance.liabilities.personalLoan +
      finance.liabilities.creditCard;

    const scores = {
      emergencyFund:
        finance.emergencyFundTarget > 0
          ? Math.max(
              0,
              Math.min(
                100,
                (finance.emergencyFund / finance.emergencyFundTarget) * 100,
              ),
            )
          : 0,
      insurance:
        finance.insurance.health && finance.insurance.life
          ? 100
          : finance.insurance.health || finance.insurance.life
            ? 60
            : 0,
      debt:
        totalDebt <= 0
          ? 100
          : annualIncome > 0
            ? Math.max(0, Math.min(100, 100 - (totalDebt / annualIncome) * 100))
            : 0,
      investment: Math.max(
        0,
        Math.min(100, (finance.assets.investments / 500000) * 100),
      ),
      tax: 0,
      retirement: Math.max(0, Math.min(100, (finance.retirement / 500000) * 100)),
    };

    const declaredTaxSavings =
      toNumber(profileData.assets.ppf) +
      toNumber(profileData.insurance.healthInsurance);
    scores.tax = Math.max(0, Math.min(100, (declaredTaxSavings / 150000) * 100));

    const weightedScore =
      scores.emergencyFund * 0.2 +
      scores.insurance * 0.15 +
      scores.debt * 0.15 +
      scores.investment * 0.2 +
      scores.tax * 0.15 +
      scores.retirement * 0.15;

    return {
      available: true,
      total: Math.round(weightedScore),
      breakdown: scores,
    };
  }, [finance, hasMoneyHealthInputs, profileData]);

  // Monthly Cash Flow
  const cashFlow = useMemo(() => {
    return {
      income: finance.income || 0,
      expenses: finance.expenses || 0,
      surplus: (finance.income || 0) - (finance.expenses || 0),
    };
  }, [finance]);

  // Smart Alerts
  const alerts = useMemo(() => {
    const alertList = [];

    // Overspending alert
    if (finance.spent > finance.monthlyBudget * 0.8) {
      alertList.push({
        id: "overspending",
        type: "warn",
        message: `You are overspending! ${formatINR(finance.spent)} of ${formatINR(finance.monthlyBudget)} budget used.`,
        action: "Review expenses",
        prompt:
          "I am overspending against my monthly budget. Analyze my situation and give me a concrete expense reduction plan for the next 30 days with priorities and cut suggestions.",
      });
    }

    // Tax saving opportunity
    if (profileData.income.baseSalary > 0 && finance.taxSavings === 0) {
      alertList.push({
        id: "tax-saving",
        type: "info",
        message:
          "Tax saving opportunity detected! Invest in PPF or ELSS for 80C deduction.",
        action: "Learn more",
        prompt:
          "Help me optimize tax savings based on my profile. Explain what I should do under 80C and 80D first, how much to allocate, and what order I should follow this year.",
      });
    }

    // Emergency fund alert
    if (finance.emergencyFund < finance.emergencyFundTarget * 0.5) {
      alertList.push({
        id: "emergency-fund",
        type: "info",
        message: `Emergency fund is low. Target: ${formatINR(finance.emergencyFundTarget)}`,
        action: "Increase fund",
        prompt:
          "My emergency fund is below target. Build me a step-by-step emergency fund catch-up plan with monthly contribution targets and what expenses to prioritize.",
      });
    }

    // Debt alert
    const totalDebt =
      finance.liabilities.homeLoan +
      finance.liabilities.personalLoan +
      finance.liabilities.creditCard;
    if (totalDebt > 0) {
      const annualIncome = Math.max(0, finance.income * 12);
      const debtToIncomeRatio =
        annualIncome > 0 ? totalDebt / annualIncome : null;
      alertList.push({
        id: "debt",
        type: "warn",
        message:
          debtToIncomeRatio !== null
            ? `You have ${formatINR(totalDebt)} in outstanding debt (Debt-to-income: ${debtToIncomeRatio.toFixed(2)}x).`
            : `You have ${formatINR(totalDebt)} in outstanding debt.`,
        action: "Payoff plan",
        prompt:
          "Create a debt payoff plan for me from current liabilities. Suggest repayment priority, monthly amount split, and timeline options while maintaining minimum emergency liquidity.",
      });
    }

    return alertList;
  }, [finance, profileData]);

  const budgetUsage = useMemo(
    () =>
      finance.monthlyBudget > 0
        ? Math.max(
            0,
            Math.min(100, (finance.spent / finance.monthlyBudget) * 100),
          )
        : 0,
    [finance.spent, finance.monthlyBudget],
  );
  const goalProgress = useMemo(
    () =>
      finance.goal.target > 0
        ? Math.max(
            0,
            Math.min(100, (finance.goal.saved / finance.goal.target) * 100),
          )
        : 0,
    [finance.goal.saved, finance.goal.target],
  );

  const goalStatus =
    goalProgress >= 80
      ? "Ahead"
      : goalProgress >= 55
        ? "On Track"
        : "Needs Push";

  const categoryTotals = useMemo(() => {
    const totals = {};
    finance.transactions.forEach((txn) => {
      if (txn.amount < 0) {
        totals[txn.category] =
          (totals[txn.category] || 0) + Math.abs(txn.amount);
      }
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [finance.transactions]);

  const budgetLeft = finance.monthlyBudget - finance.spent;

  useEffect(() => {
    if (budgetUsage >= 90) {
      setNotification({
        type: "warn",
        text: `Alert: You have used ${budgetUsage.toFixed(1)}% of your monthly budget.`,
      });
    } else if (budgetUsage >= 75) {
      setNotification({
        type: "warn",
        text: `Heads up: Budget usage is at ${budgetUsage.toFixed(1)}%. Consider limiting variable spends.`,
      });
    } else {
      setNotification({
        type: "good",
        text: "You are within healthy budget range. AI will continue monitoring for opportunities.",
      });
    }
  }, [budgetUsage]);

  const appendAI = (payload) =>
    setChatMessages((prev) => [...prev, { role: "ai", ...payload }]);
  const appendUser = (text) =>
    setChatMessages((prev) => [...prev, { role: "user", text }]);

  const chatUserContext = useMemo(() => {
    const annualSalary =
      toNumber(profileData.income.baseSalary) +
      toNumber(profileData.income.hra) +
      toNumber(profileData.income.otherAllowances) +
      toNumber(profileData.income.otherIncome);

    const monthlyExpenses =
      toNumber(profileData.expenses.rent) +
      toNumber(profileData.expenses.food) +
      toNumber(profileData.expenses.travel) +
      toNumber(profileData.expenses.subscriptions) +
      toNumber(profileData.expenses.misc);

    const currentAge = toNumber(profileData.personalInfo.age);
    const retirementYears = toNumber(profileData.goals?.[0]?.years);
    const retirementAge =
      currentAge > 0 && retirementYears > 0 ? currentAge + retirementYears : 0;

    return {
      income: {
        salary: annualSalary,
        bonus: toNumber(profileData.income.bonus),
      },
      expenses: {
        total: monthlyExpenses,
      },
      goals: {
        current_age: currentAge,
        retirement_age: retirementAge,
      },
      investments: {
        current_corpus: Math.max(0, toNumber(finance.assets.savings) + toNumber(finance.assets.investments)),
        monthly_investment: 0,
      },
      tax: {
        deductions: {
          "80C": Math.max(0, toNumber(profileData.assets.ppf)),
          "80D": Math.max(0, toNumber(profileData.insurance.healthInsurance)),
        },
      },
      partner: {
        salary: 0,
      },
    };
  }, [profileData, finance.assets.savings, finance.assets.investments]);

  const sendChatQuery = async (query) => {
    setChatError("");
    setChatPending(true);
    try {
      const result = await agentService.askAI(query, userId, chatUserContext);
      const structured = structureAgentExplanation(result?.explanation);
      appendAI({
        answer: structured.answer,
        reasoning: `${structured.reasoning} Intent detected: ${result?.intent || "general"}.`,
        points: structured.points,
        impact: "",
      });
    } catch (error) {
      setChatError(error?.message || "Failed to reach backend AI endpoint.");
      appendAI({
        answer: "I could not process that request right now.",
        reasoning: "Backend request failed.",
        impact: "Please retry after checking backend server status.",
      });
    } finally {
      setChatPending(false);
    }
  };

  const submitChat = async (event) => {
    event.preventDefault();
    const value = chatInput.trim();
    if (!value) return;
    setChatInput("");
    appendUser(value);
    await sendChatQuery(value);
  };

  const handleAlertAction = async (alert) => {
    if (!alert?.prompt || chatPending) return;
    setActiveScreen("chat");
    appendUser(alert.prompt);
    await sendChatQuery(alert.prompt);
  };

  const addTransaction = async (event) => {
    event.preventDefault();
    const amountRaw = Number(txnForm.amount);
    if (!txnForm.desc.trim() || amountRaw <= 0) return;

    const signed = txnForm.type === "Credit" ? amountRaw : -amountRaw;
    const selectedCategory =
      txnForm.type === "Credit"
        ? txnForm.category || "Salary"
        : txnForm.category === AUTO_DETECT_EXPENSE_CATEGORY
          ? classifyExpenseCategory(txnForm.desc)
          : txnForm.category || "Other";

    const txnPayload = {
      desc: txnForm.desc.trim(),
      category: selectedCategory,
      amount: signed,
    };

    let persistedTxnId = null;
    try {
      const inserted = await addSupabaseTransaction(userId, txnPayload);
      persistedTxnId = inserted?.id || null;
    } catch {
      appendAI({
        answer: "Transaction saved locally, but cloud sync failed.",
        reasoning: "Supabase write did not complete. Please verify RLS policies and table schema.",
        impact: "You can continue using the app, but this entry may not appear in Supabase.",
      });
    }

    setFinance((prev) => ({
      ...prev,
      balance:
        signed >= 0 ? prev.balance + signed : prev.balance - Math.abs(signed),
      spent: signed < 0 ? prev.spent + Math.abs(signed) : prev.spent,
      transactions: [
        ...prev.transactions,
        {
          id: persistedTxnId,
          desc: txnPayload.desc,
          category: txnPayload.category,
          amount: txnPayload.amount,
        },
      ],
    }));

    appendAI({
      answer: `${txnForm.desc.trim()} recorded successfully.`,
      reasoning: `${txnForm.type} transaction changed your budget and balance context in real time.`,
      impact:
        "Future AI recommendations are now updated with this transaction.",
    });

    setTxnForm({
      type: txnForm.type,
      category:
        txnForm.type === "Credit"
          ? txnForm.category || "Salary"
          : AUTO_DETECT_EXPENSE_CATEGORY,
      desc: "",
      amount: "",
    });
  };

  const deleteTransaction = (txIndex) => {
    setFinance((prev) => {
      const tx = prev.transactions[txIndex];
      if (!tx) return prev;

      const updatedTransactions = prev.transactions.filter((_, i) => i !== txIndex);

      // Roll back the transaction impact from totals when deleting.
      const nextBalance =
        tx.amount >= 0
          ? prev.balance - tx.amount
          : prev.balance + Math.abs(tx.amount);
      const nextSpent =
        tx.amount < 0
          ? Math.max(0, prev.spent - Math.abs(tx.amount))
          : prev.spent;

      return {
        ...prev,
        balance: Math.max(0, nextBalance),
        spent: nextSpent,
        transactions: updatedTransactions,
      };
    });

    appendAI({
      answer: "Transaction deleted.",
      reasoning: "The selected transaction has been removed from your records.",
      impact: "Budget usage and balance have been recalculated.",
    });
  };

  const profileSections = [
    "Personal Info",
    "Income",
    "Expenses",
    "Assets & Investments",
    "Liabilities",
    "Insurance",
    "Goals",
    "Risk Profile",
  ];

  const updateProfileField = (path, value) => {
    const next = JSON.parse(JSON.stringify(profileData));
    const keys = path.split(".");
    let current = next;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    setProfileData(next);
  };

  const updateProfileGoal = (index, field, value) => {
    const next = JSON.parse(JSON.stringify(profileData));
    next.goals[index][field] = value;
    setProfileData(next);
  };

  const quickPrompts = [
    "Help me optimize tax for this year",
    "Generate a FIRE strategy from my current profile",
    "What should I prioritize this month: debt, emergency fund, or investing?",
  ];

  const donutTotal = categoryTotals.reduce((sum, x) => sum + x[1], 0);
  const maxExpenseCategory = useMemo(() => {
    if (!categoryTotals.length) return null;
    const [name, amount] = categoryTotals[0];
    const sharePct = donutTotal > 0 ? (amount / donutTotal) * 100 : 0;
    return {
      name,
      amount,
      sharePct,
    };
  }, [categoryTotals, donutTotal]);
  const donutColors = ["#007a78", "#e76f36", "#0ea5a2", "#f59e0b", "#2f4858"];

  return (
    <>
      <div className="bg-orb orb-a"></div>
      <div className="bg-orb orb-b"></div>

      <header className="topbar glass">
        <div>
          <h1>AI Money Mentor</h1>
          <p className="eyebrow">Conversational Financial Dashboard</p>
        </div>
        <div className="topbar-right">
          <div className="context-strip">
            <div className="context-item">
              <span>Balance</span>
              <strong>{formatINR(finance.balance)}</strong>
            </div>
            <div className="context-item">
              <span>Budget Used</span>
              <strong>{budgetUsage.toFixed(1)}%</strong>
            </div>
            <div className="context-item">
              <span>Goal Status</span>
              <strong>{goalStatus}</strong>
            </div>
          </div>
          <div className="user-controls">
            <span className="user-welcome">Hi, {user.name.split(" ")[0]}</span>
            <button
              type="button"
              className="profile-pie-btn"
              onClick={() => setShowProfileModal(true)}
              title={
                profileCompletion === 100
                  ? "Account"
                  : `Profile ${profileCompletion}% complete`
              }
            >
              {profileCompletion < 100 ? (
                <svg viewBox="0 0 100 100" className="profile-chart">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="rgba(16, 34, 45, 0.1)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#007a78"
                    strokeWidth="8"
                    strokeDasharray={`${(profileCompletion / 100) * 251.3} 251.3`}
                    strokeDashoffset="0"
                    transform="rotate(-90 50 50)"
                    strokeLinecap="round"
                  />
                  <text
                    x="50"
                    y="58"
                    fontSize="24"
                    fontWeight="700"
                    textAnchor="middle"
                    fill="#007a78"
                  >
                    {profileCompletion}%
                  </text>
                </svg>
              ) : (
                <svg
                  viewBox="0 0 100 100"
                  className="account-logo-icon"
                  aria-hidden="true"
                >
                  <circle cx="50" cy="34" r="14" fill="#007a78" opacity="0.9" />
                  <path
                    d="M24 78c0-12 10-22 26-22s26 10 26 22"
                    fill="none"
                    stroke="#007a78"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
            <button type="button" className="ghost-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="app-shell">
        <nav className="side-nav glass" aria-label="Primary">
          {["dashboard", "chat", "goals", "transactions"].map(
            (screen) => (
              <button
                key={screen}
                className={`nav-btn ${screen === "chat" ? "ai-nav-btn" : ""} ${activeScreen === screen ? "active" : ""}`}
                onClick={() => setActiveScreen(screen)}
              >
                {screen === "chat"
                  ? "AI Mentor"
                  : screen.charAt(0).toUpperCase() + screen.slice(1)}
              </button>
            ),
          )}
          <Link to="/fire-planner" className="nav-btn">
            FIRE Planner
          </Link>
          <Link to="/tax-planner" className="nav-btn">
            Tax Wizard
          </Link>
          <Link to="/portfolio-analyzer" className="nav-btn">
            Portfolio X-Ray
          </Link>
          <Link to="/life-event" className="nav-btn">
            Life Event Advisor
          </Link>
          <Link to="/couple-planner" className="nav-btn">
            Couple Planner
          </Link>
          <button
            type="button"
            className={`nav-btn ${activeScreen === "guide" ? "active" : ""}`}
            onClick={() => setActiveScreen("guide")}
          >
            Website Guide
          </button>
        </nav>

        <section className="content-column">
          <div className={`notification ${notification.type}`}>
            {notification.text}
          </div>

          <div className="quick-actions">
            <div className="card quick-action-card">
              <div>
                <p className="card-label">Save My Taxes</p>
                <h3>💰 Tax Wizard</h3>
                <p>Compare regimes and find missed deductions.</p>
              </div>
              <Link to="/tax-planner" className="tax-cta-button">
                Open Tax Planner →
              </Link>
            </div>
            <div className="card quick-action-card">
              <div>
                <p className="card-label">Analyze My Portfolio</p>
                <h3>📈 Portfolio X-Ray</h3>
                <p>Check XIRR, overlap, and expense drag fast.</p>
              </div>
              <Link to="/portfolio-analyzer" className="tax-cta-button">
                Open Analyzer →
              </Link>
            </div>
            <div className="card quick-action-card">
              <div>
                <p className="card-label">Life Event Advisor</p>
                <h3>👶 Life Event Advisor</h3>
                <p>Get personalized next steps for big moments.</p>
              </div>
              <Link to="/life-event" className="tax-cta-button">
                Open Advisor →
              </Link>
            </div>
            <div className="card quick-action-card">
              <div>
                <p className="card-label">Plan as a Couple</p>
                <h3>❤️ Couple Planner</h3>
                <p>Combine income, goals, and strategies together.</p>
              </div>
              <Link to="/couple-planner" className="tax-cta-button">
                Open Planner →
              </Link>
            </div>
          </div>

          {activeScreen === "dashboard" && (
            <section className="screen active-screen dashboard-flow">
              {/* Profile Summary Card */}
              {profileCompletion < 100 && (
                <div className="profile-summary-card">
                  <div className="profile-summary-left">
                    <h3>Complete Your Financial Profile</h3>
                    <p>
                      We have <strong>{profileCompletion}%</strong> of your
                      information. This helps us provide better personalized
                      recommendations.
                    </p>
                    <button
                      className="btn-profile-cta"
                      onClick={() => setShowProfileModal(true)}
                    >
                      Continue Profile →
                    </button>
                  </div>
                  <div className="profile-summary-chart">
                    <svg viewBox="0 0 120 120" className="summary-chart-svg">
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="rgba(16, 34, 45, 0.1)"
                        strokeWidth="10"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="#007a78"
                        strokeWidth="10"
                        strokeDasharray={`${(profileCompletion / 100) * 314.15} 314.15`}
                        strokeDashoffset="0"
                        transform="rotate(-90 60 60)"
                        strokeLinecap="round"
                      />
                      <text
                        x="60"
                        y="70"
                        fontSize="32"
                        fontWeight="700"
                        textAnchor="middle"
                        fill="#007a78"
                      >
                        {profileCompletion}%
                      </text>
                    </svg>
                  </div>
                </div>
              )}

              {/* ALERTS SECTION */}
              {alerts.length > 0 && (
                <div className="alerts-section">
                  <p className="section-title">⚡ Smart Alerts</p>
                  <div className="alerts-grid">
                    {alerts.map((alert, idx) => (
                      <div
                        key={idx}
                        className={`alert-card alert-${alert.type}`}
                      >
                        <div className="alert-content">
                          <p className="alert-message">{alert.message}</p>
                          <button
                            type="button"
                            className="alert-action"
                            onClick={() => handleAlertAction(alert)}
                            disabled={chatPending}
                          >
                            {alert.action}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid two-up">
                <article className="card highlight-card tax-cta-card">
                  <p className="card-label">Save My Taxes</p>
                  <h3>💰 Tax Wizard</h3>
                  <p>
                    Compare old vs new regime and uncover deductions you might
                    be missing.
                  </p>
                  <Link to="/tax-planner" className="tax-cta-button">
                    Open Tax Planner →
                  </Link>
                </article>
                <article className="card">
                  <p className="card-label">Quick Insight</p>
                  <h3>Tax readiness score</h3>
                  <p>
                    Use the wizard to see potential savings and optimize your
                    deductions faster.
                  </p>
                </article>
              </div>

              {/* MONEY HEALTH SCORE */}
              <div className="grid two-up">
                <article className="card health-score-card">
                  <p className="card-label">💚 Money Health Score</p>
                  {!moneyHealthScore.available ? (
                    <p className="section-hint">
                      Complete your income, expenses, assets, and liabilities in
                      profile setup to unlock Money Health Score.
                    </p>
                  ) : (
                    <div className="health-score-main">
                      <div className="score-circle">
                        <svg viewBox="0 0 120 120" className="score-svg">
                          <circle
                            cx="60"
                            cy="60"
                            r="50"
                            fill="none"
                            stroke="rgba(16, 34, 45, 0.1)"
                            strokeWidth="8"
                          />
                          <circle
                            cx="60"
                            cy="60"
                            r="50"
                            fill="none"
                            stroke={
                              moneyHealthScore.total >= 75
                                ? "#0f766e"
                                : moneyHealthScore.total >= 50
                                  ? "#f59e0b"
                                  : "#dc2626"
                            }
                            strokeWidth="8"
                            strokeDasharray={`${(moneyHealthScore.total / 100) * 314.15} 314.15`}
                            strokeDashoffset="0"
                            transform="rotate(-90 60 60)"
                            strokeLinecap="round"
                          />
                          <text
                            x="60"
                            y="70"
                            fontSize="36"
                            fontWeight="700"
                            textAnchor="middle"
                            fill={
                              moneyHealthScore.total >= 75
                                ? "#0f766e"
                                : moneyHealthScore.total >= 50
                                  ? "#f59e0b"
                                  : "#dc2626"
                            }
                          >
                            {moneyHealthScore.total}
                          </text>
                        </svg>
                        <p className="score-status">
                          {moneyHealthScore.total >= 75
                            ? "Excellent"
                            : moneyHealthScore.total >= 50
                              ? "Good"
                              : "Needs Work"}
                        </p>
                      </div>
                      <div className="health-breakdown">
                        <div className="health-item">
                          <span className="health-label">Emergency Fund</span>
                          <div
                            className="mini-bar"
                            style={{
                              width: `${Math.min(100, moneyHealthScore.breakdown.emergencyFund)}%`,
                            }}
                          ></div>
                          <span className="health-value">
                            {Math.round(moneyHealthScore.breakdown.emergencyFund)}
                            %
                          </span>
                        </div>
                        <div className="health-item">
                          <span className="health-label">Insurance</span>
                          <div
                            className="mini-bar"
                            style={{
                              width: `${Math.min(100, moneyHealthScore.breakdown.insurance)}%`,
                            }}
                          ></div>
                          <span className="health-value">
                            {Math.round(moneyHealthScore.breakdown.insurance)}%
                          </span>
                        </div>
                        <div className="health-item">
                          <span className="health-label">Debt</span>
                          <div
                            className="mini-bar"
                            style={{
                              width: `${Math.min(100, moneyHealthScore.breakdown.debt)}%`,
                            }}
                          ></div>
                          <span className="health-value">
                            {Math.round(moneyHealthScore.breakdown.debt)}%
                          </span>
                        </div>
                        <div className="health-item">
                          <span className="health-label">Investment</span>
                          <div
                            className="mini-bar"
                            style={{
                              width: `${Math.min(100, moneyHealthScore.breakdown.investment)}%`,
                            }}
                          ></div>
                          <span className="health-value">
                            {Math.round(moneyHealthScore.breakdown.investment)}%
                          </span>
                        </div>
                        <div className="health-item">
                          <span className="health-label">Tax Planning</span>
                          <div
                            className="mini-bar"
                            style={{
                              width: `${Math.min(100, moneyHealthScore.breakdown.tax)}%`,
                            }}
                          ></div>
                          <span className="health-value">
                            {Math.round(moneyHealthScore.breakdown.tax)}%
                          </span>
                        </div>
                        <div className="health-item">
                          <span className="health-label">Retirement</span>
                          <div
                            className="mini-bar"
                            style={{
                              width: `${Math.min(100, moneyHealthScore.breakdown.retirement)}%`,
                            }}
                          ></div>
                          <span className="health-value">
                            {Math.round(moneyHealthScore.breakdown.retirement)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </article>

                <article className="card">
                  <p className="card-label">💰 Monthly Cash Flow</p>
                  <div className="cashflow-visual">
                    <div className="cashflow-row">
                      <div className="cashflow-item income">
                        <span className="cf-label">Income</span>
                        <h4>{formatINR(cashFlow.income)}</h4>
                      </div>
                      <div className="cf-arrow">→</div>
                      <div className="cashflow-item expense">
                        <span className="cf-label">Expenses</span>
                        <h4>{formatINR(cashFlow.expenses)}</h4>
                      </div>
                      <div className="cf-arrow">=</div>
                      <div className="cashflow-item surplus">
                        <span className="cf-label">Surplus</span>
                        <h4
                          style={{
                            color: cashFlow.surplus > 0 ? "#0f766e" : "#dc2626",
                          }}
                        >
                          {formatINR(cashFlow.surplus)}
                        </h4>
                      </div>
                    </div>
                  </div>
                  <div className="cf-percentage">
                    <p>
                      <strong>Savings Rate:</strong>{" "}
                      {cashFlow.income > 0
                        ? ((cashFlow.surplus / cashFlow.income) * 100).toFixed(
                            1,
                          )
                        : "0.0"}
                      %
                    </p>
                  </div>
                </article>

              </div>

              <div className="grid chart-grid">
                <article className="card category-split-card">
                  <p className="card-label">Category Split</p>
                  {maxExpenseCategory ? (
                    <p className="section-hint">
                      Highest spend category: <strong>{maxExpenseCategory.name}</strong> ({formatINR(maxExpenseCategory.amount)}, {maxExpenseCategory.sharePct.toFixed(1)}%).
                    </p>
                  ) : (
                    <p className="section-hint">
                      Add debit transactions to see category-wise expense distribution.
                    </p>
                  )}
                  <div className="grid two-up category-split-layout">
                    <svg
                      className="chart-svg category-split-svg"
                      viewBox="0 0 320 230"
                    >
                      {donutTotal > 0 ? (
                        <>
                          {(() => {
                            let acc = 0;
                            const cx = 95;
                            const cy = 115;
                            const radius = 62;
                            const stroke = 28;
                            const c = 2 * Math.PI * radius;
                            return categoryTotals
                              .slice(0, 5)
                              .map(([cat, amount], i) => {
                                const share = amount / donutTotal;
                                const len = c * share;
                                const dash = `${len.toFixed(2)} ${(c - len).toFixed(2)}`;
                                const offset = (-acc * c).toFixed(2);
                                acc += share;
                                const y = 54 + i * 30;
                                return (
                                  <g key={cat}>
                                    <circle
                                      cx={cx}
                                      cy={cy}
                                      r={radius}
                                      fill="none"
                                      stroke={donutColors[i % donutColors.length]}
                                      strokeWidth={stroke}
                                      strokeDasharray={dash}
                                      strokeDashoffset={offset}
                                      transform={`rotate(-90 ${cx} ${cy})`}
                                    />
                                    <rect
                                      x="188"
                                      y={y - 10}
                                      width="10"
                                      height="10"
                                      fill={donutColors[i % donutColors.length]}
                                      rx="2"
                                    />
                                    <text x="204" y={y} className="chart-muted">
                                      {cat}
                                    </text>
                                  </g>
                                );
                              });
                          })()}
                          <circle
                            cx="95"
                            cy="115"
                            r="38"
                            fill="rgba(255,255,255,0.95)"
                          />
                          <text
                            x="95"
                            y="112"
                            textAnchor="middle"
                            className="chart-caption"
                          >
                            {formatINR(donutTotal)}
                          </text>
                          <text
                            x="95"
                            y="128"
                            textAnchor="middle"
                            className="chart-muted"
                          >
                            total spent
                          </text>
                        </>
                      ) : (
                        <text x="20" y="30" className="chart-caption">
                          No spending data yet.
                        </text>
                      )}
                    </svg>

                    <article className="card spending-patterns-card">
                      <p className="card-label">Spending Patterns</p>
                      <div className="stack">
                        {categoryTotals.length > 0 ? (
                          categoryTotals.slice(0, 5).map(([cat, amount], i) => (
                            <div key={cat} className="txn-item">
                              <strong>
                                Pattern {i + 1}: {cat}
                              </strong>
                              <br />
                              <small>
                                {formatINR(amount)} spent so far this month
                              </small>
                            </div>
                          ))
                        ) : (
                          <div className="txn-item">
                            <strong>No Patterns Yet</strong>
                            <br />
                            <small>
                              Add debit transactions to generate spending patterns.
                            </small>
                          </div>
                        )}
                      </div>
                    </article>
                  </div>
                </article>
              </div>
            </section>
          )}

          {activeScreen === "chat" && (
            <section className="screen active-screen ai-mentor-section">
              <div className="grid">
                <article className="card ai-conversation-card">
                  <p className="card-label">Decision Conversation</p>
                  <div className="chat-feed">
                    {chatMessages.map((msg, idx) =>
                      msg.role === "user" ? (
                        <div key={idx} className="msg user">
                          {msg.text}
                        </div>
                      ) : (
                        <div key={idx} className="msg ai">
                          <div className="ai-tiles">
                            <div className="ai-tile ai-answer">
                              <p>{msg.answer}</p>
                              {Array.isArray(msg.points) && msg.points.length > 0 && (
                                <ul className="ai-clean-list">
                                  {msg.points.map((point, pointIndex) => (
                                    <li key={`${idx}-point-${pointIndex}`}>{point}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div className="ai-tile ai-why">
                              <strong>Reason</strong>
                              <p>
                                {msg.reasoning} {msg.impact}
                              </p>
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                  <form className="chat-form" onSubmit={submitChat}>
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      required
                      disabled={chatPending}
                    />
                    <button type="submit" disabled={chatPending}>
                      {chatPending ? "Sending..." : "Send"}
                    </button>
                  </form>
                  {chatError && <p className="auth-message">{chatError}</p>}
                </article>

                <div className="grid two-up mentor-bottom-row">
                  <aside className="card">
                    <p className="card-label">Smart Suggestions</p>
                    <div className="stack">
                      {quickPrompts.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          className="pill-btn"
                          onClick={async () => {
                            appendUser(prompt);
                            await sendChatQuery(prompt);
                          }}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </aside>

                  <aside className="card">
                    <p className="card-label">Live Decision Snapshot</p>
                    <div className="snapshot">
                      <p>
                        Budget left this month:{" "}
                        {formatINR(Math.max(0, budgetLeft))}
                      </p>
                      <p>
                        Safe discretionary window:{" "}
                        {formatINR(Math.max(0, budgetLeft * 0.45))}
                      </p>
                      <p>
                        Goal momentum: {goalProgress.toFixed(1)}% complete (
                        {goalStatus})
                      </p>
                    </div>
                  </aside>
                </div>
              </div>
            </section>
          )}

          {activeScreen === "goals" && (
            <section className="screen active-screen">
              <div className="grid two-up">
                <article className="card">
                  <p className="card-label">Primary Goal</p>
                  <h3>{finance.goal.name}</h3>
                  <p>
                    {formatINR(finance.goal.saved)} saved of{" "}
                    {formatINR(finance.goal.target)}.
                  </p>
                  <div className="meter goal">
                    <div
                      className="meter-fill"
                      style={{ width: `${goalProgress}%` }}
                    ></div>
                  </div>
                </article>
                <article className="card">
                  <p className="card-label">Plan Actions</p>
                  <div className="stack">
                    <div className="txn-item">
                      <small>Auto-allocate INR 3000 after next salary.</small>
                    </div>
                    <div className="txn-item">
                      <small>
                        Pause one non-essential category for 10 days.
                      </small>
                    </div>
                    <div className="txn-item">
                      <small>
                        Use AI checks before purchases above INR 2500.
                      </small>
                    </div>
                  </div>
                </article>
              </div>
            </section>
          )}

          {activeScreen === "transactions" && (
            <section className="screen active-screen transactions-section">
              <div className="grid two-up">
                <article className="card">
                  <p className="card-label">Add Transaction</p>
                  <form className="txn-form" onSubmit={addTransaction}>
                    <label>
                      Transaction Type
                      <select
                        value={txnForm.type}
                        onChange={(e) =>
                          setTxnForm((p) => ({
                            ...p,
                            type: e.target.value,
                            category:
                              e.target.value === "Credit"
                                ? "Salary"
                                : AUTO_DETECT_EXPENSE_CATEGORY,
                          }))
                        }
                      >
                        <option>Debit</option>
                        <option>Credit</option>
                      </select>
                    </label>
                    <label>
                      Category
                      <select
                        value={txnForm.category}
                        onChange={(e) =>
                          setTxnForm((p) => ({ ...p, category: e.target.value }))
                        }
                      >
                        {txnForm.type === "Credit" ? (
                          INCOME_CATEGORIES.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))
                        ) : (
                          [AUTO_DETECT_EXPENSE_CATEGORY, ...EXPENSE_CATEGORIES].map(
                            (category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ),
                          )
                        )}
                      </select>
                    </label>
                    <label>
                      Description
                      <input
                        value={txnForm.desc}
                        onChange={(e) =>
                          setTxnForm((p) => ({ ...p, desc: e.target.value }))
                        }
                        required
                      />
                    </label>
                    <label>
                      Amount (INR)
                      <input
                        type="number"
                        min="1"
                        value={txnForm.amount}
                        onChange={(e) =>
                          setTxnForm((p) => ({ ...p, amount: e.target.value }))
                        }
                        required
                      />
                    </label>
                    <button type="submit">Record Transaction</button>
                  </form>
                </article>

                <article className="card">
                  <p className="card-label">Recent Transactions</p>
                  <div className="stack">
                    {finance.transactions
                      .map((txn, index) => ({ txn, index }))
                      .slice()
                      .reverse()
                      .slice(0, 10)
                      .map(({ txn, index }) => (
                        <div className="txn-item" key={`${txn.desc}-${index}`}>
                          <div className="row">
                            <strong>{txn.desc}</strong>
                            <strong
                              style={{
                                color:
                                  txn.amount >= 0
                                    ? "var(--good)"
                                    : "var(--warn)",
                              }}
                            >
                              {txn.amount >= 0 ? "+" : "-"}
                              {formatINR(Math.abs(txn.amount))}
                            </strong>
                          </div>
                          <div className="row">
                            <small>{txn.category}</small>
                            <button
                              type="button"
                              className="txn-delete-btn"
                              onClick={() => deleteTransaction(index)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </article>
              </div>
            </section>
          )}

          {activeScreen === "guide" && (
            <section className="screen active-screen guide-section">
              <div className="grid">
                <article className="card">
                  <p className="card-label">New User Guide</p>
                  <h2>How To Use AI Money Mentor Effectively</h2>
                  <p>
                    This guide helps you understand each section of the
                    platform and how to use them together for better financial
                    planning decisions.
                  </p>
                </article>

                <div className="grid two-up">
                  <article className="card">
                    <p className="card-label">Step 1</p>
                    <h3>Complete Profile First</h3>
                    <p>
                      Start by filling your profile thoroughly from Personal
                      Info through Risk Profile. Better profile quality leads to
                      better alerts, score quality, and AI guidance.
                    </p>
                    <div className="stack">
                      <div className="txn-item">
                        <strong>What to enter carefully</strong>
                        <br />
                        <small>
                          Income, monthly expenses, liabilities, insurance,
                          target goals, and timeline.
                        </small>
                      </div>
                      <div className="txn-item">
                        <strong>Why this matters</strong>
                        <br />
                        <small>
                          Most dashboard insights and AI context rely on this
                          data.
                        </small>
                      </div>
                    </div>
                  </article>

                  <article className="card">
                    <p className="card-label">Step 2</p>
                    <h3>Use Dashboard As Daily Control Panel</h3>
                    <p>
                      The Dashboard is your high-level health check. Use it to
                      quickly monitor spending pressure, cash flow, and category
                      concentration.
                    </p>
                    <div className="stack">
                      <div className="txn-item">
                        <strong>Money Health Score</strong>
                        <br />
                        <small>
                          Weighted indicator across emergency fund, insurance,
                          debt, investments, tax planning, and retirement.
                        </small>
                      </div>
                      <div className="txn-item">
                        <strong>Monthly Cash Flow</strong>
                        <br />
                        <small>
                          Tracks income vs planned monthly expenses and savings
                          rate.
                        </small>
                      </div>
                      <div className="txn-item">
                        <strong>Category Split</strong>
                        <br />
                        <small>
                          Shows where your debit spending is concentrated and
                          highlights your top expense category.
                        </small>
                      </div>
                    </div>
                  </article>
                </div>

                <div className="grid two-up">
                  <article className="card">
                    <p className="card-label">Step 3</p>
                    <h3>Act On Smart Alerts</h3>
                    <p>
                      Smart Alerts are trigger-based signals for overspending,
                      tax opportunities, emergency fund gaps, and debt burden.
                    </p>
                    <div className="stack">
                      <div className="txn-item">
                        <strong>Action buttons are AI-powered</strong>
                        <br />
                        <small>
                          Clicking an alert action opens AI Mentor and starts a
                          focused follow-up discussion automatically.
                        </small>
                      </div>
                    </div>
                  </article>

                  <article className="card">
                    <p className="card-label">Step 4</p>
                    <h3>Keep Transactions Updated</h3>
                    <p>
                      Add every major debit/credit transaction regularly. The
                      app auto-classifies debit entries into useful categories
                      such as Food, Travel, Utilities, Healthcare, and more.
                    </p>
                    <div className="stack">
                      <div className="txn-item">
                        <strong>Best practice</strong>
                        <br />
                        <small>
                          Log transactions weekly to keep dashboard trends,
                          category split, and alerts accurate.
                        </small>
                      </div>
                    </div>
                  </article>
                </div>

                <div className="grid two-up">
                  <article className="card">
                    <p className="card-label">Planning Modules</p>
                    <h3>When To Use Which Tool</h3>
                    <div className="stack">
                      <div className="txn-item">
                        <strong>Tax Wizard</strong>
                        <br />
                        <small>
                          Use before year-end to compare regimes and close
                          deduction gaps.
                        </small>
                      </div>
                      <div className="txn-item">
                        <strong>FIRE Planner</strong>
                        <br />
                        <small>
                          Use for long-term retirement corpus and SIP planning.
                        </small>
                      </div>
                      <div className="txn-item">
                        <strong>Portfolio X-Ray</strong>
                        <br />
                        <small>
                          Use to inspect portfolio quality, overlap, and return
                          efficiency.
                        </small>
                      </div>
                      <div className="txn-item">
                        <strong>Life Event Advisor</strong>
                        <br />
                        <small>
                          Use during marriage, relocation, bonus, new child, or
                          any major expense phase.
                        </small>
                      </div>
                      <div className="txn-item">
                        <strong>Couple Planner</strong>
                        <br />
                        <small>
                          Use for shared goals, role-wise contributions, and
                          combined planning strategy.
                        </small>
                      </div>
                    </div>
                  </article>

                  <article className="card">
                    <p className="card-label">AI Mentor Usage</p>
                    <h3>How To Ask Better Questions</h3>
                    <div className="stack">
                      <div className="txn-item">
                        <strong>Be specific</strong>
                        <br />
                        <small>
                          Example: "I have INR 30,000 monthly surplus. Should I
                          split between debt payoff and ELSS?"
                        </small>
                      </div>
                      <div className="txn-item">
                        <strong>Ask scenario-based follow-ups</strong>
                        <br />
                        <small>
                          Example: "What changes if my rent increases by 20%?"
                        </small>
                      </div>
                      <div className="txn-item">
                        <strong>Use iterative planning</strong>
                        <br />
                        <small>
                          Ask for monthly action plans, then revise based on new
                          transactions and life changes.
                        </small>
                      </div>
                    </div>
                  </article>
                </div>

                <article className="card">
                  <p className="card-label">Recommended Workflow</p>
                  <p>
                    Complete profile → record transactions weekly → monitor
                    dashboard alerts → open AI Mentor from alerts for detailed
                    action → validate strategy in relevant planner modules.
                    Repeat monthly for best outcomes.
                  </p>
                </article>
              </div>
            </section>
          )}
        </section>
      </main>

      {/* Profile Modal */}
      {showProfileModal && (
        <div
          className="profile-modal-overlay"
          onClick={() => setShowProfileModal(false)}
        >
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-header">
              <h3>Complete Your Profile</h3>
              <button
                className="close-btn"
                onClick={() => setShowProfileModal(false)}
              >
                ×
              </button>
            </div>

            <div className="profile-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${profileCompletion}%` }}
                ></div>
              </div>
              <p className="progress-text">
                {profileCompletion}% Complete • Section{" "}
                {currentProfileSection + 1} of {profileSections.length}
              </p>
            </div>

            <div className="profile-content">
              <p className="card-label">
                {profileSections[currentProfileSection]}
              </p>

              {currentProfileSection === 0 && (
                <div className="profile-section">
                  <h4>Personal Information</h4>
                  <div className="form-group">
                    <label>
                      Age
                      <input
                        type="number"
                        value={profileData.personalInfo.age}
                        onChange={(e) =>
                          updateProfileField("personalInfo.age", e.target.value)
                        }
                        min="18"
                        max="120"
                      />
                    </label>
                    <label>
                      City
                      <input
                        type="text"
                        value={profileData.personalInfo.city}
                        onChange={(e) =>
                          updateProfileField(
                            "personalInfo.city",
                            e.target.value,
                          )
                        }
                      />
                    </label>
                    <label>
                      Marital Status
                      <select
                        value={profileData.personalInfo.maritalStatus}
                        onChange={(e) =>
                          updateProfileField(
                            "personalInfo.maritalStatus",
                            e.target.value,
                          )
                        }
                      >
                        <option value="">Select...</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                      </select>
                    </label>
                    <label>
                      Dependents
                      <input
                        type="number"
                        value={profileData.personalInfo.dependents}
                        onChange={(e) =>
                          updateProfileField(
                            "personalInfo.dependents",
                            e.target.value,
                          )
                        }
                        min="0"
                      />
                    </label>
                  </div>
                </div>
              )}

              {currentProfileSection === 1 && (
                <div className="profile-section">
                  <h4>Income Details</h4>
                  <div className="form-group">
                    <label>
                      Base Salary (Annual)
                      <input
                        type="number"
                        value={profileData.income.baseSalary}
                        onChange={(e) =>
                          updateProfileField(
                            "income.baseSalary",
                            e.target.value,
                          )
                        }
                      />
                    </label>
                    <label>
                      HRA (Annual)
                      <input
                        type="number"
                        value={profileData.income.hra}
                        onChange={(e) =>
                          updateProfileField("income.hra", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Other Allowances
                      <input
                        type="number"
                        value={profileData.income.otherAllowances}
                        onChange={(e) =>
                          updateProfileField(
                            "income.otherAllowances",
                            e.target.value,
                          )
                        }
                      />
                    </label>
                    <label>
                      Bonus (Optional)
                      <input
                        type="number"
                        value={profileData.income.bonus}
                        onChange={(e) =>
                          updateProfileField("income.bonus", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Other Income
                      <input
                        type="number"
                        value={profileData.income.otherIncome}
                        onChange={(e) =>
                          updateProfileField(
                            "income.otherIncome",
                            e.target.value,
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              )}

              {currentProfileSection === 2 && (
                <div className="profile-section">
                  <h4>Monthly Expenses</h4>
                  <div className="form-group">
                    <label>
                      Rent
                      <input
                        type="number"
                        value={profileData.expenses.rent}
                        onChange={(e) =>
                          updateProfileField("expenses.rent", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Food
                      <input
                        type="number"
                        value={profileData.expenses.food}
                        onChange={(e) =>
                          updateProfileField("expenses.food", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Travel
                      <input
                        type="number"
                        value={profileData.expenses.travel}
                        onChange={(e) =>
                          updateProfileField("expenses.travel", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Subscriptions
                      <input
                        type="number"
                        value={profileData.expenses.subscriptions}
                        onChange={(e) =>
                          updateProfileField(
                            "expenses.subscriptions",
                            e.target.value,
                          )
                        }
                      />
                    </label>
                    <label>
                      Misc
                      <input
                        type="number"
                        value={profileData.expenses.misc}
                        onChange={(e) =>
                          updateProfileField("expenses.misc", e.target.value)
                        }
                      />
                    </label>
                  </div>
                </div>
              )}

              {currentProfileSection === 3 && (
                <div className="profile-section">
                  <h4>Assets & Investments</h4>
                  <div className="form-group">
                    <label>
                      Mutual Funds
                      <input
                        type="number"
                        value={profileData.assets.mutualFunds}
                        onChange={(e) =>
                          updateProfileField(
                            "assets.mutualFunds",
                            e.target.value,
                          )
                        }
                      />
                    </label>
                    <label>
                      PPF
                      <input
                        type="number"
                        value={profileData.assets.ppf}
                        onChange={(e) =>
                          updateProfileField("assets.ppf", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Stocks
                      <input
                        type="number"
                        value={profileData.assets.stocks}
                        onChange={(e) =>
                          updateProfileField("assets.stocks", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      FD
                      <input
                        type="number"
                        value={profileData.assets.fd}
                        onChange={(e) =>
                          updateProfileField("assets.fd", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Cash
                      <input
                        type="number"
                        value={profileData.assets.cash}
                        onChange={(e) =>
                          updateProfileField("assets.cash", e.target.value)
                        }
                      />
                    </label>
                  </div>
                </div>
              )}

              {currentProfileSection === 4 && (
                <div className="profile-section">
                  <h4>Liabilities</h4>
                  <div className="form-group">
                    <label>
                      Home Loan
                      <input
                        type="number"
                        value={profileData.liabilities.homeLoan}
                        onChange={(e) =>
                          updateProfileField(
                            "liabilities.homeLoan",
                            e.target.value,
                          )
                        }
                      />
                    </label>
                    <label>
                      EMI
                      <input
                        type="number"
                        value={profileData.liabilities.emi}
                        onChange={(e) =>
                          updateProfileField("liabilities.emi", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Credit Card Dues
                      <input
                        type="number"
                        value={profileData.liabilities.creditCardDues}
                        onChange={(e) =>
                          updateProfileField(
                            "liabilities.creditCardDues",
                            e.target.value,
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              )}

              {currentProfileSection === 5 && (
                <div className="profile-section">
                  <h4>Insurance</h4>
                  <div className="form-group">
                    <label>
                      Health Insurance
                      <input
                        type="number"
                        value={profileData.insurance.healthInsurance}
                        onChange={(e) =>
                          updateProfileField(
                            "insurance.healthInsurance",
                            e.target.value,
                          )
                        }
                      />
                    </label>
                    <label>
                      Life Insurance
                      <input
                        type="number"
                        value={profileData.insurance.lifeInsurance}
                        onChange={(e) =>
                          updateProfileField(
                            "insurance.lifeInsurance",
                            e.target.value,
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              )}

              {currentProfileSection === 6 && (
                <div className="profile-section">
                  <h4>Goals</h4>
                  <div className="form-group">
                    {profileData.goals.map((goal, idx) => (
                      <div key={goal.type} className="goal-group">
                        <h4>{goal.type}</h4>
                        <label>
                          Target Amount
                          <input
                            type="number"
                            value={goal.targetAmount}
                            onChange={(e) =>
                              updateProfileGoal(
                                idx,
                                "targetAmount",
                                e.target.value,
                              )
                            }
                          />
                        </label>
                        <label>
                          Time Horizon (Years)
                          <input
                            type="number"
                            value={goal.years}
                            onChange={(e) =>
                              updateProfileGoal(idx, "years", e.target.value)
                            }
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentProfileSection === 7 && (
                <div className="profile-section">
                  <h4>Investment Risk Profile</h4>
                  <div className="radio-options">
                    <label>
                      <input
                        type="radio"
                        value="Conservative"
                        checked={profileData.riskProfile === "Conservative"}
                        onChange={(e) =>
                          updateProfileField("riskProfile", e.target.value)
                        }
                      />
                      Conservative (Stable, Low Volatility)
                    </label>
                    <label>
                      <input
                        type="radio"
                        value="Moderate"
                        checked={profileData.riskProfile === "Moderate"}
                        onChange={(e) =>
                          updateProfileField("riskProfile", e.target.value)
                        }
                      />
                      Moderate (Balanced Growth)
                    </label>
                    <label>
                      <input
                        type="radio"
                        value="Aggressive"
                        checked={profileData.riskProfile === "Aggressive"}
                        onChange={(e) =>
                          updateProfileField("riskProfile", e.target.value)
                        }
                      />
                      Aggressive (High Growth)
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="profile-actions">
              <button
                className="btn-prev"
                onClick={() =>
                  setCurrentProfileSection(
                    Math.max(0, currentProfileSection - 1),
                  )
                }
                disabled={currentProfileSection === 0}
              >
                ← Previous
              </button>
              <button
                className="btn-secondary-action"
                onClick={async () => {
                  try {
                    await upsertFinancialInputs(userId, profileData);
                  } catch {
                    // Keep modal UX non-blocking if Supabase write fails.
                  }
                  setShowProfileModal(false);
                }}
              >
                Fill it Later
              </button>
              <button
                className="btn-next"
                onClick={async () => {
                  try {
                    await upsertFinancialInputs(userId, profileData);
                  } catch {
                    // Keep local state updated even if Supabase write fails.
                  }
                  if (currentProfileSection < profileSections.length - 1) {
                    setCurrentProfileSection(currentProfileSection + 1);
                  } else {
                    setShowProfileModal(false);
                  }
                }}
              >
                {currentProfileSection === profileSections.length - 1
                  ? "Save & Close"
                  : "Next Section →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ProtectedRoute({ sessionUser, children }) {
  if (!sessionUser) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [sessionUser, setSessionUser] = useState(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const user = await getCurrentSessionUser();
        setSessionUser(user || null);
      } catch {
        setSessionUser(null);
      }
    };

    loadSession();
  }, []);

  const logout = async () => {
    try {
      await signOutSession();
    } finally {
      setSessionUser(null);
    }
  };

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLogin={setSessionUser} />} />
      <Route
        path="/signup"
        element={<SignupPage onSignup={setSessionUser} />}
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute sessionUser={sessionUser}>
            <OnboardingPage
              user={sessionUser}
              onComplete={() => setSessionUser(sessionUser)}
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute sessionUser={sessionUser}>
            <DashboardApp user={sessionUser} onLogout={logout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/fire-planner"
        element={
          <ProtectedRoute sessionUser={sessionUser}>
            <FirePlanner />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tax-planner"
        element={
          <ProtectedRoute sessionUser={sessionUser}>
            <TaxPlanner />
          </ProtectedRoute>
        }
      />
      <Route
        path="/portfolio-analyzer"
        element={
          <ProtectedRoute sessionUser={sessionUser}>
            <PortfolioAnalyzer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/life-event"
        element={
          <ProtectedRoute sessionUser={sessionUser}>
            <LifeEventPlanner />
          </ProtectedRoute>
        }
      />
      <Route
        path="/couple-planner"
        element={
          <ProtectedRoute sessionUser={sessionUser}>
            <CouplePlanner />
          </ProtectedRoute>
        }
      />
      <Route
        path="*"
        element={<Navigate to={sessionUser ? "/" : "/login"} replace />}
      />
    </Routes>
  );
}
