// api.js

const API_BASE = "https://localhost:8443";

async function login(project, password) {
  const payload = { project_name: project, password };
  console.log("POST /login", payload);
  const response = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  console.log(`Status ${response.status}`);

  const data = await response.json().catch(() => ({}));
  if (data.access_token) {
    localStorage.setItem("access_token", data.access_token);
    return true;
  } else {
    throw new Error("Login fehlgeschlagen");
  }
}

async function register(project, password) {
  const payload = { project_name: project, password };

  console.log("POST /projects", payload);

  try {
    const response = await fetch(`${API_BASE}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log(`Status ${response.status}`);

    return response.ok;
  } catch (err) {
    console.error("Verbindungsfehler:", err);
    throw new Error("Verbindungsfehler");
  }
}

async function getData(path) {
  console.log(`GET /${path}`);
  const response = await fetch(`${API_BASE}/${path}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
  });
  if (!response.ok) throw new Error(`Fehler beim Laden: ${path}`);
  return await response.json();
}

async function putData(path, payload) {
  console.log(`PUT /${path}`, payload);
  const response = await fetch(`${API_BASE}/${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Fehler beim Speichern: ${path}`);
}

// ui.js

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

function switchAuthTab(tab) {
  document.getElementById("form-login").classList.toggle("active", tab === "login");
  document.getElementById("form-register").classList.toggle("active", tab === "register");
  document.getElementById("tab-login").classList.toggle("active", tab === "login");
  document.getElementById("tab-register").classList.toggle("active", tab === "register");
}

function switchAppTab(tab) {
  document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
  document.getElementById(`tab-${tab}`).classList.add("active");
  document.getElementById(`${tab}-view`).classList.remove("hidden");
}

// editable-table.js
class EditableTable {
  constructor(config) {
    this.apiPath = config.apiPath;
    this.table = config.table;
    this.addBtn = config.addBtn;
    this.saveBtn = config.saveBtn;
    this.columns = config.columns;
    this.data = [];
    this.changed = new Set();
    this.accountOptions = config.accountOptions || [];

    this.addBtn.onclick = () => this.addRow();
    this.saveBtn.onclick = () => this.save();
  }

  async load() {
    this.data = await getData(this.apiPath);
    this.data.sort((a, b) => a.number - b.number);
    this.render();
  }

  render() {
    console.log(`Render EditableTable '${this.apiPath}'`);
    const tbody = this.table.querySelector("tbody");
    tbody.innerHTML = "";

    this.data.forEach((row, i) => {
      const tr = document.createElement("tr");

      this.columns.forEach(col => {
        const td = document.createElement("td");
        let input;

        if (this.apiPath === "bookings" && (col === "debit" || col === "credit")) {
          const select = document.createElement("select");
          select.dataset.index = i;
          select.dataset.field = col;

          const emptyOpt = document.createElement("option");
          emptyOpt.value = "";
          emptyOpt.textContent = "---";
          select.appendChild(emptyOpt);

          this.accountOptions.forEach(opt => {
            const option = document.createElement("option");
            option.value = String(opt.value);
            option.textContent = opt.label;
            select.appendChild(option);
          });

          select.value = row[col] != null ? String(row[col]) : "";

          select.addEventListener("change", (e) => this.onEdit(e));
          input = select;
        } else {
          input = document.createElement("input");

          if (col === "date") {
            input.type = "date";
          } else if (["number", "amount"].includes(col)) {
            input.type = "number";
            input.step = col === "amount" ? "0.01" : "1";
          } else {
            input.type = "text";
          }

          input.value = row[col] ?? "";
        }

        input.dataset.index = i;
        input.dataset.field = col;
        input.addEventListener("input", e => this.onEdit(e));
        td.appendChild(input);
        tr.appendChild(td);
      });

      const tdAction = document.createElement("td");
      const delBtn = document.createElement("button");
      delBtn.textContent = "🗑️";
      delBtn.onclick = () => this.toggleDelete(i);
      tdAction.appendChild(delBtn);
      tr.appendChild(tdAction);

      if (row._deleted) tr.classList.add("deleted");
      if (row._new) tr.classList.add("new");
      if (this.changed.has(i)) tr.classList.add("modified");

      tbody.appendChild(tr);
    });
  }

  onEdit(e) {
    const i = e.target.dataset.index;
    const field = e.target.dataset.field;
    this.data[i][field] = e.target.value;
    this.changed.add(Number(i));
    e.target.closest("tr").classList.add("modified");
  }

  toggleDelete(i) {
    this.data[i]._deleted = !this.data[i]._deleted;
    this.render();
  }

  addRow() {
    const newRow = {};
    this.columns.forEach(c => (newRow[c] = ""));
    newRow._new = true;
    this.data.push(newRow);
    this.render();
  }

  async save() {
    const changedData = this.data.filter((r, i) => r._new || r._deleted || this.changed.has(i));

    if (changedData.length === 0) {
      showToast("Keine Änderungen vorhanden.");
      return;
    }

    const payloadKey = this.apiPath === "accounts" ? "accounts" : "entries";


    const cleanData = changedData.map(row => {
      const obj = {};

      if (this.apiPath === "bookings") {
        if (row.number != null) obj.id = Number(row.number);

        this.columns.forEach(c => {
          if (c === "number") return;

          if (row._deleted) {
            obj[c] = null;
          } else {
            const raw = row[c];
            if (raw === "" || raw == null) {
              obj[c] = null;
            } else if (c === "debit" || c === "credit") {
              const n = Number(raw);
              obj[c] = Number.isFinite(n) ? n : null;
            } else if (c === "amount") {
              const f = Number(raw);
              obj[c] = Number.isFinite(f) ? f : null;
            } else {
              obj[c] = raw;
            }
          }
        });
      } else {
        this.columns.forEach(c => {
          if (row._deleted) {
            obj[c] = c === "number" ? Number(row[c]) : null;
          } else {
            if (c === "number") {
              const n = Number(row[c]);
              obj[c] = Number.isFinite(n) ? n : null;
            } else {
              obj[c] = row[c] === "" || row[c] == null ? null : String(row[c]);
            }
          }
        });
      }

      return obj;
    });


    const payload = { [payloadKey]: cleanData };
    await putData(this.apiPath, payload);
    showToast("Gespeichert.", "success");

    this.changed.clear();
    await this.load();
    renderStatement();
    renderBalance();
  }
}

// main.js

const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");

document.getElementById("tab-login").onclick = () => switchAuthTab("login");
document.getElementById("tab-register").onclick = () => switchAuthTab("register");

document.getElementById("form-login").onsubmit = async e => {
  e.preventDefault();
  const project = document.getElementById("project_name_login").value;
  const password = document.getElementById("password_login").value;
  try {
    await login(project, password);
    await initApp();
  } catch (err) {
    showToast(err.message, "error");
  }
};

document.getElementById("form-register").onsubmit = async e => {
  e.preventDefault();
  const project = document.getElementById("project_name_register").value;
  const password = document.getElementById("password_register").value;
  try {
    const status = await register(project, password);
    if (status) {
      showToast("✅ Projekt erfolgreich erstellt!", "success");
      switchAuthTab("login");
    } else {
      showToast("❌ Projekt kann nicht erstellt werden", "error");
    }
  } catch (err) {
    showToast(err.message, "error");
  }
};


document.getElementById("logout-btn").onclick = () => {
  localStorage.removeItem("access_token");
  appSection.classList.add("hidden");
  authSection.classList.remove("hidden");
};

document.getElementById("tab-accounts").onclick = () => switchAppTab("accounts");
document.getElementById("tab-bookings").onclick = () => switchAppTab("bookings");
document.getElementById("tab-balances").onclick = () => switchAppTab("balances");
document.getElementById("tab-statement").onclick = () => switchAppTab("statement");

const accountsTable = new EditableTable({
  apiPath: "accounts",
  table: document.getElementById("accounts-table"),
  addBtn: document.getElementById("add-account"),
  saveBtn: document.getElementById("save-accounts"),
  columns: ["number", "name"],
});

const bookingsTable = new EditableTable({
  apiPath: "bookings",
  table: document.getElementById("bookings-table"),
  addBtn: document.getElementById("add-booking"),
  saveBtn: document.getElementById("save-bookings"),
  columns: ["number", "date", "text", "debit", "credit", "amount"],
});

async function initApp() {
  console.log("Init app");
  authSection.classList.add("hidden");
  appSection.classList.remove("hidden");

  await accountsTable.load();
  const accountOptions = accountsTable.data.map(a => ({
    value: a.number,
    label: `${a.number} – ${a.name}`,
  }));

  bookingsTable.accountOptions = accountOptions;
  await bookingsTable.load();

  const originalSave = accountsTable.save.bind(accountsTable);
  accountsTable.save = async () => {
    await originalSave();
    const updatedAccounts = accountsTable.data.map(a => ({
      value: a.number,
      label: `${a.number} – ${a.name}`,
    }));
    bookingsTable.accountOptions = updatedAccounts;
    bookingsTable.data.forEach((b, i) => {
      if (!updatedAccounts.some(acc => acc.value == b.debit)) {
        b.debit = null;
        bookingsTable.changed.add(i);
      }
      if (!updatedAccounts.some(acc => acc.value == b.credit)) {
        b.credit = null;
        bookingsTable.changed.add(i);
      }
    });
    bookingsTable.render();
  };
  renderStatement();
  renderBalance();
}

function getProfit(toDate) {
  if (!toDate) {
    return 0;
  }

  const saldo = calculateStatement(toDate);

  let revenue = 0;
  let expense = 0;

  Object.keys(saldo).forEach(acc => {
    if (acc.startsWith("4")) {
      revenue += saldo[acc]
    } else if (acc.startsWith("3")) {
      expense += saldo[acc];
    }
  });

  return expense - revenue;
}


function calculateStatement(toDate) {
  if (!toDate) {
    return {};
  }

  const balances = {};

  bookingsTable.data.forEach(b => {
    if (toDate < b.date) {
      return;
    }

    const amount = Number(b.amount);

    if (b.debit) {
      if (!balances[b.debit]) {
        balances[b.debit] = { debit: 0, credit: 0 };
      }
      balances[b.debit].debit += amount;
    }

    if (b.credit) {
      if (!balances[b.credit]) {
        balances[b.credit] = { debit: 0, credit: 0 };
      }
      balances[b.credit].credit += amount;
    }
  });

  const saldo = {};

  Object.keys(balances).forEach(acc => {
    const d = balances[acc].debit;
    const c = balances[acc].credit;

    if (acc.startsWith("4")) {
      saldo[acc] = d - c;
    } else if (acc.startsWith("3")) {
      saldo[acc] = c - d;
    }
  });

  return saldo;
}

function renderStatement() {
  console.log("Render statement");

  const accounts = accountsTable.data;
  // const from = document.getElementById("statement-from").value;
  const to = document.getElementById("statement-to").value;

  const saldo = calculateStatement(to);

  const tbody = document.querySelector("#statement-table tbody");
  tbody.innerHTML = "";

  const expense = accounts.filter(a => a.number.toString().startsWith("4"));
  const revenue = accounts.filter(a => a.number.toString().startsWith("3"));

  const maxRows = Math.max(expense.length, revenue.length);

  let sumExpense = 0;
  let sumRevenue = 0;

  for (let i = 0; i < maxRows; i++) {
    const aw = expense[i];
    const er = revenue[i];

    const awAmount = aw ? (saldo[aw.number] || 0) : "";
    const erAmount = er ? (saldo[er.number] || 0) : "";

    if (awAmount && !isNaN(awAmount)) sumExpense += awAmount;
    if (erAmount && !isNaN(erAmount)) sumRevenue += erAmount;

    tbody.innerHTML += `
      <tr>
        <td>${aw ? aw.number + " – " + aw.name : ""}</td>
        <td>${awAmount !== "" ? awAmount.toFixed(2) : ""}</td>
        <td>${er ? er.number + " – " + er.name : ""}</td>
        <td>${erAmount !== "" ? erAmount.toFixed(2) : ""}</td>
      </tr>
    `;
  }
  const profitSum = sumRevenue - sumExpense;

  document.getElementById("profit-sum").innerHTML = `<strong>${profitSum.toFixed(2)}</strong>`;
}

// document.getElementById("statement-from").addEventListener("change", renderStatement);
document.getElementById("statement-to").addEventListener("change", renderStatement);

function calculateBalances(dateLimit) {
  if (!dateLimit) {
    return {};
  }

  const balances = {};

  bookingsTable.data.forEach(b => {
    if (b.date > dateLimit) {
      return;
    };
    const amount = Number(b.amount);

    if (b.debit) {
      if (!balances[b.debit]) {
        balances[b.debit] = { debit: 0, credit: 0 };
      }
      balances[b.debit].debit += amount;
    }

    if (b.credit) {
      if (!balances[b.credit]) {
        balances[b.credit] = { debit: 0, credit: 0 };
      }
      balances[b.credit].credit += amount;
    }
  });

  const saldo = {};

  Object.keys(balances).forEach(acc => {
    const d = balances[acc].debit;
    const c = balances[acc].credit;

    if (acc.startsWith("1")) {
      saldo[acc] = d - c;
    } else if (acc.startsWith("2")) {
      saldo[acc] = c - d;
    }
  });

  return saldo;
}

function renderBalance() {
  console.log("Render balance");
  const accounts = accountsTable.data;
  const dateInput = document.getElementById("balance-date").value;
  const saldo = calculateBalances(dateInput);
  const tbody = document.querySelector("#balance-table tbody");
  tbody.innerHTML = "";

  const assetsAccounts = accounts.filter(a => a.number.toString().startsWith("1"));
  const liabilitiesAccounts = accounts.filter(a => a.number.toString().startsWith("2"));

  const maxRows = Math.max(assetsAccounts.length, liabilitiesAccounts.length);

  let assetsSum = 0;
  let liabilitiesSum = 0;

  for (let i = 0; i < maxRows; i++) {
    const assAcc = assetsAccounts[i];
    const liaAcc = liabilitiesAccounts[i];

    const assAccAmount = assAcc ? (saldo[assAcc.number] || 0) : "";
    const liaAccAmount = liaAcc ? (saldo[liaAcc.number] || 0) : "";

    if (assAccAmount && !isNaN(assAccAmount)) assetsSum += assAccAmount;
    if (liaAccAmount && !isNaN(liaAccAmount)) liabilitiesSum += liaAccAmount;

    tbody.innerHTML += `
      <tr>
        <td>${assAcc ? assAcc.number + " – " + assAcc.name : ""}</td>
        <td>${assAccAmount !== "" ? assAccAmount.toFixed(2) : ""}</td>
        <td>${liaAcc ? liaAcc.number + " – " + liaAcc.name : ""}</td>
        <td>${liaAccAmount !== "" ? liaAccAmount.toFixed(2) : ""}</td>
      </tr>
    `;
  }

  const profit = getProfit(dateInput);
  tbody.innerHTML += `
    <tr>
      <td></td>
      <td></td>
      <td>Gewinn/Verlust</td>
      <td>${profit.toFixed(2)}</td>
    </tr>
  `;

  liabilitiesSum += profit;

  const assetsSumEl = document.getElementById("assets-sum");
  assetsSumEl.innerHTML = `<strong>${assetsSum.toFixed(2)}</strong>`;

  const liabilitiesSumEl = document.getElementById("liabilities-sum");
  liabilitiesSumEl.innerHTML = `<strong>${liabilitiesSum.toFixed(2)}</strong>`;

  if (0.0001 < Math.abs(assetsSum - liabilitiesSum)) {
    assetsSumEl.classList.add("red");
    liabilitiesSumEl.classList.add("red");
  } else {
    assetsSumEl.classList.remove("red");
    liabilitiesSumEl.classList.remove("red");
  }
}

document.getElementById("balance-date").addEventListener("change", renderBalance);
