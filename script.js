const API_BASE = "https://localhost:8443";

// Elements
const tabRegister = document.getElementById("tab-register");
const tabLogin = document.getElementById("tab-login");
const formRegister = document.getElementById("form-register");
const formLogin = document.getElementById("form-login");

// Create toast
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.className = `toast ${type}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

tabRegister.onclick = () => {
  tabRegister.classList.add("active");
  tabLogin.classList.remove("active");
  formRegister.classList.add("active");
  formLogin.classList.remove("active");
};

tabLogin.onclick = () => {
  tabLogin.classList.add("active");
  tabRegister.classList.remove("active");
  formLogin.classList.add("active");
  formRegister.classList.remove("active");
};

// Create project
formRegister.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    project_name: formRegister.project_name_register.value,
    password: formRegister.password_register.value,
  };

  console.log("POST /projects", payload);

  try {
    const response = await fetch(`${API_BASE}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log(`Status ${response.status}`);

    if (response.ok) {
      showToast("✅ Projekt erfolgreich erstellt!", "success");
    } else {
      showToast(`❌ Fehler: ${response.status}`, "error");
    }
  } catch (err) {
    console.error("Verbindungsfehler:", err);
    showToast("⚠️ Verbindungsfehler", "error");
  }
});

// Login
formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    project_name: formLogin.project_name_login.value,
    password: formLogin.password_login.value,
  };

  console.log("POST /login", payload);

  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log(`Status ${response.status}`);

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      console.log("Response data:", data);

      if (data.access_token) {
        localStorage.setItem("access_token", data.access_token);
        showToast("🔐 Login erfolgreich!", "success");
        console.log("Access Token gespeichert:", data.access_token);
      } else {
        showToast("⚠️ Unerwartete Antwort vom Server", "error");
      }
    } else if (response.status === 401) {
      showToast("❌ Ungültige Anmeldedaten", "error");
      return;
    } else {
      showToast(`❌ Fehler (${response.status})`, "error");
    }
  } catch (err) {
    console.error("Verbindungsfehler:", err);
    showToast("⚠️ Verbindungsfehler", "error");
  }
});
