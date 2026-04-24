// Barcode to ingredient mapping database
// In production, integrate with a real barcode API like Open Food Facts API

export const BARCODE_DATABASE = {
  // Produce
  "8001": { name: "banana", expiry: 5 },
  "8002": { name: "apple", expiry: 14 },
  "8003": { name: "orange", expiry: 14 },
  "8004": { name: "tomato", expiry: 7 },
  "8005": { name: "lettuce", expiry: 5 },
  "8006": { name: "carrot", expiry: 21 },
  "8007": { name: "broccoli", expiry: 7 },
  "8008": { name: "potato", expiry: 30 },

  // Dairy
  "8009": { name: "milk", expiry: 7 },
  "8010": { name: "cheese", expiry: 30 },
  "8011": { name: "yogurt", expiry: 14 },
  "8012": { name: "butter", expiry: 60 },
  "8013": { name: "eggs", expiry: 21 },

  // Proteins
  "8014": { name: "chicken breast", expiry: 3 },
  "8015": { name: "ground beef", expiry: 2 },
  "8016": { name: "salmon", expiry: 2 },
  "8017": { name: "tofu", expiry: 7 },

  // Pantry staples
  "8018": { name: "rice", expiry: 365 },
  "8019": { name: "pasta", expiry: 365 },
  "8020": { name: "olive oil", expiry: 365 },
  "8021": { name: "flour", expiry: 180 },
  "8022": { name: "sugar", expiry: 365 },
  "8023": { name: "salt", expiry: 365 },
  "8024": { name: "garlic", expiry: 14 },
  "8025": { name: "onion", expiry: 21 },

  // Condiments
  "8026": { name: "soy sauce", expiry: 365 },
  "8027": { name: "vinegar", expiry: 365 },
  "8028": { name: "ketchup", expiry: 180 },
  "8029": { name: "mustard", expiry: 180 },
};

// Helper function to add new barcodes
export function addBarcodeMapping(barcode, ingredientName, expiryDays) {
  BARCODE_DATABASE[barcode] = {
    name: ingredientName.toLowerCase().trim(),
    expiry: expiryDays,
  };
}

// Helper to fetch real barcode data from Open Food Facts API
export async function fetchBarcodeFromAPI(barcode) {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status === 1 && data.product?.product_name) {
      return {
        name: data.product.product_name.toLowerCase(),
        expiry: 14, // Default expiry estimate
      };
    }
  } catch (err) {
    console.error("Failed to fetch barcode data:", err);
  }
  return null;
}
