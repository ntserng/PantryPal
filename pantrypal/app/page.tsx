"use client";
import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [pantry, setPantry] = useState(["chicken", "basil"]);

  // Mock recipe database
  const recipes = [
    {
      name: "Chicken Alfredo",
      ingredients: ["chicken", "pasta", "cream"],
    },
    {
      name: "Omelette",
      ingredients: ["eggs", "cheese"],
    },
    {
      name: "Pasta Primavera",
      ingredients: ["pasta", "vegetables"],
    },
  ];

  // Add ingredient
  const addIngredient = () => {
    if (!input) return;
    setPantry([...pantry, input.toLowerCase()]);
    setInput("");
  };

  // Compute match %
  const getMatch = (recipe) => {
    const matches = recipe.ingredients.filter((i) => pantry.includes(i)).length;
    return Math.round((matches / recipe.ingredients.length) * 100);
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-200 min-h-screen p-8 text-gray-900">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-bold">🍳 PantryPal</h1>
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

            <div className="flex flex-wrap gap-2">
              {pantry.map((item, index) => (
                <span
                  key={index}
                  className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* RECIPES */}
          <div className="bg-white rounded-2xl shadow-md p-6 border">
            <h3 className="text-xl font-semibold mb-4">Recommended Recipes</h3>

            <div className="space-y-4">
              {recipes.map((recipe, index) => {
                const match = getMatch(recipe);

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

                    <p className="text-sm text-gray-500 mt-1">
                      Needs:{" "}
                      {recipe.ingredients
                        .filter((i) => !pantry.includes(i))
                        .join(", ") || "Nothing 🎉"}
                    </p>
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
