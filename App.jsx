export default function Home() {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-200 min-h-screen p-8">
      {/* NAVBAR */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight">🍳 PantryPal</h1>

        <button className="bg-green-500 text-white px-4 py-2 rounded-xl shadow hover:bg-green-600 transition">
          + Add Ingredients
        </button>
      </div>

      {/* HERO */}
      <div className="mb-10">
        <h2 className="text-4xl font-bold mb-2">
          Cook smarter with what you already have
        </h2>
        <p className="text-gray-600 max-w-xl">
          PantryPal reduces food waste by recommending recipes based on your
          ingredients, dietary preferences, and expiration dates.
        </p>
      </div>

      {/* FLOW */}
      <div className="bg-white rounded-2xl shadow p-4 mb-10 flex justify-around text-sm font-medium">
        <span>⚙️ Preferences</span>
        <span>→</span>
        <span>🥕 Pantry</span>
        <span>→</span>
        <span>🍝 Recipes</span>
        <span>→</span>
        <span>🔔 Alerts</span>
      </div>

      {/* MAIN GRID */}
      <div className="grid md:grid-cols-3 gap-8">
        {/* PANTRY */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Your Pantry</h3>

          <div className="space-y-3">
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
              <span>Chicken Breast</span>
              <span className="text-green-500 font-bold">✔</span>
            </div>

            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-red-400">
              <span>Spinach</span>
              <span className="text-red-500 text-sm">Expiring Soon</span>
            </div>

            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
              <span>Cheese</span>
              <span className="text-green-500 font-bold">✔</span>
            </div>
          </div>
        </div>

        {/* RECIPES */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Recommended Recipes</h3>

          <div className="space-y-4">
            <div className="p-4 rounded-xl border hover:shadow transition">
              <div className="flex justify-between">
                <h4 className="font-medium">Chicken Alfredo</h4>
                <span className="text-green-500 text-sm">92% match</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Uses most of your ingredients
              </p>
            </div>

            <div className="p-4 rounded-xl border hover:shadow transition">
              <div className="flex justify-between">
                <h4 className="font-medium">Omelette</h4>
                <span className="text-yellow-500 text-sm">Missing 1 item</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Quick & beginner friendly
              </p>
            </div>

            <div className="p-4 rounded-xl border hover:shadow transition">
              <div className="flex justify-between">
                <h4 className="font-medium">Pasta Primavera</h4>
                <span className="text-blue-500 text-sm">Healthy</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Great for expiring veggies
              </p>
            </div>
          </div>
        </div>

        {/* SUBSTITUTIONS */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Smart Substitutions</h3>

          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-xl">
              <p className="text-sm">
                Missing: <b>Sour Cream</b>
              </p>
              <p className="text-sm mt-1">
                Try: <b>Greek Yogurt</b>
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-xl">
              <p className="text-sm">
                Missing: <b>Chicken Thigh</b>
              </p>
              <p className="text-sm mt-1">
                Try: <b>Chicken Breast</b>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-16 text-center text-sm text-gray-500">
        Built by PantryPal Team • Texas A&M • 2026
      </div>
    </div>
  );
}
