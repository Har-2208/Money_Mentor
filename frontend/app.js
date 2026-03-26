const state = {
  monthlyBudget: 45000,
  balance: 128500,
  spent: 27850,
  goal: {
    name: "Emergency Fund",
    target: 200000,
    saved: 105000,
  },
  transactions: [
    { desc: "Salary", category: "Income", amount: 85000 },
    { desc: "Rent", category: "Bills", amount: -18000 },
    { desc: "Groceries", category: "Food", amount: -4200 },
    { desc: "Metro recharge", category: "Transport", amount: -1500 },
    { desc: "Freelance payout", category: "Income", amount: 12500 },
    { desc: "Pharmacy", category: "Health", amount: -1900 },
  ],
};

const USERS_KEY = "amm_users";
const SESSION_KEY = "amm_session";

const screens = document.querySelectorAll(".screen");
const navButtons = document.querySelectorAll(".nav-btn");

const el = {
  authGate: document.getElementById("auth-gate"),
  loginForm: document.getElementById("login-form"),
  loginEmail: document.getElementById("login-email"),
  loginPassword: document.getElementById("login-password"),
  authMessage: document.getElementById("auth-message"),
  userWelcome: document.getElementById("user-welcome"),
  logoutBtn: document.getElementById("logout-btn"),
  ctxBalance: document.getElementById("ctx-balance"),
  ctxBudget: document.getElementById("ctx-budget"),
  ctxGoal: document.getElementById("ctx-goal"),
  insightTitle: document.getElementById("insight-title"),
  insightBody: document.getElementById("insight-body"),
  insightTags: document.getElementById("insight-tags"),
  dashBalance: document.getElementById("dash-balance"),
  cashflowNote: document.getElementById("cashflow-note"),
  breakdownList: document.getElementById("breakdown-list"),
  budgetFill: document.getElementById("budget-meter-fill"),
  budgetText: document.getElementById("budget-meter-text"),
  goalFill: document.getElementById("goal-meter-fill"),
  goalText: document.getElementById("goal-meter-text"),
  spendRadar: document.getElementById("spend-radar"),
  cashflowTrend: document.getElementById("cashflow-trend"),
  categoryDonut: document.getElementById("category-donut"),
  momentumBars: document.getElementById("momentum-bars"),
  chatFeed: document.getElementById("chat-feed"),
  chatForm: document.getElementById("chat-form"),
  chatInput: document.getElementById("chat-input"),
  quickPrompts: document.getElementById("quick-prompts"),
  decisionSnapshot: document.getElementById("decision-snapshot"),
  insightPatterns: document.getElementById("insight-patterns"),
  insightReco: document.getElementById("insight-reco"),
  goalName: document.getElementById("goal-name"),
  goalSummary: document.getElementById("goal-summary"),
  goalMainFill: document.getElementById("goal-main-fill"),
  goalActions: document.getElementById("goal-actions"),
  txnForm: document.getElementById("txn-form"),
  txnDesc: document.getElementById("txn-desc"),
  txnCategory: document.getElementById("txn-category"),
  txnAmount: document.getElementById("txn-amount"),
  txnList: document.getElementById("txn-list"),
  notification: document.getElementById("notification"),
};

function getUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) return [];

  try {
    const users = JSON.parse(raw);
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw);
    return session && session.email ? session : null;
  } catch {
    return null;
  }
}

function setSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ name: user.name, email: user.email }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function setAuthMessage(text, success = false) {
  el.authMessage.textContent = text;
  el.authMessage.classList.toggle("success", success);
}

function lockApp() {
  document.body.classList.add("auth-locked");
  el.userWelcome.textContent = "Guest";
}

function unlockApp(user) {
  document.body.classList.remove("auth-locked");
  el.userWelcome.textContent = user?.name ? `Hi, ${user.name.split(" ")[0]}` : "Signed in";
}

function ensureSeedUser() {
  const users = getUsers();
  const exists = users.some((u) => u.email.toLowerCase() === "demo@moneymentor.app");
  if (!exists) {
    users.push({ name: "Demo User", email: "demo@moneymentor.app", password: "mentor123" });
    saveUsers(users);
  }
}

function formatINR(value) {
  return `INR ${Math.round(value).toLocaleString("en-IN")}`;
}

function budgetUsagePct() {
  return Math.max(0, Math.min(100, (state.spent / state.monthlyBudget) * 100));
}

function goalPct() {
  return Math.max(0, Math.min(100, (state.goal.saved / state.goal.target) * 100));
}

function goalStatusText() {
  const pct = goalPct();
  if (pct >= 80) return "Ahead";
  if (pct >= 55) return "On Track";
  return "Needs Push";
}

function spendingByCategory() {
  const totals = {};
  state.transactions.forEach((txn) => {
    if (txn.amount < 0) {
      totals[txn.category] = (totals[txn.category] || 0) + Math.abs(txn.amount);
    }
  });
  return Object.entries(totals).sort((a, b) => b[1] - a[1]);
}

function setNotification(type, text) {
  el.notification.className = `notification ${type}`;
  el.notification.textContent = text;
}

function updateNotification() {
  const usage = budgetUsagePct();
  if (usage >= 90) {
    setNotification("warn", `Alert: You have used ${usage.toFixed(1)}% of your monthly budget.`);
  } else if (usage >= 75) {
    setNotification("warn", `Heads up: Budget usage is at ${usage.toFixed(1)}%. Consider limiting variable spends.`);
  } else {
    setNotification("good", "You are within healthy budget range. AI will continue monitoring for opportunities.");
  }
}

function renderDashboard() {
  const usage = budgetUsagePct();
  const goalProgress = goalPct();

  el.ctxBalance.textContent = formatINR(state.balance);
  el.ctxBudget.textContent = `${usage.toFixed(1)}%`;
  el.ctxGoal.textContent = goalStatusText();

  el.dashBalance.textContent = formatINR(state.balance);
  el.cashflowNote.textContent =
    state.balance > 100000
      ? "Strong liquidity position this week."
      : "Liquidity is narrowing. Tighten discretionary spending.";

  el.budgetFill.style.width = `${usage}%`;
  el.budgetText.textContent = `${usage.toFixed(1)}% used this month`;

  el.goalFill.style.width = `${goalProgress}%`;
  el.goalText.textContent = `${goalProgress.toFixed(1)}% funded`;

  const breakdown = spendingByCategory();
  el.breakdownList.innerHTML = breakdown
    .slice(0, 4)
    .map(([cat, amount]) => {
      const pct = state.spent > 0 ? ((amount / state.spent) * 100).toFixed(1) : "0.0";
      return `<div class="row"><span>${cat}</span><strong>${formatINR(amount)} (${pct}%)</strong></div>`;
    })
    .join("");

  const topCategory = breakdown[0] ? breakdown[0][0] : "Spending";
  const budgetLeft = state.monthlyBudget - state.spent;

  el.insightTitle.textContent = `${topCategory} spending is driving your monthly burn.`;
  el.insightBody.textContent =
    budgetLeft > 8000
      ? `You still have ${formatINR(budgetLeft)} available. AI suggests reserving part for your goal.`
      : `Only ${formatINR(Math.max(0, budgetLeft))} remains. Shift to essentials to stay on target.`;

  el.insightTags.innerHTML = "";
  [
    `${usage.toFixed(1)}% budget used`,
    `${goalProgress.toFixed(1)}% goal funded`,
    `${topCategory} highest category`,
  ].forEach((tag) => {
    const t = document.createElement("span");
    t.className = "tag";
    t.textContent = tag;
    el.insightTags.appendChild(t);
  });

  updateNotification();
}

function renderSpendingRadar() {
  const svg = el.spendRadar;
  const categories = spendingByCategory().slice(0, 5);
  if (!categories.length) {
    svg.innerHTML = '<text x="20" y="30" class="chart-caption">No spending data yet.</text>';
    return;
  }

  const cx = 160;
  const cy = 115;
  const radius = 82;
  const maxVal = Math.max(...categories.map((x) => x[1]), 1);

  const rings = [0.25, 0.5, 0.75, 1]
    .map((r) => `<circle cx="${cx}" cy="${cy}" r="${(radius * r).toFixed(1)}" fill="none" stroke="rgba(16,34,45,0.12)"/>`)
    .join("");

  const axes = categories
    .map((item, i) => {
      const angle = (-Math.PI / 2) + (i * (Math.PI * 2)) / categories.length;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(16,34,45,0.14)"/>`;
    })
    .join("");

  const polyPoints = categories
    .map((item, i) => {
      const amount = item[1];
      const angle = (-Math.PI / 2) + (i * (Math.PI * 2)) / categories.length;
      const pointRadius = radius * (amount / maxVal);
      const x = cx + Math.cos(angle) * pointRadius;
      const y = cy + Math.sin(angle) * pointRadius;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const labels = categories
    .map((item, i) => {
      const angle = (-Math.PI / 2) + (i * (Math.PI * 2)) / categories.length;
      const x = cx + Math.cos(angle) * (radius + 20);
      const y = cy + Math.sin(angle) * (radius + 20);
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" class="chart-muted">${item[0]}</text>`;
    })
    .join("");

  svg.innerHTML = `
    ${rings}
    ${axes}
    <polygon points="${polyPoints}" fill="rgba(0,122,120,0.30)" stroke="rgba(0,122,120,0.95)" stroke-width="2"/>
    ${labels}
    <text x="18" y="22" class="chart-caption">Top spending categories intensity</text>
  `;
}

function renderCashflowTrend() {
  const svg = el.cashflowTrend;
  const txns = state.transactions.slice(-10);
  if (!txns.length) {
    svg.innerHTML = '<text x="20" y="30" class="chart-caption">No transaction trend yet.</text>';
    return;
  }

  const width = 320;
  const height = 230;
  const padX = 20;
  const padY = 24;
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;

  let run = 0;
  const series = txns.map((txn) => {
    run += txn.amount;
    return run;
  });

  const minVal = Math.min(...series, 0);
  const maxVal = Math.max(...series, 1);
  const span = maxVal - minVal || 1;

  const points = series
    .map((v, i) => {
      const x = padX + (i * usableW) / Math.max(1, series.length - 1);
      const y = padY + usableH - ((v - minVal) / span) * usableH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const area = `${padX},${height - padY} ${points} ${width - padX},${height - padY}`;
  const end = points.split(" ").pop().split(",");

  svg.innerHTML = `
    <line x1="${padX}" y1="${padY}" x2="${padX}" y2="${height - padY}" stroke="rgba(16,34,45,0.18)"/>
    <line x1="${padX}" y1="${height - padY}" x2="${width - padX}" y2="${height - padY}" stroke="rgba(16,34,45,0.18)"/>
    <polygon points="${area}" fill="rgba(231,111,54,0.18)"/>
    <polyline points="${points}" fill="none" stroke="rgba(231,111,54,0.95)" stroke-width="3" stroke-linecap="round"/>
    <circle cx="${end[0]}" cy="${end[1]}" r="4.5" fill="rgba(231,111,54,1)"/>
    <text x="18" y="22" class="chart-caption">Net movement over last 10 transactions</text>
  `;
}

function renderCategoryDonut() {
  const svg = el.categoryDonut;
  const slices = spendingByCategory().slice(0, 5);
  const total = slices.reduce((sum, item) => sum + item[1], 0);
  if (!total) {
    svg.innerHTML = '<text x="20" y="30" class="chart-caption">No spending split available yet.</text>';
    return;
  }

  const colors = ["#007a78", "#e76f36", "#0ea5a2", "#f59e0b", "#2f4858"];
  const cx = 95;
  const cy = 115;
  const radius = 62;
  const stroke = 28;
  const c = 2 * Math.PI * radius;
  let acc = 0;

  const arcs = slices
    .map((item, i) => {
      const share = item[1] / total;
      const len = c * share;
      const dash = `${len.toFixed(2)} ${(c - len).toFixed(2)}`;
      const offset = (-acc * c).toFixed(2);
      acc += share;
      return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${colors[i % colors.length]}" stroke-width="${stroke}" stroke-dasharray="${dash}" stroke-dashoffset="${offset}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="butt"/>`;
    })
    .join("");

  const legend = slices
    .map((item, i) => {
      const y = 54 + i * 30;
      const pct = ((item[1] / total) * 100).toFixed(1);
      return `<rect x="188" y="${y - 10}" width="10" height="10" fill="${colors[i % colors.length]}" rx="2"/>
      <text x="204" y="${y}" class="chart-muted">${item[0]} ${pct}%</text>`;
    })
    .join("");

  svg.innerHTML = `
    ${arcs}
    <circle cx="${cx}" cy="${cy}" r="38" fill="rgba(255,255,255,0.95)"/>
    <text x="${cx}" y="${cy - 3}" text-anchor="middle" class="chart-caption">${formatINR(total)}</text>
    <text x="${cx}" y="${cy + 14}" text-anchor="middle" class="chart-muted">total spent</text>
    ${legend}
  `;
}

function renderMomentumBars() {
  const svg = el.momentumBars;
  const metrics = [
    { label: "Budget Used", value: budgetUsagePct(), color: "#007a78" },
    { label: "Goal Progress", value: goalPct(), color: "#e76f36" },
    { label: "Savings Buffer", value: Math.min(100, (state.balance / 200000) * 100), color: "#2f4858" },
  ];

  const baseY = 182;
  const maxH = 120;
  const barW = 56;
  const gap = 34;
  const startX = 44;

  const bars = metrics
    .map((m, i) => {
      const h = (m.value / 100) * maxH;
      const x = startX + i * (barW + gap);
      const y = baseY - h;
      return `
        <rect x="${x}" y="${y.toFixed(1)}" width="${barW}" height="${h.toFixed(1)}" rx="10" fill="${m.color}" opacity="0.9"/>
        <text x="${x + barW / 2}" y="${(y - 8).toFixed(1)}" text-anchor="middle" class="chart-caption">${m.value.toFixed(0)}%</text>
        <text x="${x + barW / 2}" y="202" text-anchor="middle" class="chart-muted">${m.label}</text>
      `;
    })
    .join("");

  svg.innerHTML = `
    <line x1="24" y1="${baseY}" x2="296" y2="${baseY}" stroke="rgba(16,34,45,0.18)"/>
    ${bars}
    <text x="18" y="22" class="chart-caption">Decision momentum across key metrics</text>
  `;
}

function renderInsights() {
  const breakdown = spendingByCategory();
  const budgetLeft = state.monthlyBudget - state.spent;

  el.insightPatterns.innerHTML = "";
  breakdown.slice(0, 5).forEach(([cat, amount], i) => {
    const row = document.createElement("div");
    row.className = "txn-item";
    row.innerHTML = `<strong>Pattern ${i + 1}: ${cat}</strong><br /><small>${formatINR(
      amount
    )} spent so far this month</small>`;
    el.insightPatterns.appendChild(row);
  });

  const recos = [];
  if (budgetUsagePct() > 80) {
    recos.push("Cap discretionary spending at INR 700 per day for next 7 days.");
  }
  if (budgetLeft > 10000) {
    recos.push("Move INR 4000 into Emergency Fund now while cashflow is positive.");
  }
  recos.push("Schedule weekly spending review every Sunday evening with AI mentor.");

  el.insightReco.innerHTML = recos
    .map((text) => `<div class="txn-item"><strong>Action</strong><br /><small>${text}</small></div>`)
    .join("");
}

function renderGoals() {
  const progress = goalPct();
  const remaining = Math.max(0, state.goal.target - state.goal.saved);

  el.goalName.textContent = state.goal.name;
  el.goalSummary.textContent = `${formatINR(state.goal.saved)} saved of ${formatINR(
    state.goal.target
  )}. Remaining ${formatINR(remaining)}.`;

  el.goalMainFill.style.width = `${progress}%`;

  const actions = [
    `Auto-allocate ${formatINR(Math.min(3000, Math.max(1500, remaining * 0.08)))} after next salary.`,
    "Pause one high-frequency non-essential category for 10 days.",
    "Use AI decision checks before purchases above INR 2500.",
  ];

  el.goalActions.innerHTML = actions
    .map((a) => `<div class="txn-item"><small>${a}</small></div>`)
    .join("");
}

function renderTransactions() {
  el.txnList.innerHTML = state.transactions
    .slice()
    .reverse()
    .slice(0, 10)
    .map((txn) => {
      const sign = txn.amount >= 0 ? "+" : "-";
      const cls = txn.amount >= 0 ? "var(--good)" : "var(--warn)";
      return `<div class="txn-item">
        <div class="row">
          <strong>${txn.desc}</strong>
          <strong style="color:${cls}">${sign}${formatINR(Math.abs(txn.amount))}</strong>
        </div>
        <small>${txn.category}</small>
      </div>`;
    })
    .join("");
}

function updateDecisionSnapshot() {
  const budgetLeft = state.monthlyBudget - state.spent;
  const snapshot = [
    `Budget left this month: ${formatINR(Math.max(0, budgetLeft))}`,
    `Safe discretionary window: ${formatINR(Math.max(0, budgetLeft * 0.45))}`,
    `Goal momentum: ${goalPct().toFixed(1)}% complete (${goalStatusText()})`,
  ];
  el.decisionSnapshot.innerHTML = snapshot.map((s) => `<p>${s}</p>`).join("");
}

function generateStructuredResponse(input) {
  const text = input.toLowerCase();
  const budgetLeft = state.monthlyBudget - state.spent;

  if (text.includes("can i spend") || text.includes("spend")) {
    const amountMatch = text.match(/(\d{2,7})/);
    const askAmount = amountMatch ? Number(amountMatch[1]) : 0;

    const decision = askAmount <= budgetLeft * 0.6;
    const answer = decision
      ? `Yes, spending ${formatINR(askAmount)} is reasonable right now.`
      : `Not recommended right now for ${formatINR(askAmount)}.`;
    const reasoning =
      askAmount > 0
        ? `You have ${formatINR(Math.max(0, budgetLeft))} left in budget and ${formatINR(
            state.balance
          )} in balance.`
        : `I need an amount to evaluate against your budget and goal velocity.`;
    const impact = decision
      ? `After spending, your estimated budget headroom stays near ${formatINR(
          Math.max(0, budgetLeft - askAmount)
        )}. Goal progress remains stable.`
      : `After spending, budget headroom drops to ${formatINR(
          Math.max(0, budgetLeft - askAmount)
        )}, increasing risk of overshoot and slower goal funding.`;

    return { answer, reasoning, impact };
  }

  if (text.includes("goal") || text.includes("save")) {
    return {
      answer: "You can accelerate your goal this month.",
      reasoning: `Current goal progress is ${goalPct().toFixed(1)}% and you still hold ${formatINR(
        state.balance
      )} in liquidity.`,
      impact:
        "Moving a moderate amount now improves your safety buffer and reduces decision stress later.",
    };
  }

  return {
    answer: "Here is the decision summary from your current financial context.",
    reasoning: `Budget usage is ${budgetUsagePct().toFixed(1)}% and goal status is ${goalStatusText()}.`,
    impact: "Follow the smart suggestions panel to convert this into immediate actions.",
  };
}

function appendUserMessage(text) {
  const msg = document.createElement("div");
  msg.className = "msg user";
  msg.textContent = text;
  el.chatFeed.appendChild(msg);
}

function appendAIMessage({ answer, reasoning, impact }) {
  const msg = document.createElement("div");
  msg.className = "msg ai";
  msg.innerHTML = `
    <div class="structured">
      <div><strong>Answer:</strong> ${answer}</div>
      <blockquote><strong>Reasoning:</strong> ${reasoning}</blockquote>
      <div><strong>Impact:</strong> ${impact}</div>
    </div>
  `;
  el.chatFeed.appendChild(msg);
  el.chatFeed.scrollTop = el.chatFeed.scrollHeight;
}

function seedChat() {
  if (el.chatFeed.children.length > 0) return;
  appendAIMessage({
    answer: "I am actively tracking your spending and goal path.",
    reasoning:
      "Your current state combines transaction flow, budget consumption, and goal progress in one decision model.",
    impact: "Ask any spending question and I will respond with decision-first guidance.",
  });
}

function renderQuickPrompts() {
  const prompts = [
    "Can I spend INR 5000 on a short trip?",
    "How do I save faster this month?",
    "Where am I overspending right now?",
  ];

  el.quickPrompts.innerHTML = "";
  prompts.forEach((prompt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pill-btn";
    btn.textContent = prompt;
    btn.addEventListener("click", () => {
      appendUserMessage(prompt);
      appendAIMessage(generateStructuredResponse(prompt));
    });
    el.quickPrompts.appendChild(btn);
  });
}

function renderAll() {
  renderDashboard();
  renderInsights();
  renderGoals();
  renderTransactions();
  renderSpendingRadar();
  renderCashflowTrend();
  renderCategoryDonut();
  renderMomentumBars();
  updateDecisionSnapshot();
}

el.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const email = el.loginEmail.value.trim().toLowerCase();
  const password = el.loginPassword.value;
  const user = getUsers().find((u) => u.email.toLowerCase() === email);

  if (!user || user.password !== password) {
    setAuthMessage("Invalid credentials. Try again.");
    return;
  }

  setSession(user);
  unlockApp(user);
  setAuthMessage("Login successful.", true);
  el.loginForm.reset();
});

el.logoutBtn.addEventListener("click", () => {
  clearSession();
  lockApp();
  setAuthMessage("You have been logged out.", true);
});

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    navButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const target = btn.dataset.screen;
    screens.forEach((s) => s.classList.remove("active-screen"));
    document.getElementById(target).classList.add("active-screen");
  });
});

el.chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = el.chatInput.value.trim();
  if (!value) return;

  appendUserMessage(value);
  appendAIMessage(generateStructuredResponse(value));
  el.chatInput.value = "";
});

el.txnForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const desc = el.txnDesc.value.trim();
  const category = el.txnCategory.value;
  const raw = Number(el.txnAmount.value);
  if (!desc || raw <= 0) return;

  const amount = category === "Income" ? raw : -raw;
  state.transactions.push({ desc, category, amount });

  if (amount >= 0) {
    state.balance += amount;
  } else {
    state.balance -= Math.abs(amount);
    state.spent += Math.abs(amount);
  }

  if (state.spent > state.monthlyBudget) {
    setNotification("warn", "Budget exceeded. AI recommends immediate spending freeze on non-essentials.");
  }

  renderAll();
  el.txnForm.reset();

  appendAIMessage({
    answer: `${desc} recorded successfully.`,
    reasoning: `Category ${category} changed your budget and balance context in real time.`,
    impact: "Future AI recommendations are now updated with this transaction.",
  });
});

seedChat();
renderQuickPrompts();
renderAll();

ensureSeedUser();
lockApp();

setAuthMessage("");

const session = getSession();
if (session) {
  const user = getUsers().find((u) => u.email.toLowerCase() === session.email.toLowerCase());
  if (user) {
    unlockApp(user);
    setAuthMessage("Welcome back!");
  }
}
