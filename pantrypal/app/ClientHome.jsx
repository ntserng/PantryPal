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

// Returns days until expiry (negative = already expired)
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
  if (days <= 2) return "critical"; // expires today, tomorrow, or day after
  if (days <= 5) return "warning"; // expires within 5 days
  return "ok";
}

const URGENCY_STYLES = {
  expired: {
    badge: "bg-red-100 text-red-700 border-red-200",
    label: (days) => "Expired",
    dot: "bg-red-500",
    ring: "border-red-300",
  },
  critical: {
    badge: "bg-orange-100 text-orange-700 border-orange-200",
    label: (days) => (days === 0 ? "Expires today!" : `${days}d left`),
    dot: "bg-orange-400",
    ring: "border-orange-300",
  },
  warning: {
    badge: "bg-yellow-100 text-yellow-700 border-yellow-200",
    label: (days) => `${days}d left`,
    dot: "bg-yellow-400",
    ring: "border-yellow-200",
  },
  ok: {
    badge: "bg-green-50 text-green-600 border-green-100",
    label: (days) => `${days}d left`,
    dot: "bg-green-400",
    ring: "border-green-100",
  },
  none: {
    badge: "",
    label: () => "",
    dot: "bg-gray-300",
    ring: "",
  },
};

export default function ClientHome({ user }) {
  const [input, setInput] = useState("");
  const [expiryInput, setExpiryInput] = useState("");
  const [pantry, setPantry] = useState([]);
  const [pantryLoaded, setPantryLoaded] = useState(false);
  const [dietaryFilter, setDietaryFilter] = useState("none");
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [selectedServings, setSelectedServings] = useState(1);
  const [urgencyFilter, setUrgencyFilter] = useState("all"); // "all" | "expiring"
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  const userKey = useMemo(() => {
    return user?.uid || user?.email || "guest";
  }, [user]);

  const storageKey = useMemo(() => {
    return `pantry-${userKey}`;
  }, [userKey]);

  useEffect(() => {
    let cancelled = false;

    const loadPantry = async () => {
      if (!userKey) return;
      setPantryLoaded(false);

      const loadLocalPantry = () => {
        const saved = localStorage.getItem(storageKey);
        if (!saved) return [];
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      };

      if (!hasFirebaseConfig() || !db || userKey === "guest") {
        if (!cancelled) {
          setPantry(loadLocalPantry());
          setPantryLoaded(true);
        }
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, "pantries", userKey));
        if (cancelled) return;
        if (snapshot.exists()) {
          const data = snapshot.data();
          // Support both old string[] format and new {name, expiry}[] format
          const raw = Array.isArray(data.ingredients) ? data.ingredients : [];
          setPantry(
            raw.map((i) =>
              typeof i === "string" ? { name: i, expiry: null } : i,
            ),
          );
        } else {
          setPantry(loadLocalPantry());
        }
      } catch (error) {
        console.error("Failed to load pantry from Firestore:", error);
        if (!cancelled) setPantry(loadLocalPantry());
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
    ).catch((error) =>
      console.error("Failed to save pantry to Firestore:", error),
    );
  }, [pantry, pantryLoaded, storageKey, userKey]);

  const recipePool = RECIPE_POOL;
  const quickAddIngredients = QUICK_ADD_INGREDIENTS;

  const addIngredient = () => {
    if (!input.trim()) return;
    const name = input.toLowerCase().trim();
    if (pantry.some((i) => i.name === name)) return;
    setPantry([...pantry, { name, expiry: expiryInput || null }]);
    setInput("");
    setExpiryInput("");
  };

  const removeIngredient = (name) => {
    setPantry(pantry.filter((i) => i.name !== name));
  };

  const clearPantry = () => setPantry([]);

  // Pantry names for recipe matching
  const pantryNames = useMemo(() => pantry.map((i) => i.name), [pantry]);

  const getMatch = (recipe) => {
    const matches = recipe.ingredients.filter((i) =>
      pantryNames.includes(i.name),
    ).length;
    return Math.round((matches / recipe.ingredients.length) * 100);
  };

  const formatQuantity = (value) => {
    if (!Number.isFinite(value)) return value;
    if (Math.abs(value - Math.round(value)) < 0.001) return Math.round(value);
    return Number(value.toFixed(2));
  };

  const getScaledIngredient = (ingredient, recipeServings) => {
    const scale = selectedServings / (recipeServings || 1);
    return {
      ...ingredient,
      scaledQuantity: formatQuantity(ingredient.quantity * scale),
    };
  };

  const getRecipeImageUrl = (recipe) => {
    const query = encodeURIComponent(`${recipe.name} food`);
    return `https://source.unsplash.com/900x600/?${query}`;
  };

  const getRecipeSteps = (recipe) => {
    if (Array.isArray(recipe.steps) && recipe.steps.length > 0)
      return recipe.steps;
    return [
      `Gather ingredients: ${recipe.ingredients.map((i) => i.name).join(", ")}.`,
      "Prep and chop ingredients into bite-sized pieces.",
      "Cook the main components over medium heat until done.",
      "Season to taste, plate, and serve warm.",
    ];
  };

  // Items expiring within 5 days or already expired, not dismissed
  const urgentItems = useMemo(() => {
    return pantry.filter((item) => {
      const urgency = getUrgency(item.expiry);
      return (
        (urgency === "expired" ||
          urgency === "critical" ||
          urgency === "warning") &&
        !dismissedAlerts.includes(item.name)
      );
    });
  }, [pantry, dismissedAlerts]);

  const filteredPantry = useMemo(() => {
    if (urgencyFilter === "expiring") {
      return pantry.filter((i) => {
        const u = getUrgency(i.expiry);
        return u === "expired" || u === "critical" || u === "warning";
      });
    }
    return pantry;
  }, [pantry, urgencyFilter]);

  const filteredRecipes = recipePool.filter((recipe) => {
    if (dietaryFilter === "none") return true;
    return recipe.dietaryTags.includes(dietaryFilter);
  });

  // If urgency filter active, boost recipes that use expiring items
  const sortedRecipes = useMemo(() => {
    return [...filteredRecipes].sort((a, b) => {
      if (urgencyFilter === "expiring") {
        const expiringNames = urgentItems.map((i) => i.name);
        const aUses = a.ingredients.filter((i) =>
          expiringNames.includes(i.name),
        ).length;
        const bUses = b.ingredients.filter((i) =>
          expiringNames.includes(i.name),
        ).length;
        if (bUses !== aUses) return bUses - aUses;
      }
      return getMatch(b) - getMatch(a);
    });
  }, [filteredRecipes, urgencyFilter, urgentItems, pantryNames]);

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-200 min-h-screen p-8 text-gray-900">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-bold">🍳 PantryPal</h1>
          <button
            onClick={() => firebaseSignOut(auth)}
            className="text-sm text-gray-500 hover:underline"
          >
            Logout
          </button>
        </div>

        {/* HERO */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold">
            Cook smarter with what you have
          </h2>
          <p className="text-gray-500 mt-2">
            Add ingredients and get recipe matches instantly
          </p>
        </div>

        {/* URGENCY ALERT BANNER */}
        {urgentItems.length > 0 && (
          <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-orange-700 text-sm mb-2">
                  ⚠️ {urgentItems.length} ingredient
                  {urgentItems.length > 1 ? "s" : ""} need
                  {urgentItems.length === 1 ? "s" : ""} attention
                </p>
                <div className="flex flex-wrap gap-2">
                  {urgentItems.map((item) => {
                    const urgency = getUrgency(item.expiry);
                    const days = daysUntilExpiry(item.expiry);
                    const style = URGENCY_STYLES[urgency];
                    return (
                      <span
                        key={item.name}
                        className={`text-xs px-2 py-1 rounded-full border font-medium ${style.badge}`}
                      >
                        {item.name} — {style.label(days)}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() =>
                    setUrgencyFilter(
                      urgencyFilter === "expiring" ? "all" : "expiring",
                    )
                  }
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                    urgencyFilter === "expiring"
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-white text-orange-600 border-orange-300 hover:bg-orange-50"
                  }`}
                >
                  {urgencyFilter === "expiring"
                    ? "Show all"
                    : "Prioritize these"}
                </button>
                <button
                  onClick={() =>
                    setDismissedAlerts(urgentItems.map((i) => i.name))
                  }
                  className="text-xs px-3 py-1.5 rounded-lg border bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* INPUT */}
        <div className="flex gap-3 mb-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addIngredient()}
            placeholder="Add ingredient (e.g. rice)"
            className="flex-1 p-3 rounded-xl border shadow-sm"
          />
          <input
            type="date"
            value={expiryInput}
            onChange={(e) => setExpiryInput(e.target.value)}
            title="Expiry date (optional)"
            className="p-3 rounded-xl border shadow-sm text-sm text-gray-500 w-40"
          />
          <button
            onClick={addIngredient}
            className="bg-green-500 text-white px-6 rounded-xl shadow hover:bg-green-600 transition"
          >
            Add
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {quickAddIngredients.map((item) => (
            <button
              key={item}
              onClick={() => setInput(item)}
              className="text-xs px-3 py-1 rounded-full border bg-white hover:bg-gray-50"
            >
              {item}
            </button>
          ))}
        </div>

        {/* GRID */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* PANTRY */}
          <div className="bg-white rounded-2xl shadow-md p-6 border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Your Pantry</h3>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setUrgencyFilter(
                      urgencyFilter === "expiring" ? "all" : "expiring",
                    )
                  }
                  className={`text-xs px-3 py-1 rounded-full border transition ${
                    urgencyFilter === "expiring"
                      ? "bg-orange-100 text-orange-600 border-orange-200"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {urgencyFilter === "expiring" ? "All items" : "Expiring soon"}
                </button>
                {pantry.length > 0 && (
                  <button
                    onClick={clearPantry}
                    className="text-xs px-3 py-1 rounded-full border bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {filteredPantry.length === 0 ? (
              <p className="text-gray-400">
                {urgencyFilter === "expiring"
                  ? "No expiring items 🎉"
                  : "No ingredients yet — add some!"}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredPantry.map((item, index) => {
                  const urgency = getUrgency(item.expiry);
                  const days = daysUntilExpiry(item.expiry);
                  const style = URGENCY_STYLES[urgency];

                  return (
                    <div
                      key={index}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl border ${
                        urgency !== "none" ? style.ring : "border-gray-100"
                      } bg-white hover:bg-gray-50 group transition`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`}
                        />
                        <span className="text-sm text-gray-800 truncate">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {urgency !== "none" && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${style.badge}`}
                          >
                            {style.label(days)}
                          </span>
                        )}
                        {item.expiry && urgency === "none" && (
                          <span className="text-xs text-gray-400">
                            {style.label(days)}
                          </span>
                        )}
                        <button
                          onClick={() => removeIngredient(item.name)}
                          className="text-gray-300 hover:text-red-400 text-sm opacity-0 group-hover:opacity-100 transition"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RECIPES */}
          <div className="bg-white rounded-2xl shadow-md p-6 border">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h3 className="text-xl font-semibold">
                Recommended Recipes
                {urgencyFilter === "expiring" && (
                  <span className="ml-2 text-xs font-normal text-orange-500">
                    · sorted by expiring items
                  </span>
                )}
              </h3>
              <select
                value={dietaryFilter}
                onChange={(e) => setDietaryFilter(e.target.value)}
                className="text-sm border rounded-lg px-2 py-1"
              >
                <option value="none">All diets</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="gluten-free">Gluten-free</option>
                <option value="dairy-free">Dairy-free</option>
              </select>
            </div>

            <div className="recipes-scroll max-h-96 overflow-y-scroll space-y-4 pr-2 md:max-h-[32rem]">
              {sortedRecipes.map((recipe, index) => {
                const match = getMatch(recipe);
                const missing = recipe.ingredients.filter(
                  (i) => !pantryNames.includes(i.name),
                );
                const usesExpiringItems = urgentItems.filter((u) =>
                  recipe.ingredients.some((i) => i.name === u.name),
                );

                return (
                  <div
                    key={index}
                    className="p-4 rounded-xl border hover:shadow-lg transition cursor-pointer"
                    onClick={() => {
                      setSelectedRecipe(recipe);
                      setSelectedServings(recipe.servings || 1);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">{recipe.name}</h4>
                      <span className="text-green-600 text-sm font-semibold shrink-0 ml-2">
                        {match}% match
                      </span>
                    </div>

                    {usesExpiringItems.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {usesExpiringItems.map((u) => {
                          const urgency = getUrgency(u.expiry);
                          const style = URGENCY_STYLES[urgency];
                          return (
                            <span
                              key={u.name}
                              className={`text-xs px-2 py-0.5 rounded-full border ${style.badge}`}
                            >
                              Uses {u.name} (
                              {style.label(daysUntilExpiry(u.expiry))})
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-2 text-sm space-y-1">
                      {recipe.dietaryTags.length > 0 && (
                        <p>
                          Diet:{" "}
                          <span className="text-indigo-600">
                            {recipe.dietaryTags.join(", ")}
                          </span>
                        </p>
                      )}
                      <p>
                        Ingredients:{" "}
                        <span className="text-gray-600">
                          {recipe.ingredients.map((i) => i.name).join(", ")}
                        </span>
                      </p>
                      {missing.length > 0 ? (
                        <p>
                          Missing:{" "}
                          <span className="text-red-400">
                            {missing.map((i) => i.name).join(", ")}
                          </span>
                        </p>
                      ) : (
                        <p className="text-green-500 font-medium">
                          Ready to cook 🎉
                        </p>
                      )}
                      <p className="text-xs text-gray-400 pt-1">
                        Click to view full recipe
                      </p>
                    </div>
                  </div>
                );
              })}

              {sortedRecipes.length === 0 && (
                <div className="p-4 rounded-xl border bg-gray-50 text-sm text-gray-500">
                  No recipes match that dietary filter yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RECIPE MODAL */}
      {selectedRecipe && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedRecipe(null)}
        >
          <div
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getRecipeImageUrl(selectedRecipe)}
              alt={selectedRecipe.name}
              className="w-full h-56 object-cover"
            />
            <div className="p-6 overflow-y-auto">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold">{selectedRecipe.name}</h3>
                  {selectedRecipe.dietaryTags.length > 0 && (
                    <p className="text-sm text-indigo-600 mt-1">
                      {selectedRecipe.dietaryTags.join(" • ")}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedRecipe(null)}
                  className="text-sm px-3 py-1 rounded-lg border hover:bg-gray-50"
                >
                  Close
                </button>
              </div>

              <div className="mt-6 grid md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h4 className="font-semibold">Ingredients</h4>
                    <label className="text-xs text-gray-500 flex items-center gap-2">
                      Servings
                      <input
                        type="number"
                        min={1}
                        value={selectedServings}
                        onChange={(e) => {
                          const nextValue = Number(e.target.value);
                          setSelectedServings(
                            Number.isNaN(nextValue)
                              ? 1
                              : Math.max(1, nextValue),
                          );
                        }}
                        className="w-16 px-2 py-1 border rounded-md text-sm"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Base recipe: {selectedRecipe.servings} serving(s)
                  </p>
                  <ul className="space-y-2 text-sm text-gray-700">
                    {selectedRecipe.ingredients.map((ingredient) => {
                      const hasIngredient = pantryNames.includes(
                        ingredient.name,
                      );
                      const scaled = getScaledIngredient(
                        ingredient,
                        selectedRecipe.servings,
                      );
                      const pantryItem = pantry.find(
                        (p) => p.name === ingredient.name,
                      );
                      const urgency = pantryItem
                        ? getUrgency(pantryItem.expiry)
                        : "none";
                      const days = pantryItem
                        ? daysUntilExpiry(pantryItem.expiry)
                        : null;
                      const style = URGENCY_STYLES[urgency];

                      return (
                        <li
                          key={ingredient.name}
                          className={`px-3 py-2 rounded-lg border ${
                            hasIngredient
                              ? "bg-green-50 border-green-200 text-green-800"
                              : "bg-red-50 border-red-200 text-red-700"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span>
                              {hasIngredient ? "✓" : "•"}{" "}
                              {scaled.scaledQuantity} {scaled.unit}{" "}
                              {scaled.name}
                            </span>
                            {hasIngredient && urgency !== "none" && (
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded-full border shrink-0 ${style.badge}`}
                              >
                                {style.label(days)}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Steps</h4>
                  <ol className="space-y-3 text-sm text-gray-700 list-decimal list-inside">
                    {getRecipeSteps(selectedRecipe).map((step, index) => (
                      <li key={index} className="leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
