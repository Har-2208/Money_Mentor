const SUPABASE_URL =
  window.SUPABASE_URL ||
  "https://otnhisnarvvihdkieqce.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  window.SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_chW2Q-LRch_45SUiaibaHQ_qYXJx3K9";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

const el = {
  form: document.getElementById("signup-form"),
  name: document.getElementById("signup-name"),
  email: document.getElementById("signup-email"),
  password: document.getElementById("signup-password"),
  confirm: document.getElementById("signup-confirm"),
  message: document.getElementById("signup-message"),
};

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setMessage(text, success = false) {
  el.message.textContent = text;
  el.message.classList.toggle("success", success);
}

async function ensureProfile(user, fullName) {
  if (!user?.id) return;

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: fullName,
      email: user.email,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw error;
  }
}

el.form.addEventListener("submit", async (event) => {
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

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (error) {
      throw error;
    }

    const authUser = data?.user;
    if (!authUser) {
      setMessage("Signup succeeded. Please verify your email, then login.", true);
      return;
    }

    try {
      await ensureProfile(authUser, name);
    } catch {
      // Profile row write can fail if email confirmation is pending and no session exists.
    }

    if (!data?.session) {
      setMessage("Signup successful. Verify your email, then login.", true);
      setTimeout(() => {
        window.location.href = "index.html";
      }, 900);
      return;
    }

    setMessage("Account created. Redirecting to dashboard...", true);
    setTimeout(() => {
      window.location.href = "index.html";
    }, 500);
  } catch (error) {
    setMessage(error?.message || "Signup failed. Please try again.");
  }
});
