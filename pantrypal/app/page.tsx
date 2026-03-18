import Image from "next/image";

export default function Home() {
  return (
    <div className="bg-gray-100 min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold">🍳 PantryPal</h1>
        <p className="text-gray-600 mt-2">
          Smart Recipe Recommendations from Your Pantry
        </p>
      </div>

      {/* Flow */}
      <div className="bg-green-100 p-4 rounded-xl text-center">
        Preferences → Pantry → Recipes → Alerts
      </div>

      {/* Main */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded-xl">
          <h2 className="font-bold mb-2">Pantry</h2>
          <p>Chicken ✔</p>
          <p>Basil ✔</p>
        </div>

        <div className="bg-white p-4 rounded-xl">
          <h2 className="font-bold mb-2">Recipes</h2>
          <p>Pasta ♥</p>
          <p>Omelette ♥</p>
        </div>

        <div className="bg-white p-4 rounded-xl">
          <h2 className="font-bold mb-2">Substitutions</h2>
          <p>Missing: Sour Cream</p>
          <p>Use: Greek Yogurt</p>
        </div>
      </div>
    </div>
  );
}
