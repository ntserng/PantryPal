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

export default function ClientHome({ user }) {
  const [input, setInput] = useState("");
  const [pantry, setPantry] = useState([]);
  const [pantryLoaded, setPantryLoaded] = useState(false);

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

  const recipes = [
    { name: "Chicken Alfredo", ingredients: ["chicken", "pasta", "cream"] },
    { name: "Omelette", ingredients: ["eggs", "cheese"] },
    { name: "Pasta Primavera", ingredients: ["pasta", "vegetables"] },
    { name: "Caprese Salad", ingredients: ["tomato", "basil", "mozzarella"] },
    { name: "Fried Rice", ingredients: ["rice", "egg", "vegetables"] },
    { name: "Grilled Cheese", ingredients: ["bread", "cheese"] },
    { name: "Tacos", ingredients: ["tortilla", "meat", "cheese"] },
    { name: "Pancakes", ingredients: ["flour", "egg", "milk"] },
    { name: "BLT Sandwich", ingredients: ["bread", "bacon", "lettuce", "tomato"] },
    { name: "Veggie Stir Fry", ingredients: ["vegetables", "soy sauce", "rice"] },
  ];

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
    const matches = recipe.ingredients.filter((i) => pantry.includes(i)).length;
    return Math.round((matches / recipe.ingredients.length) * 100);
  };

  const sortedRecipes = [...recipes].sort((a, b) => getMatch(b) - getMatch(a));

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
            <h3 className="text-xl font-semibold mb-4">Recommended Recipes</h3>

            <div className="recipes-scroll max-h-96 overflow-y-scroll space-y-4 pr-2 md:max-h-[32rem]">
              {sortedRecipes.map((recipe, index) => {
                const match = getMatch(recipe);
                const missing = recipe.ingredients.filter(
                  (i) => !pantry.includes(i),
                );

                return (
                  <div
                    key={index}
                    className="p-4 rounded-xl border hover:shadow-lg transition"
                  >
                    <div className="flex justify-between">
                      <h4 className="font-medium">{recipe.name}</h4>
                      <span className="text-green-600 text-sm font-semibold">
                        {match}% match
                      </span>
                    </div>

                    <div className="mt-2 text-sm space-y-1">
                      <p>
                        Ingredients: {" "}
                        <span className="text-gray-600">
                          {recipe.ingredients.join(", ")}
                        </span>
                      </p>

                      {missing.length > 0 ? (
                        <p>
                          Missing: {" "}
                          <span className="text-red-400">
                            {missing.join(", ")}
                          </span>
                        </p>
                      ) : (
                        <p className="text-green-500 font-medium">
                          Ready to cook 🎉
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
