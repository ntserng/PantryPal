import { Card, CardContent } from "@/components/ui/card";

export default function App() {
  return (
    <div className="bg-gray-100 min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold">🍳 PantryPal</h1>
        <p className="text-gray-600 mt-2">
          Smart Recipe Recommendations from Your Pantry
        </p>

        <div className="flex justify-center gap-4 mt-4">
          <span className="bg-orange-400 text-white px-4 py-1 rounded-full">
            Team Project
          </span>
          <span className="bg-green-500 text-white px-4 py-1 rounded-full">
            Spring 2026
          </span>
        </div>
      </div>

      {/* Top Sections */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <h2 className="font-bold text-lg mb-2">Introduction</h2>
            <p className="text-sm text-gray-600">
              Solve food waste by generating recipes based on what users already
              have in their pantry.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="font-bold text-lg mb-2">Issues</h2>
            <ul className="text-sm text-gray-600 list-disc ml-4">
              <li>Decision overload</li>
              <li>Skill level matching</li>
              <li>Dietary restrictions</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Flow Section */}
      <div className="bg-green-100 p-4 rounded-2xl">
        <div className="flex justify-between text-center text-sm font-medium">
          <div>Preferences</div>
          <div>→</div>
          <div>Pantry Input</div>
          <div>→</div>
          <div>Recipes</div>
          <div>→</div>
          <div>Alerts</div>
        </div>
      </div>

      {/* Main UI */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Pantry */}
        <Card>
          <CardContent className="p-4">
            <h2 className="font-bold mb-3">Pantry</h2>

            {["Basil", "Cheese", "Chicken", "Pepper"].map((item, i) => (
              <div
                key={i}
                className="flex justify-between items-center border-b py-2"
              >
                <span>{item}</span>
                <span className="text-green-500">✔</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recipes */}
        <Card>
          <CardContent className="p-4">
            <h2 className="font-bold mb-3">Recipes</h2>

            {["Pasta", "Chicken Bowl", "Omelette"].map((recipe, i) => (
              <div
                key={i}
                className="flex justify-between items-center border-b py-2"
              >
                <span>{recipe}</span>
                <span className="text-red-400">♥</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Suggestions */}
        <Card>
          <CardContent className="p-4">
            <h2 className="font-bold mb-3">Substitutions</h2>

            <div className="bg-yellow-100 p-3 rounded-lg">
              Missing: Sour Cream <br />
              Suggest: Greek Yogurt
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Sections */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <h2 className="font-bold">Related Work</h2>
            <p className="text-sm text-gray-600 mt-2">
              Inspired by SuperCook and FoodCombo.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="font-bold">Next Steps</h2>
            <ul className="text-sm text-gray-600 list-disc ml-4">
              <li>Build backend</li>
              <li>Test UI</li>
              <li>Add AI recommendations</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
