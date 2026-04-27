"use client";

import { signOut as firebaseSignOut } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import {
  auth,
  db,
  doc,
  getDoc,
  hasFirebaseConfig,
  serverTimestamp,
  setDoc,
} from "../lib/firebase";
import { QUICK_ADD_INGREDIENTS, RECIPE_POOL } from "../lib/recipes";
import BarcodeScanner from "./components/BarcodeScanner";

// ─── Expiry helpers ───────────────────────────────────────────────────────────

function daysUntilExpiry(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry - today) / (1000 * 60 * 60 * 24));
}

function getUrgency(expiryDate) {
  const days = daysUntilExpiry(expiryDate);
  if (days === null) return "none";
  if (days < 0) return "expired";
  if (days <= 2) return "critical";
  if (days <= 5) return "warning";
  return "ok";
}

const URGENCY = {
  expired: {
    pill: "bg-red-100 text-red-700 border-red-200",
    dot: "#ef4444",
    label: () => "Expired",
  },
  critical: {
    pill: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "#f59e0b",
    label: (d) => (d === 0 ? "Today!" : `${d}d left`),
  },
  warning: {
    pill: "bg-yellow-50 text-yellow-700 border-yellow-200",
    dot: "#eab308",
    label: (d) => `${d}d left`,
  },
  ok: {
    pill: "bg-emerald-50 text-emerald-700 border-emerald-100",
    dot: "#10b981",
    label: (d) => `${d}d left`,
  },
  none: { pill: "", dot: "#9ca3af", label: () => "" },
};

// ─── Fonts ────────────────────────────────────────────────────────────────────

const FONT_LINK =
  "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap";

function injectFont() {
  if (typeof document === "undefined") return;
  if (document.querySelector(`link[href="${FONT_LINK}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = FONT_LINK;
  document.head.appendChild(link);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClientHome({ user }) {
  injectFont();

  const [input, setInput] = useState("");
  const [expiryInput, setExpiryInput] = useState("");
  const [pantry, setPantry] = useState([]);
  const [pantryLoaded, setPantryLoaded] = useState(false);
  const [dietaryFilter, setDietaryFilter] = useState("none");
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [selectedServings, setSelectedServings] = useState(1);
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const [addFocus, setAddFocus] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [editingExpiry, setEditingExpiry] = useState("");
  const [shoppingList, setShoppingList] = useState([]);
  const [shoppingFeedback, setShoppingFeedback] = useState(null);

  const userKey = useMemo(() => user?.uid || user?.email || "guest", [user]);
  const storageKey = useMemo(() => `pantry-${userKey}`, [userKey]);
  const shoppingStorageKey = useMemo(() => `shopping-${userKey}`, [userKey]);

  useEffect(() => {
    let cancelled = false;
    const loadPantry = async () => {
      if (!userKey) return;
      setPantryLoaded(false);
      const loadLocal = () => {
        try {
          return JSON.parse(localStorage.getItem(storageKey) || "[]");
        } catch {
          return [];
        }
      };
      if (!hasFirebaseConfig() || !db || userKey === "guest") {
        if (!cancelled) {
          setPantry(loadLocal());
          setPantryLoaded(true);
        }
        return;
      }
      try {
        const snap = await getDoc(doc(db, "pantries", userKey));
        if (cancelled) return;
        if (snap.exists()) {
          const raw = Array.isArray(snap.data().ingredients)
            ? snap.data().ingredients
            : [];
          setPantry(
            raw.map((i) =>
              typeof i === "string" ? { name: i, expiry: null } : i,
            ),
          );
        } else {
          setPantry(loadLocal());
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setPantry(loadLocal());
      } finally {
        if (!cancelled) setPantryLoaded(true);
      }
    };
    loadPantry();
    return () => {
      cancelled = true;
    };
  }, [storageKey, userKey]);

  useEffect(() => {
    if (!pantryLoaded) return;
    localStorage.setItem(storageKey, JSON.stringify(pantry));
    if (!hasFirebaseConfig() || !db || userKey === "guest") return;
    setDoc(
      doc(db, "pantries", userKey),
      { ingredients: pantry, updatedAt: serverTimestamp() },
      { merge: true },
    ).catch(console.error);
  }, [pantry, pantryLoaded, storageKey, userKey]);

  useEffect(() => {
    if (!userKey) return;
    try {
      const saved = JSON.parse(localStorage.getItem(shoppingStorageKey) || "[]");
      setShoppingList(Array.isArray(saved) ? saved : []);
    } catch {
      setShoppingList([]);
    }
  }, [shoppingStorageKey, userKey]);

  useEffect(() => {
    if (!userKey) return;
    localStorage.setItem(shoppingStorageKey, JSON.stringify(shoppingList));
  }, [shoppingList, shoppingStorageKey, userKey]);

  useEffect(() => {
    setShoppingFeedback(null);
  }, [selectedRecipe?.name]);

  const addIngredient = () => {
    if (!input.trim()) return;
    const name = input.toLowerCase().trim();
    if (pantry.some((i) => i.name === name)) return;
    setPantry([...pantry, { name, expiry: expiryInput || null }]);
    setInput("");
    setExpiryInput("");
  };

  const startEditItem = (item) => {
    setEditingItem(item.name);
    setEditingName(item.name);
    setEditingExpiry(item.expiry || "");
  };

  const saveEditedItem = () => {
    const name = editingName.toLowerCase().trim();
    if (!name) return;
    if (pantry.some((i) => i.name === name && i.name !== editingItem)) return;

    setPantry(
      pantry.map((i) =>
        i.name === editingItem
          ? { name, expiry: editingExpiry || null }
          : i,
      ),
    );
    setEditingItem(null);
    setEditingName("");
    setEditingExpiry("");
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditingName("");
    setEditingExpiry("");
  };

  const getMissingIngredients = (recipe) =>
    recipe.ingredients.filter((ing) => !pantryNames.includes(ing.name));

  const addMissingToShoppingList = (recipe) => {
    const missing = getMissingIngredients(recipe).map((ing) =>
      getScaledIngredient(ing, recipe.servings),
    );
    if (missing.length === 0) {
      return {
        type: "info",
        message: "You already have everything for this recipe.",
      };
    }
    const existingNames = new Set(shoppingList.map((item) => item.name));
    const next = missing.filter((item) => !existingNames.has(item.name));
    if (next.length === 0) {
      return {
        type: "info",
        message: "All missing items are already in your shopping list.",
      };
    }
    setShoppingList([...shoppingList, ...next]);
    return {
      type: "success",
      message: `Added ${next.length} missing item${next.length > 1 ? "s" : ""}.`,
    };
  };

  const removeShoppingItem = (name) =>
    setShoppingList(shoppingList.filter((item) => item.name !== name));

  const clearShoppingList = () => setShoppingList([]);

  const handleBarcodeScanned = (ingredient) => {
    const name = ingredient.name.toLowerCase().trim();
    if (pantry.some((i) => i.name === name)) return;

    // Calculate expiry date from days offset
    const today = new Date();
    const expiryDate = new Date(
      today.getTime() + ingredient.expiry * 24 * 60 * 60 * 1000,
    );
    const expiryStr = expiryDate.toISOString().split("T")[0];

    setPantry([...pantry, { name, expiry: expiryStr }]);
  };

  const removeIngredient = (name) =>
    setPantry(pantry.filter((i) => i.name !== name));
  const clearPantry = () => setPantry([]);

  const pantryNames = useMemo(() => pantry.map((i) => i.name), [pantry]);

  const getMatch = (recipe) => {
    const matches = recipe.ingredients.filter((i) =>
      pantryNames.includes(i.name),
    ).length;
    return Math.round((matches / recipe.ingredients.length) * 100);
  };

  const formatQuantity = (v) => {
    if (!Number.isFinite(v)) return v;
    return Math.abs(v - Math.round(v)) < 0.001
      ? Math.round(v)
      : Number(v.toFixed(2));
  };

  const getScaledIngredient = (ing, servings) => ({
    ...ing,
    scaledQuantity: formatQuantity(
      ing.quantity * (selectedServings / (servings || 1)),
    ),
  });

  const getRecipeSteps = (recipe) =>
    Array.isArray(recipe.steps) && recipe.steps.length > 0
      ? recipe.steps
      : [
        `Gather ingredients: ${recipe.ingredients.map((i) => i.name).join(", ")}.`,
        "Prep and chop ingredients into bite-sized pieces.",
        "Cook the main components over medium heat until done.",
        "Season to taste, plate, and serve warm.",
      ];

  const urgentItems = useMemo(
    () =>
      pantry.filter(
        (i) =>
          ["expired", "critical", "warning"].includes(getUrgency(i.expiry)) &&
          !dismissedAlerts.includes(i.name),
      ),
    [pantry, dismissedAlerts],
  );

  const filteredPantry = useMemo(
    () =>
      urgencyFilter === "expiring"
        ? pantry.filter((i) =>
          ["expired", "critical", "warning"].includes(getUrgency(i.expiry)),
        )
        : pantry,
    [pantry, urgencyFilter],
  );

  const sortedRecipes = useMemo(() => {
    const filtered = RECIPE_POOL.filter(
      (r) => dietaryFilter === "none" || r.dietaryTags.includes(dietaryFilter),
    );
    return [...filtered].sort((a, b) => {
      if (urgencyFilter === "expiring") {
        const expNames = urgentItems.map((i) => i.name);
        const diff =
          b.ingredients.filter((i) => expNames.includes(i.name)).length -
          a.ingredients.filter((i) => expNames.includes(i.name)).length;
        if (diff !== 0) return diff;
      }
      return getMatch(b) - getMatch(a);
    });
  }, [dietaryFilter, urgencyFilter, urgentItems, pantryNames]);

  // ─── Inline styles ─────────────────────────────────────────────────────────

  const S = {
    page: {
      minHeight: "100vh",
      background: "#faf8f3",
      backgroundImage:
        "radial-gradient(ellipse at 15% 60%, rgba(134,164,118,0.1) 0%, transparent 55%), radial-gradient(ellipse at 85% 15%, rgba(212,165,96,0.09) 0%, transparent 50%)",
      fontFamily: "'DM Sans', sans-serif",
      color: "#1c1c1c",
    },
    topBar: {
      borderBottom: "1px solid rgba(0,0,0,0.06)",
      background: "rgba(250,248,243,0.92)",
      backdropFilter: "blur(14px)",
      padding: "0 2rem",
      height: "54px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      zIndex: 40,
    },
    wordmark: {
      fontFamily: "'DM Serif Display', serif",
      fontSize: "1.2rem",
      color: "#2d5a27",
      letterSpacing: "-0.02em",
    },
    logoutBtn: {
      fontSize: "0.72rem",
      color: "#9ca3af",
      background: "none",
      border: "1px solid #e9e6df",
      borderRadius: "6px",
      padding: "4px 12px",
      cursor: "pointer",
      fontFamily: "'DM Sans', sans-serif",
    },
    hero: {
      padding: "3.5rem 2rem 1.5rem",
      maxWidth: "1100px",
      margin: "0 auto",
    },
    heroTitle: {
      fontFamily: "'DM Serif Display', serif",
      fontSize: "clamp(2rem, 4.5vw, 3.2rem)",
      lineHeight: 1.1,
      color: "#1a2e18",
      marginBottom: "0.4rem",
      letterSpacing: "-0.03em",
    },
    heroSub: {
      color: "#9ca3af",
      fontSize: "0.95rem",
      fontWeight: 300,
    },
    main: {
      maxWidth: "1100px",
      margin: "0 auto",
      padding: "1.25rem 2rem 4rem",
    },
    alertBanner: {
      background: "linear-gradient(135deg, #fffdf0 0%, #fef3c7 100%)",
      border: "1px solid #fde68a",
      borderRadius: "14px",
      padding: "1rem 1.25rem",
      marginBottom: "1.25rem",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: "1rem",
    },
    addCard: {
      background: "#fff",
      border: addFocus ? "1.5px solid #2d5a27" : "1.5px solid #ece9e2",
      borderRadius: "14px",
      padding: "1rem 1.25rem",
      marginBottom: "0.75rem",
      boxShadow: addFocus
        ? "0 0 0 3px rgba(45,90,39,0.07)"
        : "0 1px 3px rgba(0,0,0,0.04)",
      transition: "all 0.18s",
      display: "flex",
      gap: "0.75rem",
      alignItems: "center",
    },
    textInput: {
      flex: 1,
      border: "none",
      outline: "none",
      fontSize: "0.9rem",
      fontFamily: "'DM Sans', sans-serif",
      background: "transparent",
      color: "#1c1c1c",
    },
    dateInput: {
      border: "1px solid #e9e6df",
      borderRadius: "8px",
      padding: "5px 9px",
      fontSize: "0.775rem",
      fontFamily: "'DM Sans', sans-serif",
      color: "#6b7280",
      background: "#fafaf8",
      cursor: "pointer",
    },
    addBtn: {
      background: "#2d5a27",
      color: "#fff",
      border: "none",
      borderRadius: "9px",
      padding: "7px 18px",
      fontSize: "0.85rem",
      fontWeight: 500,
      cursor: "pointer",
      fontFamily: "'DM Sans', sans-serif",
      whiteSpace: "nowrap",
      transition: "background 0.15s",
    },
    quickChips: {
      display: "flex",
      flexWrap: "wrap",
      gap: "0.35rem",
      marginBottom: "1.75rem",
    },
    chip: {
      fontSize: "0.72rem",
      padding: "4px 11px",
      borderRadius: "100px",
      border: "1px solid #e9e6df",
      background: "#fff",
      cursor: "pointer",
      color: "#6b7280",
      fontFamily: "'DM Sans', sans-serif",
      transition: "all 0.1s",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "1.25rem",
    },
    card: {
      background: "#fff",
      border: "1px solid #ece9e2",
      borderRadius: "18px",
      overflow: "hidden",
      boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
    },
    cardHeader: {
      padding: "1.25rem 1.25rem 0",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "0.875rem",
    },
    cardTitle: {
      fontFamily: "'DM Serif Display', serif",
      fontSize: "1.15rem",
      color: "#1a2e18",
    },
    cardBody: {
      padding: "0 1.25rem 1.25rem",
    },
    sectionLabel: {
      fontSize: "0.62rem",
      fontWeight: 600,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "#c4bfb3",
      marginBottom: "0.6rem",
    },
    pantryRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0.5rem 0.7rem",
      borderRadius: "9px",
      marginBottom: "0.3rem",
      background: "#fafaf8",
      border: "1px solid #f0ede6",
      transition: "background 0.1s",
    },
    recipeCard: {
      padding: "0.875rem 1rem",
      borderRadius: "11px",
      border: "1px solid #ece9e2",
      marginBottom: "0.6rem",
      cursor: "pointer",
      transition: "all 0.13s",
      background: "#fff",
    },
    filterSelect: {
      fontSize: "0.72rem",
      border: "1px solid #e9e6df",
      borderRadius: "8px",
      padding: "4px 8px",
      background: "#fafaf8",
      fontFamily: "'DM Sans', sans-serif",
      color: "#6b7280",
      cursor: "pointer",
    },
    pillBtn: (active) => ({
      fontSize: "0.68rem",
      fontWeight: 500,
      padding: "3px 10px",
      borderRadius: "100px",
      border: "1px solid",
      cursor: "pointer",
      fontFamily: "'DM Sans', sans-serif",
      transition: "all 0.12s",
      background: active ? "#2d5a27" : "#fff",
      color: active ? "#fff" : "#9ca3af",
      borderColor: active ? "#2d5a27" : "#e9e6df",
    }),
    matchBadge: (pct) => ({
      fontSize: "0.68rem",
      fontWeight: 600,
      padding: "2px 8px",
      borderRadius: "100px",
      background: pct >= 80 ? "#dcfce7" : pct >= 50 ? "#fef9c3" : "#f3f4f6",
      color: pct >= 80 ? "#15803d" : pct >= 50 ? "#a16207" : "#6b7280",
      flexShrink: 0,
    }),
    modalOverlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(12,18,10,0.65)",
      backdropFilter: "blur(6px)",
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem",
    },
    modal: {
      background: "#faf8f3",
      width: "100%",
      maxWidth: "660px",
      borderRadius: "22px",
      overflow: "hidden",
      maxHeight: "90vh",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 28px 70px rgba(0,0,0,0.28)",
    },
    feedbackOverlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(12,18,10,0.55)",
      backdropFilter: "blur(4px)",
      zIndex: 60,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem",
    },
    feedbackCard: {
      width: "100%",
      maxWidth: "360px",
      borderRadius: "16px",
      background: "#fff",
      border: "1px solid #ece9e2",
      boxShadow: "0 18px 45px rgba(0,0,0,0.2)",
      padding: "1rem",
    },
  };

  return (
    <div style={S.page}>
      {/* TOP BAR */}
      <nav style={S.topBar}>
        <span style={S.wordmark}>🌿 PantryPal</span>
        <button style={S.logoutBtn} onClick={() => firebaseSignOut(auth)}>
          Sign out
        </button>
      </nav>

      {/* HERO */}
      <header style={S.hero}>
        <h1 style={S.heroTitle}>
          Cook what
          <br />
          <em>you already have.</em>
        </h1>
        <p style={S.heroSub}>Add your ingredients, discover what to make.</p>
      </header>

      <main style={S.main}>
        {/* URGENCY BANNER */}
        {urgentItems.length > 0 && (
          <div style={S.alertBanner}>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "#92400e",
                  marginBottom: "0.5rem",
                }}
              >
                ⚠️ {urgentItems.length} item{urgentItems.length > 1 ? "s" : ""}{" "}
                expiring soon
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {urgentItems.map((item) => {
                  const u = getUrgency(item.expiry);
                  const d = daysUntilExpiry(item.expiry);
                  return (
                    <span
                      key={item.name}
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${URGENCY[u].pill}`}
                    >
                      {item.name} · {URGENCY[u].label(d)}
                    </span>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
              <button
                style={S.pillBtn(urgencyFilter === "expiring")}
                onClick={() =>
                  setUrgencyFilter(
                    urgencyFilter === "expiring" ? "all" : "expiring",
                  )
                }
              >
                {urgencyFilter === "expiring" ? "Show all" : "Prioritize"}
              </button>
              <button
                style={{ ...S.pillBtn(false), color: "#9ca3af" }}
                onClick={() =>
                  setDismissedAlerts(urgentItems.map((i) => i.name))
                }
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* ADD ROW */}
        <div style={S.addCard}>
          <span style={{ fontSize: "1rem", color: "#c4bfb3" }}>＋</span>
          <input
            style={S.textInput}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addIngredient()}
            onFocus={() => setAddFocus(true)}
            onBlur={() => setAddFocus(false)}
            placeholder="Add an ingredient…"
          />
          <input
            type="date"
            style={S.dateInput}
            value={expiryInput}
            onChange={(e) => setExpiryInput(e.target.value)}
            title="Expiry date (optional)"
          />
          <button
            style={{
              ...S.addBtn,
              fontSize: "0.75rem",
              padding: "7px 12px",
              background: "#7c6b5f",
            }}
            onClick={() => setShowScanner(true)}
            title="Scan barcode"
            onMouseEnter={(e) => (e.target.style.background = "#6b5c51")}
            onMouseLeave={(e) => (e.target.style.background = "#7c6b5f")}
          >
            📷
          </button>
          <button
            style={S.addBtn}
            onClick={addIngredient}
            onMouseEnter={(e) => (e.target.style.background = "#234a1e")}
            onMouseLeave={(e) => (e.target.style.background = "#2d5a27")}
          >
            Add
          </button>
        </div>

        {/* QUICK CHIPS */}
        <div style={S.quickChips}>
          {QUICK_ADD_INGREDIENTS.map((item) => (
            <button
              key={item}
              style={S.chip}
              onClick={() => setInput(item)}
              onMouseEnter={(e) => {
                e.target.style.background = "#f0f4ef";
                e.target.style.borderColor = "#2d5a27";
                e.target.style.color = "#2d5a27";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "#fff";
                e.target.style.borderColor = "#e9e6df";
                e.target.style.color = "#6b7280";
              }}
            >
              {item}
            </button>
          ))}
        </div>

        {/* TWO-COLUMN GRID */}
        <div style={S.grid}>
          {/* PANTRY */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <h2 style={S.cardTitle}>Pantry</h2>
              <div style={{ display: "flex", gap: "0.35rem" }}>
                <button
                  style={S.pillBtn(urgencyFilter === "expiring")}
                  onClick={() =>
                    setUrgencyFilter(
                      urgencyFilter === "expiring" ? "all" : "expiring",
                    )
                  }
                >
                  Expiring
                </button>
                {pantry.length > 0 && (
                  <button style={S.pillBtn(false)} onClick={clearPantry}>
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div style={S.cardBody}>
              {filteredPantry.length === 0 ? (
                <p style={{ color: "#c4bfb3", fontSize: "0.85rem" }}>
                  {urgencyFilter === "expiring"
                    ? "Nothing expiring soon 🎉"
                    : "Your pantry is empty."}
                </p>
              ) : (
                <>
                  <p style={S.sectionLabel}>
                    {filteredPantry.length} ingredient
                    {filteredPantry.length !== 1 ? "s" : ""}
                  </p>
                  {filteredPantry.map((item) => {
                    const u = getUrgency(item.expiry);
                    const d = daysUntilExpiry(item.expiry);
                    const editing = editingItem === item.name;
                    return (
                      <div
                        key={item.name}
                        style={S.pantryRow}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#f5f2ec")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "#fafaf8")
                        }
                      >
                        {editing ? (
                          <div style={{ flex: 1, display: "flex", gap: "0.55rem", alignItems: "center" }}>
                            <input
                              style={{
                                flex: 1,
                                border: "1px solid #e9e6df",
                                borderRadius: "8px",
                                padding: "5px 9px",
                                fontSize: "0.85rem",
                                fontFamily: "'DM Sans', sans-serif",
                                color: "#1c1c1c",
                                background: "#fff",
                              }}
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                            />
                            <input
                              type="date"
                              style={S.dateInput}
                              value={editingExpiry}
                              onChange={(e) => setEditingExpiry(e.target.value)}
                            />
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.55rem",
                              minWidth: 0,
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: URGENCY[u].dot,
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                fontSize: "0.85rem",
                                color: "#374151",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {item.name}
                            </span>
                          </div>
                        )}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            flexShrink: 0,
                            marginLeft: "0.5rem",
                          }}
                        >
                          {!editing && u !== "none" && (
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${URGENCY[u].pill}`}
                            >
                              {URGENCY[u].label(d)}
                            </span>
                          )}
                          {!editing && u === "none" && item.expiry && (
                            <span
                              style={{ fontSize: "0.68rem", color: "#c4bfb3" }}
                            >
                              {d}d
                            </span>
                          )}
                          {editing ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveEditedItem();
                                }}
                                style={{
                                  fontSize: "0.65rem",
                                  color: "#1f2937",
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: "2px 4px",
                                  lineHeight: 1,
                                }}
                                onMouseEnter={(e) =>
                                  (e.target.style.color = "#16a34a")
                                }
                                onMouseLeave={(e) =>
                                  (e.target.style.color = "#1f2937")
                                }
                              >
                                Save
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelEdit();
                                }}
                                style={{
                                  fontSize: "0.65rem",
                                  color: "#9ca3af",
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: "2px 4px",
                                  lineHeight: 1,
                                }}
                                onMouseEnter={(e) =>
                                  (e.target.style.color = "#6b7280")
                                }
                                onMouseLeave={(e) =>
                                  (e.target.style.color = "#9ca3af")
                                }
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditItem(item);
                                }}
                                style={{
                                  fontSize: "0.65rem",
                                  color: "#6b7280",
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: "2px 4px",
                                  lineHeight: 1,
                                }}
                                onMouseEnter={(e) =>
                                  (e.target.style.color = "#374151")
                                }
                                onMouseLeave={(e) =>
                                  (e.target.style.color = "#6b7280")
                                }
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeIngredient(item.name);
                                }}
                                style={{
                                  fontSize: "0.65rem",
                                  color: "#d1d5db",
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: "2px",
                                  lineHeight: 1,
                                }}
                                onMouseEnter={(e) =>
                                  (e.target.style.color = "#ef4444")
                                }
                                onMouseLeave={(e) =>
                                  (e.target.style.color = "#d1d5db")
                                }
                              >
                                ✕
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* RECIPES */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <h2 style={S.cardTitle}>
                Recipes
                {urgencyFilter === "expiring" && (
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontFamily: "'DM Sans', sans-serif",
                      color: "#d97706",
                      marginLeft: "0.4rem",
                      fontWeight: 400,
                    }}
                  >
                    · using expiring first
                  </span>
                )}
              </h2>
              <select
                style={S.filterSelect}
                value={dietaryFilter}
                onChange={(e) => setDietaryFilter(e.target.value)}
              >
                <option value="none">All diets</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="gluten-free">Gluten-free</option>
                <option value="dairy-free">Dairy-free</option>
              </select>
            </div>

            <div
              style={{ ...S.cardBody, overflowY: "auto", maxHeight: "460px" }}
              className="recipes-scroll"
            >
              {sortedRecipes.length === 0 ? (
                <p style={{ color: "#c4bfb3", fontSize: "0.85rem" }}>
                  No recipes match that filter.
                </p>
              ) : (
                sortedRecipes.map((recipe, i) => {
                  const match = getMatch(recipe);
                  const missing = recipe.ingredients.filter(
                    (ing) => !pantryNames.includes(ing.name),
                  );
                  const usesExpiring = urgentItems.filter((u) =>
                    recipe.ingredients.some((ing) => ing.name === u.name),
                  );
                  return (
                    <div
                      key={i}
                      style={S.recipeCard}
                      onClick={() => {
                        setSelectedRecipe(recipe);
                        setSelectedServings(recipe.servings || 1);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 3px 16px rgba(0,0,0,0.07)";
                        e.currentTarget.style.borderColor = "#d4d0c8";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.borderColor = "#ece9e2";
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "0.3rem",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 500,
                            fontSize: "0.875rem",
                            color: "#1a2e18",
                          }}
                        >
                          {recipe.name}
                        </span>
                        <span style={S.matchBadge(match)}>{match}%</span>
                      </div>

                      {usesExpiring.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.2rem",
                            marginBottom: "0.3rem",
                          }}
                        >
                          {usesExpiring.map((u) => (
                            <span
                              key={u.name}
                              className={`text-xs px-1.5 py-0.5 rounded-full border ${URGENCY[getUrgency(u.expiry)].pill}`}
                            >
                              uses {u.name}
                            </span>
                          ))}
                        </div>
                      )}

                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#9ca3af",
                          lineHeight: 1.5,
                        }}
                      >
                        {recipe.dietaryTags.length > 0 && (
                          <span
                            style={{ color: "#818cf8", marginRight: "0.4rem" }}
                          >
                            {recipe.dietaryTags.join(" · ")}
                          </span>
                        )}
                        {missing.length === 0 ? (
                          <span style={{ color: "#16a34a", fontWeight: 500 }}>
                            Ready to cook 🎉
                          </span>
                        ) : (
                          <span>
                            Missing:{" "}
                            <span style={{ color: "#f87171" }}>
                              {missing.map((i) => i.name).join(", ")}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* SHOPPING LIST */}
        <div style={{ ...S.card, marginTop: "1.25rem" }}>
          <div style={S.cardHeader}>
            <h2 style={S.cardTitle}>Shopping list</h2>
            <button
              style={S.pillBtn(false)}
              onClick={clearShoppingList}
              disabled={shoppingList.length === 0}
            >
              Clear
            </button>
          </div>
          <div style={S.cardBody}>
            {shoppingList.length === 0 ? (
              <p style={{ color: "#c4bfb3", fontSize: "0.85rem" }}>
                Generate a shopping list from a recipe to see missing items here.
              </p>
            ) : (
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.55rem",
                }}
              >
                {shoppingList.map((item) => (
                  <li
                    key={item.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                      padding: "0.75rem 0.9rem",
                      borderRadius: "12px",
                      background: "#f8fafc",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <span style={{ color: "#374151", fontSize: "0.9rem" }}>
                      {item.name} — {item.scaledQuantity} {item.unit}
                    </span>
                    <button
                      onClick={() => removeShoppingItem(item.name)}
                      style={{
                        fontSize: "0.75rem",
                        color: "#ef4444",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "0",
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>

      {/* MODAL */}
      {selectedRecipe && (
        <div style={S.modalOverlay} onClick={() => setSelectedRecipe(null)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            {/* Modal image header */}
            <div
              style={{
                position: "relative",
                height: "190px",
                flexShrink: 0,
                overflow: "hidden",
              }}
            >
              <img
                src={
                  selectedRecipe.image ||
                  `https://source.unsplash.com/900x600/?${encodeURIComponent(
                    selectedRecipe.name + " food",
                  )}`
                }
                alt={selectedRecipe.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to top, rgba(20,35,18,0.75) 0%, transparent 55%)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: "1rem",
                  left: "1.5rem",
                  right: "4.5rem",
                }}
              >
                <h2
                  style={{
                    fontFamily: "'DM Serif Display', serif",
                    fontSize: "1.5rem",
                    color: "#fff",
                    lineHeight: 1.1,
                    margin: 0,
                  }}
                >
                  {selectedRecipe.name}
                </h2>
                {selectedRecipe.dietaryTags.length > 0 && (
                  <p
                    style={{
                      fontSize: "0.72rem",
                      color: "rgba(255,255,255,0.7)",
                      marginTop: "0.2rem",
                    }}
                  >
                    {selectedRecipe.dietaryTags.join(" · ")}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedRecipe(null)}
                style={{
                  position: "absolute",
                  top: "0.875rem",
                  right: "0.875rem",
                  background: "rgba(255,255,255,0.18)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.28)",
                  color: "#fff",
                  borderRadius: "7px",
                  padding: "3px 11px",
                  fontSize: "0.72rem",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Close
              </button>
            </div>

            {/* Modal body */}
            <div
              style={{
                padding: "1.5rem",
                overflowY: "auto",
                flex: 1,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.75rem",
              }}
            >
              {/* Ingredients */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "0.6rem",
                    gap: "0.75rem",
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontFamily: "'DM Serif Display', serif",
                        fontSize: "1rem",
                        color: "#1a2e18",
                        margin: 0,
                      }}
                    >
                      Ingredients
                    </h3>
                    <p
                      style={{
                        fontSize: "0.72rem",
                        color: "#6b7280",
                        margin: "0.35rem 0 0",
                      }}
                    >
                      Missing items can be added to your shopping list.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const result = addMissingToShoppingList(selectedRecipe);
                      if (result) setShoppingFeedback(result);
                    }}
                    style={{
                      fontSize: "0.75rem",
                      color: "#fff",
                      background: "#2d5a27",
                      border: "none",
                      borderRadius: "10px",
                      padding: "8px 14px",
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#234a1e")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "#2d5a27")
                    }
                  >
                    Add missing items
                  </button>
                </div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    fontSize: "0.72rem",
                    color: "#9ca3af",
                    marginBottom: "0.6rem",
                  }}
                >
                  Servings
                  <input
                    type="number"
                    min={1}
                    value={selectedServings}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setSelectedServings(isNaN(n) ? 1 : Math.max(1, n));
                    }}
                    style={{
                      width: "44px",
                      padding: "2px 5px",
                      border: "1px solid #e9e6df",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      fontFamily: "'DM Sans', sans-serif",
                      background: "#fff",
                    }}
                  />
                </label>
                <p
                  style={{
                    fontSize: "0.68rem",
                    color: "#c4bfb3",
                    marginBottom: "0.6rem",
                  }}
                >
                  Base: {selectedRecipe.servings} serving(s)
                </p>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                  }}
                >
                  {selectedRecipe.ingredients.map((ing) => {
                    const has = pantryNames.includes(ing.name);
                    const scaled = getScaledIngredient(
                      ing,
                      selectedRecipe.servings,
                    );
                    const pantryItem = pantry.find((p) => p.name === ing.name);
                    const u = pantryItem
                      ? getUrgency(pantryItem.expiry)
                      : "none";
                    const d = pantryItem
                      ? daysUntilExpiry(pantryItem.expiry)
                      : null;
                    return (
                      <li
                        key={ing.name}
                        style={{
                          padding: "0.45rem 0.7rem",
                          borderRadius: "8px",
                          fontSize: "0.8rem",
                          background: has ? "#f0fdf4" : "#fff5f5",
                          border: `1px solid ${has ? "#bbf7d0" : "#fecaca"}`,
                          color: has ? "#166534" : "#b91c1c",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "0.4rem",
                        }}
                      >
                        <span>
                          {has ? "✓" : "·"} {scaled.scaledQuantity}{" "}
                          {scaled.unit} {scaled.name}
                        </span>
                        {has && u !== "none" && (
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full border ${URGENCY[u].pill}`}
                            style={{ flexShrink: 0 }}
                          >
                            {URGENCY[u].label(d)}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Steps */}
              <div>
                <h3
                  style={{
                    fontFamily: "'DM Serif Display', serif",
                    fontSize: "1rem",
                    color: "#1a2e18",
                    marginBottom: "0.6rem",
                  }}
                >
                  Method
                </h3>
                <ol
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.7rem",
                  }}
                >
                  {getRecipeSteps(selectedRecipe).map((step, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        gap: "0.6rem",
                        fontSize: "0.8rem",
                        color: "#4b5563",
                        lineHeight: 1.55,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'DM Serif Display', serif",
                          color: "#2d5a27",
                          fontSize: "0.95rem",
                          lineHeight: 1.2,
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}.
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SHOPPING FEEDBACK OVERLAY */}
      {shoppingFeedback && (
        <div style={S.feedbackOverlay} onClick={() => setShoppingFeedback(null)}>
          <div style={S.feedbackCard} onClick={(e) => e.stopPropagation()}>
            <p
              style={{
                margin: 0,
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 600,
                color: shoppingFeedback.type === "success" ? "#166534" : "#6b7280",
              }}
            >
              {shoppingFeedback.type === "success" ? "Added" : "Notice"}
            </p>
            <p
              style={{
                margin: "0.45rem 0 0.9rem",
                fontSize: "0.9rem",
                color: "#1f2937",
                lineHeight: 1.45,
              }}
            >
              {shoppingFeedback.message}
            </p>
            <button
              onClick={() => setShoppingFeedback(null)}
              style={{
                fontSize: "0.78rem",
                color: "#fff",
                background:
                  shoppingFeedback.type === "success" ? "#2d5a27" : "#7c6b5f",
                border: "none",
                borderRadius: "9px",
                padding: "8px 14px",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* BARCODE SCANNER MODAL */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
