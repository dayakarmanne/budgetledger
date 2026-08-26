import React, { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, PenLine } from "lucide-react";

const FONT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');
  .font-display { font-family: 'Fraunces', serif; font-optical-sizing: auto; }
  .font-mono { font-family: 'IBM Plex Mono', monospace; }
  .font-body { font-family: 'Inter', sans-serif; }
`;

const STORAGE_KEY = "ledger-state";

export default function BudgetLedger() {
  const [budget, setBudget] = useState(0);
  const [entries, setEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("0");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  // Load on mount
  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get(STORAGE_KEY, false);
        if (result && result.value) {
          const parsed = JSON.parse(result.value);
          setBudget(parsed.budget || 0);
          setEntries(parsed.entries || []);
          setBudgetDraft(String(parsed.budget || 0));
        }
      } catch (e) {
        // no existing data yet — fine
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persist = useCallback(async (nextBudget, nextEntries) => {
    try {
      const result = await window.storage.set(
        STORAGE_KEY,
        JSON.stringify({ budget: nextBudget, entries: nextEntries }),
        false
      );
      setSaveError(!result);
    } catch (e) {
      setSaveError(true);
    }
  }, []);

  const commitBudget = () => {
    const val = parseFloat(budgetDraft);
    const next = isNaN(val) ? 0 : val;
    setBudget(next);
    setEditingBudget(false);
    persist(next, entries);
  };

  const addEntry = () => {
    const val = parseFloat(amount);
    if (!name.trim() || isNaN(val)) return;
    const entry = { id: Date.now(), name: name.trim(), amount: val };
    const next = [...entries, entry];
    setEntries(next);
    setName("");
    setAmount("");
    persist(budget, next);
  };

  const deleteEntry = (id) => {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    persist(budget, next);
  };

  const totalSpent = entries.reduce((sum, e) => sum + e.amount, 0);
  const remaining = budget - totalSpent;
  const pct = budget > 0 ? Math.min((totalSpent / budget) * 100, 999) : 0;
  const overBudget = remaining < 0;

  // running balance per row
  let running = budget;
  const rows = entries.map((e) => {
    running -= e.amount;
    return { ...e, running };
  });

  const money = (n) =>
    (n < 0 ? "−" : "") +
    "$" +
    Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1B2028]">
        <style>{FONT_STYLES}</style>
        <p className="font-mono text-sm text-[#8A8F9C] tracking-widest">LOADING LEDGER…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1B2028] font-body text-[#E8E6DE] px-4 py-8 sm:px-8">
      <style>{FONT_STYLES}</style>

      <div className="max-w-3xl mx-auto">
        {/* Masthead */}
        <div className="border-b-2 border-[#3A4152] pb-5 mb-6 flex items-end justify-between flex-wrap gap-3">
          <div>
            <p className="font-mono text-[11px] tracking-[0.3em] text-[#C9A227] mb-1">BILLING LEDGER</p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#F3F1EA]">
              Budget &amp; Entries
            </h1>
          </div>

          {/* Budget editor */}
          <div className="text-right">
            <p className="font-mono text-[11px] tracking-[0.2em] text-[#8A8F9C] mb-1">ALLOCATED BUDGET</p>
            {editingBudget ? (
              <div className="flex items-center gap-2">
                <span className="font-mono text-xl text-[#C9A227]">$</span>
                <input
                  autoFocus
                  type="number"
                  value={budgetDraft}
                  onChange={(ev) => setBudgetDraft(ev.target.value)}
                  onBlur={commitBudget}
                  onKeyDown={(ev) => ev.key === "Enter" && commitBudget()}
                  className="font-mono text-xl bg-transparent border-b border-[#C9A227] outline-none w-32 text-right text-[#F3F1EA]"
                />
              </div>
            ) : (
              <button
                onClick={() => {
                  setBudgetDraft(String(budget));
                  setEditingBudget(true);
                }}
                className="font-mono text-2xl text-[#F3F1EA] hover:text-[#C9A227] transition-colors inline-flex items-center gap-2"
              >
                {money(budget)}
                <PenLine size={14} className="text-[#8A8F9C]" />
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Stat label="SPENT" value={money(totalSpent)} tone="neutral" />
          <Stat label="REMAINING" value={money(remaining)} tone={overBudget ? "danger" : "positive"} />
          <Stat label="ENTRIES" value={String(entries.length)} tone="neutral" mono />
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-2 w-full bg-[#232935] rounded-full overflow-hidden border border-[#3A4152]">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${Math.min(pct, 100)}%`,
                backgroundColor: overBudget ? "#C1462F" : "#C9A227",
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="font-mono text-[11px] text-[#8A8F9C]">{pct.toFixed(1)}% of budget used</span>
            {overBudget && (
              <span className="font-mono text-[11px] tracking-wider text-[#C1462F] font-medium">
                OVER BUDGET
              </span>
            )}
          </div>
        </div>

        {/* Add entry */}
        <div className="bg-[#232935] border border-[#3A4152] rounded-md p-4 mb-6">
          <p className="font-mono text-[11px] tracking-[0.2em] text-[#8A8F9C] mb-3">NEW ENTRY</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Person name"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              onKeyDown={(ev) => ev.key === "Enter" && addEntry()}
              className="flex-1 bg-[#1B2028] border border-[#3A4152] rounded px-3 py-2 text-sm outline-none focus:border-[#C9A227] transition-colors placeholder:text-[#5C6270]"
            />
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(ev) => setAmount(ev.target.value)}
              onKeyDown={(ev) => ev.key === "Enter" && addEntry()}
              className="sm:w-36 bg-[#1B2028] border border-[#3A4152] rounded px-3 py-2 text-sm font-mono outline-none focus:border-[#C9A227] transition-colors placeholder:text-[#5C6270]"
            />
            <button
              onClick={addEntry}
              className="flex items-center justify-center gap-1.5 bg-[#C9A227] text-[#1B2028] font-medium text-sm px-4 py-2 rounded hover:bg-[#DCB534] transition-colors"
            >
              <Plus size={16} /> Add
            </button>
          </div>
        </div>

        {/* Ledger table */}
        <div className="border border-[#3A4152] rounded-md overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-2 bg-[#232935] font-mono text-[11px] tracking-wider text-[#8A8F9C]">
            <span>NAME</span>
            <span className="text-right">AMOUNT</span>
            <span className="text-right w-28">BALANCE</span>
            <span className="w-6"></span>
          </div>

          {rows.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="font-body text-sm text-[#5C6270]">No entries yet. Add the first line above.</p>
            </div>
          ) : (
            rows.map((row, i) => (
              <div
                key={row.id}
                className={`grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-2.5 items-center text-sm ${
                  i % 2 === 0 ? "bg-[#1E2430]" : "bg-[#1B2028]"
                } border-t border-[#2A3140]`}
              >
                <span className="text-[#E8E6DE] truncate">{row.name}</span>
                <span className="font-mono text-right text-[#E8E6DE]">{money(row.amount)}</span>
                <span
                  className={`font-mono text-right w-28 ${
                    row.running < 0 ? "text-[#C1462F]" : "text-[#8A8F9C]"
                  }`}
                >
                  {money(row.running)}
                </span>
                <button
                  onClick={() => deleteEntry(row.id)}
                  className="text-[#5C6270] hover:text-[#C1462F] transition-colors w-6 flex justify-end"
                  aria-label={`Delete entry for ${row.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {saveError && (
          <p className="font-mono text-[11px] text-[#C1462F] mt-3">
            Couldn't save changes — they may not persist after reload.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone, mono }) {
  const color =
    tone === "positive" ? "#C9A227" : tone === "danger" ? "#C1462F" : "#F3F1EA";
  return (
    <div className="bg-[#232935] border border-[#3A4152] rounded-md px-3 py-3">
      <p className="font-mono text-[10px] tracking-[0.2em] text-[#8A8F9C] mb-1">{label}</p>
      <p className={`font-mono text-lg sm:text-xl font-medium`} style={{ color }}>
        {value}
      </p>
    </div>
  );
}
