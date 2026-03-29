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
  const isProvided = (value) => {
    if (value === undefined || value === null) return false;
    return String(value).trim() !== "";
  };

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

  const filled = checks.filter((x) => isProvided(x)).length;
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

const DEFAULT_GOAL_SLOTS = ["Retirement", "Car", "Travel"];

function buildGoalsFromRows(goals) {
  const source = Array.isArray(goals) ? goals : [];
  const byType = new Map(
    source.map((goal) => [String(goal?.goal_type || "").toLowerCase(), goal]),
  );

  return DEFAULT_GOAL_SLOTS.map((slot) => {
    const hit = byType.get(slot.toLowerCase());
    return {
      type: slot,
      targetAmount: hit?.target_amount ?? "",
      years: hit?.target_years ?? "",
    };
  });
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
  const normalizedGoals = buildGoalsFromRows(goals);

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
    goals: normalizedGoals,
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
        .limit(10),
    ]);

  // Do not fail the entire prefill if one table query fails.
  // This keeps onboarding data visible even with partial schema/table issues.
  const errors = [
    onboardingRes.error,
    expenseRes.error,
    incomeRes.error,
    assetRes.error,
    liabilityRes.error,
    insuranceRes.error,
    goalsRes.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    console.warn("Partial Supabase read failure in loadFinancialInputs", errors);
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
    onboarding: onboardingRes.data || null,
    expense: expenseRes.data || null,
    income: incomeRes.data || null,
    asset: assetRes.data || null,
    liability: liabilityRes.data || null,
    insurance: insuranceRes.data || null,
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
    salary: toNullableNumber(onboarding?.income?.baseSalary),
    bonus: toNullableNumber(onboarding?.income?.bonus),
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
      mutual_funds: toNullableNumber(onboarding?.assets?.mutualFunds),
      ppf: toNullableNumber(onboarding?.assets?.ppf),
      stocks: toNullableNumber(onboarding?.assets?.stocks),
      fd: toNullableNumber(onboarding?.assets?.fd),
      cash: toNullableNumber(onboarding?.assets?.cash),
    },
    deductions: {
      ppf: toNullableNumber(onboarding?.assets?.ppf),
      health_insurance: toNullableNumber(onboarding?.insurance?.healthInsurance),
    },
    partner_salary: 0,
    partner_deductions_80c: 0,
    rent: toNullableNumber(onboarding?.expenses?.rent),
    food: toNullableNumber(onboarding?.expenses?.food),
    travel: toNullableNumber(onboarding?.expenses?.travel),
    subscriptions: toNullableNumber(onboarding?.expenses?.subscriptions),
    misc: toNullableNumber(onboarding?.expenses?.misc),
  };

  const incomePayload = {
    user_id: userId,
    base_salary: toNullableNumber(onboarding?.income?.baseSalary),
    hra: toNullableNumber(onboarding?.income?.hra),
    other_allowances: toNullableNumber(onboarding?.income?.otherAllowances),
    bonus: toNullableNumber(onboarding?.income?.bonus),
    other_income: toNullableNumber(onboarding?.income?.otherIncome),
  };

  const assetPayload = {
    user_id: userId,
    snapshot_date: snapshotDate,
    cash: toNullableNumber(onboarding?.assets?.cash),
    fd: toNullableNumber(onboarding?.assets?.fd),
    mutual_funds: toNullableNumber(onboarding?.assets?.mutualFunds),
    ppf: toNullableNumber(onboarding?.assets?.ppf),
    stocks: toNullableNumber(onboarding?.assets?.stocks),
  };

  const liabilityPayload = {
    user_id: userId,
    snapshot_date: snapshotDate,
    home_loan: toNullableNumber(onboarding?.liabilities?.homeLoan),
    emi: toNullableNumber(onboarding?.liabilities?.emi),
    credit_card_dues: toNullableNumber(onboarding?.liabilities?.creditCardDues),
  };

  const insurancePayload = {
    user_id: userId,
    snapshot_date: snapshotDate,
    health_insurance: toNullableNumber(onboarding?.insurance?.healthInsurance),
    life_insurance: toNullableNumber(onboarding?.insurance?.lifeInsurance),
  };

  const goalPayloads = (onboarding?.goals || [])
    .map((goal) => ({
      user_id: userId,
      goal_type: goal?.type || "Retirement",
      target_amount: toNullableNumber(goal?.targetAmount),
      target_years: toNullableNumber(goal?.years),
    }))
    .filter((goal) => String(goal.goal_type || "").trim() !== "");

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
    goalPayloads.length
      ? supabase.from("goals").upsert(goalPayloads, {
          onConflict: "user_id,goal_type",
        })
      : Promise.resolve({ error: null }),
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