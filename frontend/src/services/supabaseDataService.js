import { supabase } from "../lib/supabaseClient";

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableNumber(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getCompletionPercent(onboarding) {
  const checks = [
    onboarding?.personalInfo?.age,
    onboarding?.personalInfo?.city,
    onboarding?.personalInfo?.maritalStatus,
    onboarding?.income?.baseSalary,
    onboarding?.expenses?.rent,
    onboarding?.assets?.cash,
    onboarding?.liabilities?.creditCardDues,
    onboarding?.insurance?.healthInsurance,
    onboarding?.riskProfile,
  ];

  const filled = checks.filter((x) => String(x ?? "").trim() !== "").length;
  return Math.round((filled / checks.length) * 100);
}

export async function upsertOnboardingProfile(userId, onboarding) {
  const payload = {
    user_id: userId,
    age: toNullableNumber(onboarding?.personalInfo?.age),
    city: onboarding?.personalInfo?.city || null,
    marital_status: onboarding?.personalInfo?.maritalStatus || null,
    dependents: toNullableNumber(onboarding?.personalInfo?.dependents) ?? 0,
    risk_profile: onboarding?.riskProfile
      ? String(onboarding.riskProfile).toLowerCase()
      : null,
    completed: !!onboarding?.completed,
    completion_percent: getCompletionPercent(onboarding),
  };

  const { error } = await supabase
    .from("onboarding_profiles")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    throw error;
  }

  return payload;
}

export async function addTransaction(userId, transaction) {
  const payload = {
    user_id: userId,
    txn_type: transaction?.amount >= 0 ? "credit" : "debit",
    description: transaction?.desc || "Transaction",
    category: transaction?.category || "Other",
    amount: Math.abs(toNumber(transaction?.amount, 0)),
    txn_date: transaction?.txn_date || new Date().toISOString().slice(0, 10),
    source: "manual",
  };

  const { data, error } = await supabase
    .from("transactions")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function listTransactions(userId) {
  const { data, error } = await supabase
    .from("transactions")
    .select("id, description, category, amount, txn_type, txn_date")
    .eq("user_id", userId)
    .order("txn_date", { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  return data || [];
}

function firstGoal(goals) {
  if (!Array.isArray(goals) || goals.length === 0) {
    return { type: "Retirement", targetAmount: "", years: "" };
  }
  return goals[0];
}

function buildOnboardingFromRows({
  onboarding,
  expense,
  income,
  asset,
  liability,
  insurance,
  goals,
}) {
  const goal = firstGoal(goals);

  return {
    personalInfo: {
      age: onboarding?.age ?? expense?.current_age ?? "",
      city: onboarding?.city ?? "",
      maritalStatus: onboarding?.marital_status ?? "",
      dependents: onboarding?.dependents ?? 0,
    },
    income: {
      baseSalary: income?.base_salary ?? expense?.salary ?? "",
      hra: income?.hra ?? "",
      otherAllowances: income?.other_allowances ?? "",
      bonus: income?.bonus ?? expense?.bonus ?? "",
      otherIncome: income?.other_income ?? "",
    },
    expenses: {
      rent: expense?.rent ?? "",
      food: expense?.food ?? "",
      travel: expense?.travel ?? "",
      subscriptions: expense?.subscriptions ?? "",
      misc: expense?.misc ?? "",
    },
    assets: {
      mutualFunds: asset?.mutual_funds ?? "",
      ppf: asset?.ppf ?? "",
      stocks: asset?.stocks ?? "",
      fd: asset?.fd ?? "",
      cash: asset?.cash ?? "",
    },
    liabilities: {
      homeLoan: liability?.home_loan ?? "",
      emi: liability?.emi ?? "",
      creditCardDues: liability?.credit_card_dues ?? "",
    },
    insurance: {
      healthInsurance: insurance?.health_insurance ?? "",
      lifeInsurance: insurance?.life_insurance ?? "",
    },
    goals: [
      {
        type: goal?.goal_type ?? "Retirement",
        targetAmount: goal?.target_amount ?? "",
        years: goal?.target_years ?? "",
      },
      { type: "Car", targetAmount: "", years: "" },
      { type: "Travel", targetAmount: "", years: "" },
    ],
    riskProfile:
      onboarding?.risk_profile && typeof onboarding.risk_profile === "string"
        ? onboarding.risk_profile[0].toUpperCase() + onboarding.risk_profile.slice(1)
        : "",
    completed: !!onboarding?.completed,
  };
}

export async function loadFinancialInputs(userId) {
  const [onboardingRes, expenseRes, incomeRes, assetRes, liabilityRes, insuranceRes, goalsRes] =
    await Promise.all([
      supabase
        .from("onboarding_profiles")
        .select("age, city, marital_status, dependents, risk_profile, completed")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("expense_profiles")
        .select("salary, bonus, monthly_expenses, retirement_age, current_age, current_corpus, monthly_investment, current_allocation, deductions, partner_salary, partner_deductions_80c, rent, food, travel, subscriptions, misc")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("income_details")
        .select("base_salary, hra, other_allowances, bonus, other_income")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("asset_snapshots")
        .select("cash, fd, mutual_funds, ppf, stocks")
        .eq("user_id", userId)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("liability_snapshots")
        .select("home_loan, emi, credit_card_dues")
        .eq("user_id", userId)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("insurance_snapshots")
        .select("health_insurance, life_insurance")
        .eq("user_id", userId)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("goals")
        .select("goal_type, target_amount, target_years")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

  const firstError = [
    onboardingRes.error,
    expenseRes.error,
    incomeRes.error,
    assetRes.error,
    liabilityRes.error,
    insuranceRes.error,
    goalsRes.error,
  ].find(Boolean);

  if (firstError) {
    throw firstError;
  }

  const hasAnyData =
    !!onboardingRes.data ||
    !!expenseRes.data ||
    !!incomeRes.data ||
    !!assetRes.data ||
    !!liabilityRes.data ||
    !!insuranceRes.data ||
    (Array.isArray(goalsRes.data) && goalsRes.data.length > 0);

  if (!hasAnyData) {
    return null;
  }

  return buildOnboardingFromRows({
    onboarding: onboardingRes.data,
    expense: expenseRes.data,
    income: incomeRes.data,
    asset: assetRes.data,
    liability: liabilityRes.data,
    insurance: insuranceRes.data,
    goals: goalsRes.data || [],
  });
}

export async function upsertFinancialInputs(userId, onboarding) {
  const snapshotDate = new Date().toISOString().slice(0, 10);
  const expenseTotal =
    toNumber(onboarding?.expenses?.rent) +
    toNumber(onboarding?.expenses?.food) +
    toNumber(onboarding?.expenses?.travel) +
    toNumber(onboarding?.expenses?.subscriptions) +
    toNumber(onboarding?.expenses?.misc);

  const onboardingPayload = {
    user_id: userId,
    age: toNullableNumber(onboarding?.personalInfo?.age),
    city: onboarding?.personalInfo?.city || null,
    marital_status: onboarding?.personalInfo?.maritalStatus || null,
    dependents: toNullableNumber(onboarding?.personalInfo?.dependents) ?? 0,
    risk_profile: onboarding?.riskProfile
      ? String(onboarding.riskProfile).toLowerCase()
      : null,
    completed: !!onboarding?.completed,
    completion_percent: getCompletionPercent(onboarding),
  };

  const expensePayload = {
    user_id: userId,
    salary: toNumber(onboarding?.income?.baseSalary, 0),
    bonus: toNumber(onboarding?.income?.bonus, 0),
    monthly_expenses: expenseTotal,
    retirement_age: toNullableNumber(onboarding?.goals?.[0]?.years)
      ? toNumber(onboarding?.personalInfo?.age, 0) +
        toNumber(onboarding?.goals?.[0]?.years, 0)
      : null,
    current_age: toNullableNumber(onboarding?.personalInfo?.age),
    current_corpus:
      toNumber(onboarding?.assets?.cash) +
      toNumber(onboarding?.assets?.fd) +
      toNumber(onboarding?.assets?.mutualFunds) +
      toNumber(onboarding?.assets?.ppf) +
      toNumber(onboarding?.assets?.stocks),
    monthly_investment: 0,
    current_allocation: {
      mutual_funds: toNumber(onboarding?.assets?.mutualFunds),
      ppf: toNumber(onboarding?.assets?.ppf),
      stocks: toNumber(onboarding?.assets?.stocks),
      fd: toNumber(onboarding?.assets?.fd),
      cash: toNumber(onboarding?.assets?.cash),
    },
    deductions: {
      ppf: toNumber(onboarding?.assets?.ppf),
      health_insurance: toNumber(onboarding?.insurance?.healthInsurance),
    },
    partner_salary: 0,
    partner_deductions_80c: 0,
    rent: toNumber(onboarding?.expenses?.rent),
    food: toNumber(onboarding?.expenses?.food),
    travel: toNumber(onboarding?.expenses?.travel),
    subscriptions: toNumber(onboarding?.expenses?.subscriptions),
    misc: toNumber(onboarding?.expenses?.misc),
  };

  const incomePayload = {
    user_id: userId,
    base_salary: toNumber(onboarding?.income?.baseSalary),
    hra: toNumber(onboarding?.income?.hra),
    other_allowances: toNumber(onboarding?.income?.otherAllowances),
    bonus: toNumber(onboarding?.income?.bonus),
    other_income: toNumber(onboarding?.income?.otherIncome),
  };

  const assetPayload = {
    user_id: userId,
    snapshot_date: snapshotDate,
    cash: toNumber(onboarding?.assets?.cash),
    fd: toNumber(onboarding?.assets?.fd),
    mutual_funds: toNumber(onboarding?.assets?.mutualFunds),
    ppf: toNumber(onboarding?.assets?.ppf),
    stocks: toNumber(onboarding?.assets?.stocks),
  };

  const liabilityPayload = {
    user_id: userId,
    snapshot_date: snapshotDate,
    home_loan: toNumber(onboarding?.liabilities?.homeLoan),
    emi: toNumber(onboarding?.liabilities?.emi),
    credit_card_dues: toNumber(onboarding?.liabilities?.creditCardDues),
  };

  const insurancePayload = {
    user_id: userId,
    snapshot_date: snapshotDate,
    health_insurance: toNumber(onboarding?.insurance?.healthInsurance),
    life_insurance: toNumber(onboarding?.insurance?.lifeInsurance),
  };

  const goal = onboarding?.goals?.[0] || {};
  const goalPayload = {
    user_id: userId,
    goal_type: goal?.type || "Retirement",
    target_amount: toNumber(goal?.targetAmount),
    target_years: toNullableNumber(goal?.years),
  };

  const monthlyBudgetPayload = {
    user_id: userId,
    month: new Date().toISOString().slice(0, 7),
    budget_amount: expenseTotal,
    spent_amount: expenseTotal,
  };

  const writes = await Promise.all([
    supabase
      .from("onboarding_profiles")
      .upsert(onboardingPayload, { onConflict: "user_id" }),
    supabase
      .from("expense_profiles")
      .upsert(expensePayload, { onConflict: "user_id" }),
    supabase
      .from("income_details")
      .upsert(incomePayload, { onConflict: "user_id" }),
    supabase.from("asset_snapshots").upsert(assetPayload, {
      onConflict: "user_id,snapshot_date",
    }),
    supabase.from("liability_snapshots").upsert(liabilityPayload, {
      onConflict: "user_id,snapshot_date",
    }),
    supabase.from("insurance_snapshots").upsert(insurancePayload, {
      onConflict: "user_id,snapshot_date",
    }),
    supabase.from("goals").upsert(goalPayload, {
      onConflict: "user_id,goal_type",
    }),
    supabase.from("monthly_budgets").upsert(monthlyBudgetPayload, {
      onConflict: "user_id,month",
    }),
  ]);

  const firstError = writes.map((x) => x.error).find(Boolean);
  if (firstError) {
    throw firstError;
  }

  return true;
}