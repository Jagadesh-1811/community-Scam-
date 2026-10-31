export const KNOWN_AREAS = [
  // 15 Bengaluru areas
  { pincode: "560102", locality: "HSR Layout", city: "Bengaluru", lat: 12.9116, lng: 77.6389 },
  { pincode: "560038", locality: "Indiranagar", city: "Bengaluru", lat: 12.9784, lng: 77.6408 },
  { pincode: "560034", locality: "Koramangala", city: "Bengaluru", lat: 12.9352, lng: 77.6245 },
  { pincode: "560066", locality: "Whitefield", city: "Bengaluru", lat: 12.9698, lng: 77.7500 },
  { pincode: "560076", locality: "BTM Layout", city: "Bengaluru", lat: 12.9166, lng: 77.6101 },
  { pincode: "560011", locality: "Jayanagar", city: "Bengaluru", lat: 12.9308, lng: 77.5838 },
  { pincode: "560037", locality: "Marathahalli", city: "Bengaluru", lat: 12.9591, lng: 77.6974 },
  { pincode: "560103", locality: "Bellandur", city: "Bengaluru", lat: 12.9260, lng: 77.6762 },
  { pincode: "560100", locality: "Electronic City", city: "Bengaluru", lat: 12.8458, lng: 77.6658 },
  { pincode: "560078", locality: "JP Nagar", city: "Bengaluru", lat: 12.9063, lng: 77.5857 },
  { pincode: "560003", locality: "Malleshwaram", city: "Bengaluru", lat: 13.0031, lng: 77.5643 },
  { pincode: "560010", locality: "Rajajinagar", city: "Bengaluru", lat: 12.9882, lng: 77.5548 },
  { pincode: "560024", locality: "Hebbal", city: "Bengaluru", lat: 13.0358, lng: 77.5970 },
  { pincode: "560064", locality: "Yelahanka", city: "Bengaluru", lat: 13.1007, lng: 77.5963 },
  { pincode: "560070", locality: "Banashankari", city: "Bengaluru", lat: 12.9255, lng: 77.5468 },

  // Non-Bengaluru Indian Metros
  { pincode: "400050", locality: "Bandra West", city: "Mumbai", lat: 19.0596, lng: 72.8295 },
  { pincode: "400001", locality: "Fort / Nariman Point", city: "Mumbai", lat: 18.9322, lng: 72.8333 },
  { pincode: "110016", locality: "Hauz Khas", city: "New Delhi", lat: 28.5494, lng: 77.2001 },
  { pincode: "110001", locality: "Connaught Place", city: "New Delhi", lat: 28.6315, lng: 77.2167 },
  { pincode: "500081", locality: "Madhapur", city: "Hyderabad", lat: 17.4483, lng: 78.3915 },
  { pincode: "500034", locality: "Banjara Hills", city: "Hyderabad", lat: 17.4156, lng: 78.4357 },
  { pincode: "600020", locality: "Adyar", city: "Chennai", lat: 13.0012, lng: 80.2565 },
  { pincode: "600002", locality: "Anna Salai", city: "Chennai", lat: 13.0645, lng: 80.2642 },
  { pincode: "411014", locality: "Viman Nagar", city: "Pune", lat: 18.5679, lng: 73.9143 },
  { pincode: "411001", locality: "Pune Station / Camp", city: "Pune", lat: 18.5289, lng: 73.8744 },
  { pincode: "700091", locality: "Salt Lake Sector V", city: "Kolkata", lat: 22.5804, lng: 88.4378 },
  { pincode: "380015", locality: "Satellite", city: "Ahmedabad", lat: 23.0304, lng: 72.5178 },
  { pincode: "302017", locality: "Malviya Nagar", city: "Jaipur", lat: 26.8530, lng: 75.8050 },
  { pincode: "226010", locality: "Gomti Nagar", city: "Lucknow", lat: 26.8504, lng: 80.9992 },
  { pincode: "682030", locality: "Kakkanad", city: "Kochi", lat: 10.0159, lng: 76.3419 },
];

export function findAreaByInput(inputStr) {
  if (!inputStr) return null;
  const raw = inputStr.trim().toLowerCase();

  // 1. Try 6-digit pincode match
  const pinMatch = raw.match(/\b\d{6}\b/);
  if (pinMatch) {
    const pin = pinMatch[0];
    const found = KNOWN_AREAS.find((a) => a.pincode === pin);
    if (found) return found;
  }

  // 2. Try exact or partial locality match
  for (const a of KNOWN_AREAS) {
    if (raw.includes(a.locality.toLowerCase()) || raw.includes(a.pincode)) {
      return a;
    }
  }

  // 3. Try city match
  for (const a of KNOWN_AREAS) {
    if (raw.includes(a.city.toLowerCase())) {
      return a;
    }
  }

  return null;
}

