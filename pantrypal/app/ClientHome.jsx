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

export default function ClientHome({ user }) {
  const [input, setInput] = useState("");
  const [pantry, setPantry] = useState([]);
  const [pantryLoaded, setPantryLoaded] = useState(false);
  const [dietaryFilter, setDietaryFilter] = useState("none");
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [selectedServings, setSelectedServings] = useState(1);

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
          setPantry(Array.isArray(data.ingredients) ? data.ingredients : []);
        } else {
          setPantry(loadLocalPantry());
        }
      } catch (error) {
        console.error("Failed to load pantry from Firestore:", error);
        if (!cancelled) {
          setPantry(loadLocalPantry());
        }
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
      {
        ingredients: pantry,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ).catch((error) => {
      console.error("Failed to save pantry to Firestore:", error);
    });
  }, [pantry, pantryLoaded, storageKey, userKey]);

  const recipePool = RECIPE_POOL;
  const quickAddIngredients = QUICK_ADD_INGREDIENTS;

  const addIngredient = () => {
    if (!input.trim()) return;

    const item = input.toLowerCase();
    if (pantry.includes(item)) return;

    setPantry([...pantry, item]);
    setInput("");
  };

  const removeIngredient = (item) => {
    setPantry(pantry.filter((i) => i !== item));
  };

  const clearPantry = () => {
    setPantry([]);
  };

  const getMatch = (recipe) => {
    const matches = recipe.ingredients.filter((i) => pantry.includes(i.name)).length;
    return Math.round((matches / recipe.ingredients.length) * 100);
  };

  const formatQuantity = (value) => {
    if (!Number.isFinite(value)) return value;

    if (Math.abs(value - Math.round(value)) < 0.001) {
      return Math.round(value);
    }

    return Number(value.toFixed(2));
  };

  const getScaledIngredient = (ingredient, recipeServings) => {
    const servings = recipeServings || 1;
    const scale = selectedServings / servings;

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
    if (Array.isArray(recipe.steps) && recipe.steps.length > 0) {
      return recipe.steps;
    }

    return [
      `Gather ingredients: ${recipe.ingredients.map((i) => i.name).join(", ")}.`,
      "Prep and chop ingredients into bite-sized pieces.",
      "Cook the main components over medium heat until done.",
      "Season to taste, plate, and serve warm.",
    ];
  };

  const filteredRecipes = recipePool.filter((recipe) => {
    if (dietaryFilter === "none") return true;
    return recipe.dietaryTags.includes(dietaryFilter);
  });

  const sortedRecipes = [...filteredRecipes].sort((a, b) => getMatch(b) - getMatch(a));

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

        {/* INPUT */}
        <div className="flex gap-4 mb-10">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addIngredient()}
            placeholder="Add ingredient (e.g. rice)"
            className="flex-1 p-3 rounded-xl border shadow-sm"
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
            <h3 className="text-xl font-semibold mb-4">Your Pantry</h3>

            {pantry.length === 0 ? (
              <p className="text-gray-400">No ingredients yet — add some!</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {pantry.map((item, index) => (
                  <span
                    key={index}
                    onClick={() => removeIngredient(item)}
                    className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-green-200"
                  >
                    {item} ✕
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* RECIPES */}
          <div className="bg-white rounded-2xl shadow-md p-6 border">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h3 className="text-xl font-semibold">Recommended Recipes</h3>
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
                  (i) => !pantry.includes(i.name),
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
                    <div className="flex justify-between">
                      <h4 className="font-medium">{recipe.name}</h4>
                      <span className="text-green-600 text-sm font-semibold">
                        {match}% match
                      </span>
                    </div>

                    <div className="mt-2 text-sm space-y-1">
                      {recipe.dietaryTags.length > 0 && (
                        <p>
                          Diet: {" "}
                          <span className="text-indigo-600">
                            {recipe.dietaryTags.join(", ")}
                          </span>
                        </p>
                      )}

                      <p>
                        Ingredients: {" "}
                        <span className="text-gray-600">
                          {recipe.ingredients.map((i) => i.name).join(", ")}
                        </span>
                      </p>

                      {missing.length > 0 ? (
                        <p>
                          Missing: {" "}
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
                          setSelectedServings(Number.isNaN(nextValue) ? 1 : Math.max(1, nextValue));
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
                      const hasIngredient = pantry.includes(ingredient.name);
                      const scaled = getScaledIngredient(ingredient, selectedRecipe.servings);

                      return (
                        <li
                          key={ingredient.name}
                          className={`px-3 py-2 rounded-lg border ${
                            hasIngredient
                              ? "bg-green-50 border-green-200 text-green-800"
                              : "bg-red-50 border-red-200 text-red-700"
                          }`}
                        >
                          {hasIngredient ? "✓" : "•"} {scaled.scaledQuantity} {scaled.unit} {scaled.name}
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
