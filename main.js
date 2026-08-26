const STORAGE_KEY = "ledger-state";

let budget = 0;
let entries = [];

// DOM refs
const loadingEl = document.getElementById("loading");
const appEl = document.getElementById("app");

const budgetDisplay = document.getElementById("budgetDisplay");
const budgetEdit = document.getElementById("budgetEdit");
const budgetBtn = document.getElementById("budgetBtn");
const budgetValue = document.getElementById("budgetValue");
const budgetInput = document.getElementById("budgetInput");

const statSpent = document.getElementById("statSpent");
const statRemaining = document.getElementById("statRemaining");
const statEntries = document.getElementById("statEntries");

const progressFill = document.getElementById("progressFill");
const progressPct = document.getElementById("progressPct");
const overBudgetTag = document.getElementById("overBudgetTag");

const nameInput = document.getElementById("nameInput");
const amountInput = document.getElementById("amountInput");
const addBtn = document.getElementById("addBtn");

const ledgerRows = document.getElementById("ledgerRows");
const emptyState = document.getElementById("emptyState");
const saveError = document.getElementById("saveError");

function money(n) {
  const sign = n < 0 ? "\u2212" : "";
  return (
    sign +
    "$" +
    Math.abs(n).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      budget = parsed.budget || 0;
      entries = parsed.entries || [];
    }
  } catch (e) {
    // no existing data yet, or storage unavailable — fine
  } finally {
    loadingEl.classList.add("hidden");
    appEl.classList.remove("hidden");
    render();
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ budget, entries }));
    saveError.classList.add("hidden");
  } catch (e) {
    saveError.classList.remove("hidden");
  }
}

function render() {
  const totalSpent = entries.reduce((sum, e) => sum + e.amount, 0);
  const remaining = budget - totalSpent;
  const overBudget = remaining < 0;
  const pct = budget > 0 ? Math.min((totalSpent / budget) * 100, 999) : 0;

  budgetValue.textContent = money(budget);
  statSpent.textContent = money(totalSpent);
  statSpent.className = "mono stat-value";

  statRemaining.textContent = money(remaining);
  statRemaining.className = "mono stat-value " + (overBudget ? "danger" : "positive");

  statEntries.textContent = String(entries.length);

  progressFill.style.width = Math.min(pct, 100) + "%";
  progressFill.classList.toggle("over", overBudget);
  progressPct.textContent = pct.toFixed(1) + "% of budget used";
  overBudgetTag.classList.toggle("hidden", !overBudget);

  // running balance per row
  let running = budget;
  ledgerRows.innerHTML = "";

  if (entries.length === 0) {
    emptyState.classList.remove("hidden");
  } else {
    emptyState.classList.add("hidden");
    entries.forEach((entry, i) => {
      running -= entry.amount;
      const row = document.createElement("div");
      row.className = "ledger-row " + (i % 2 === 0 ? "even" : "odd");

      const nameSpan = document.createElement("span");
      nameSpan.className = "row-name";
      nameSpan.textContent = entry.name;

      const amountSpan = document.createElement("span");
      amountSpan.className = "row-amount mono";
      amountSpan.textContent = money(entry.amount);

      const balanceSpan = document.createElement("span");
      balanceSpan.className = "row-balance mono" + (running < 0 ? " negative" : "");
      balanceSpan.textContent = money(running);

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.setAttribute("aria-label", `Delete entry for ${entry.name}`);
      deleteBtn.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
      deleteBtn.addEventListener("click", () => deleteEntry(entry.id));

      row.appendChild(nameSpan);
      row.appendChild(amountSpan);
      row.appendChild(balanceSpan);
      row.appendChild(deleteBtn);
      ledgerRows.appendChild(row);
    });
  }
}

function commitBudget() {
  const val = parseFloat(budgetInput.value);
  budget = isNaN(val) ? 0 : val;
  budgetEdit.classList.add("hidden");
  budgetDisplay.classList.remove("hidden");
  render();
  persist();
}

function addEntry() {
  const nameVal = nameInput.value.trim();
  const amountVal = parseFloat(amountInput.value);
  if (!nameVal || isNaN(amountVal)) return;

  entries.push({ id: Date.now(), name: nameVal, amount: amountVal });
  nameInput.value = "";
  amountInput.value = "";
  render();
  persist();
}

function deleteEntry(id) {
  entries = entries.filter((e) => e.id !== id);
  render();
  persist();
}

// Event listeners
budgetBtn.addEventListener("click", () => {
  budgetInput.value = String(budget);
  budgetDisplay.classList.add("hidden");
  budgetEdit.classList.remove("hidden");
  budgetInput.focus();
});
budgetInput.addEventListener("blur", commitBudget);
budgetInput.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") commitBudget();
});

addBtn.addEventListener("click", addEntry);
nameInput.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") addEntry();
});
amountInput.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") addEntry();
});

loadState();
