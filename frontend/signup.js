const USERS_KEY = "amm_users";
const SESSION_KEY = "amm_session";

const el = {
  form: document.getElementById("signup-form"),
  name: document.getElementById("signup-name"),
  email: document.getElementById("signup-email"),
  password: document.getElementById("signup-password"),
  confirm: document.getElementById("signup-confirm"),
  message: document.getElementById("signup-message"),
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

function setSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ name: user.name, email: user.email }));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setMessage(text, success = false) {
  el.message.textContent = text;
  el.message.classList.toggle("success", success);
}

el.form.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = el.name.value.trim();
  const email = el.email.value.trim().toLowerCase();
  const password = el.password.value;
  const confirm = el.confirm.value;

  if (!name || !isValidEmail(email)) {
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

  const users = getUsers();
  const exists = users.some((u) => u.email.toLowerCase() === email);
  if (exists) {
    setMessage("This email is already registered. Please login.");
    return;
  }

  users.push({ name, email, password });
  saveUsers(users);
  
  const newUser = { name, email, password };
  setSession(newUser);

  setMessage("Account created. Redirecting to dashboard...", true);
  setTimeout(() => {
    window.location.href = "index.html";
  }, 500);
});
