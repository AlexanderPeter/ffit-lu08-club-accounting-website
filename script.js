const API_BASE = "https://localhost:8443";

const form = document.getElementById("projectForm");
const result = document.getElementById("result");

// create toast
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

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    project_name: form.project_name.value,
    password: form.password.value,
  };

  console.log("Send request:", payload);

  try {
    const response = await fetch(`${API_BASE}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    console.log(`Status ${response.status}:`, text);

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
