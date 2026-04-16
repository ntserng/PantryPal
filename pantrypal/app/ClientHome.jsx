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
  const [dietaryFilter, setDietaryFilter] = useState("none");

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

  const recipePool = [
    {
      name: "Chicken Alfredo",
      ingredients: ["chicken", "pasta", "cream", "garlic", "parmesan"],
      dietaryTags: [],
    },
    {
      name: "Omelette",
      ingredients: ["eggs", "cheese", "milk", "onion", "bell pepper"],
      dietaryTags: ["vegetarian", "gluten-free"],
    },
    {
      name: "Pasta Primavera",
      ingredients: ["pasta", "zucchini", "bell pepper", "broccoli", "olive oil"],
      dietaryTags: ["vegetarian"],
    },
    {
      name: "Caprese Salad",
      ingredients: ["tomato", "basil", "mozzarella", "olive oil"],
      dietaryTags: ["vegetarian", "gluten-free"],
    },
    {
      name: "Fried Rice",
      ingredients: ["rice", "egg", "carrot", "peas", "soy sauce"],
      dietaryTags: ["dairy-free"],
    },
    {
      name: "Grilled Cheese",
      ingredients: ["bread", "cheese", "butter"],
      dietaryTags: ["vegetarian"],
    },
    {
      name: "Tacos",
      ingredients: ["tortilla", "ground beef", "cheese", "lettuce", "tomato"],
      dietaryTags: [],
    },
    {
      name: "Pancakes",
      ingredients: ["flour", "egg", "milk", "sugar", "baking powder"],
      dietaryTags: ["vegetarian"],
    },
    {
      name: "BLT Sandwich",
      ingredients: ["bread", "bacon", "lettuce", "tomato", "mayonnaise"],
      dietaryTags: ["dairy-free"],
    },
    {
      name: "Veggie Stir Fry",
      ingredients: ["broccoli", "carrot", "bell pepper", "soy sauce", "rice"],
      dietaryTags: ["vegan", "vegetarian", "dairy-free"],
    },
    {
      name: "Chickpea Curry",
      ingredients: ["chickpeas", "tomato", "onion", "garlic", "coconut milk"],
      dietaryTags: ["vegan", "vegetarian", "dairy-free", "gluten-free"],
    },
    {
      name: "Quinoa Bowl",
      ingredients: ["quinoa", "black beans", "avocado", "corn", "lime"],
      dietaryTags: ["vegan", "vegetarian", "dairy-free", "gluten-free"],
    },
    {
      name: "Salmon and Veggies",
      ingredients: ["salmon", "broccoli", "lemon", "olive oil", "garlic"],
      dietaryTags: ["dairy-free", "gluten-free"],
    },
    {
      name: "Turkey Lettuce Wraps",
      ingredients: ["ground turkey", "lettuce", "carrot", "soy sauce", "ginger"],
      dietaryTags: ["dairy-free", "gluten-free"],
    },
    {
      name: "Greek Yogurt Parfait",
      ingredients: ["greek yogurt", "berries", "honey", "granola"],
      dietaryTags: ["vegetarian"],
    },
    {
      name: "Tofu Scramble",
      ingredients: ["tofu", "onion", "bell pepper", "spinach", "turmeric"],
      dietaryTags: ["vegan", "vegetarian", "dairy-free", "gluten-free"],
    },
    {
      name: "Lentil Soup",
      ingredients: ["lentils", "carrot", "celery", "onion", "vegetable broth"],
      dietaryTags: ["vegan", "vegetarian", "dairy-free", "gluten-free"],
    },
    {
      name: "Shrimp Tacos",
      ingredients: ["shrimp", "tortilla", "cabbage", "lime", "cilantro"],
      dietaryTags: ["dairy-free"],
    },
    {
      name: "Veggie Burrito Bowl",
      ingredients: ["rice", "black beans", "corn", "avocado", "salsa"],
      dietaryTags: ["vegan", "vegetarian", "dairy-free", "gluten-free"],
    },
    {
      name: "Egg Fried Quinoa",
      ingredients: ["quinoa", "egg", "peas", "carrot", "soy sauce"],
      dietaryTags: ["vegetarian", "dairy-free", "gluten-free"],
    },
    {
      name: "Baked Potato Bar",
      ingredients: ["potato", "cheddar", "green onion", "sour cream", "beans"],
      dietaryTags: ["vegetarian", "gluten-free"],
    },
    {
      name: "Peanut Noodles",
      ingredients: ["noodles", "peanut butter", "soy sauce", "garlic", "green onion"],
      dietaryTags: ["vegan", "vegetarian", "dairy-free"],
    },
    {
      name: "Chicken Fajita Bowl",
      ingredients: ["chicken", "rice", "bell pepper", "onion", "lime"],
      dietaryTags: ["dairy-free", "gluten-free"],
    },
    {
      name: "Tomato Basil Soup",
      ingredients: ["tomato", "basil", "garlic", "onion", "vegetable broth"],
      dietaryTags: ["vegan", "vegetarian", "dairy-free", "gluten-free"],
    },
  ];

  const quickAddIngredients = [
    "rice",
    "pasta",
    "egg",
    "eggs",
    "milk",
    "cheese",
    "bread",
    "chicken",
    "ground beef",
    "salmon",
    "tofu",
    "chickpeas",
    "black beans",
    "potato",
    "broccoli",
    "spinach",
    "tomato",
    "onion",
    "garlic",
    "bell pepper",
    "carrot",
    "avocado",
    "quinoa",
    "lentils",
    "yogurt",
    "olive oil",
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

              {sortedRecipes.length === 0 && (
                <div className="p-4 rounded-xl border bg-gray-50 text-sm text-gray-500">
                  No recipes match that dietary filter yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
