// reverseGeocodeClient.js
// Client-side reverse-geocoding utility using a public JSON cache

import { countyToMetro, stateNameToCode } from "./yourLookupMaps";

const CACHE_URL = "https://azri.us/geovision/reverse/default.json";

/**
 * getLocationDetails(lat, lon):
 * Tries to load a JSON cache the same way articles are loaded,
 * then falls back to Nominatim API on cache miss.
 * If anything goes wrong, returns { userAddress, neighborhood, locality, metro, state }
 * all set to a friendly "lat, lon" string.
 */
export async function getLocationDetails(lat, lon) {
  const key = `${lat.toFixed(4)}_${lon.toFixed(4)}`;

  // If coords are undefined
  if (key === "undefined_undefined") {
    const fallback = "Unknown Location";
    return {
      userAddress: fallback,
      neighborhood: fallback,
      locality: fallback,
      metro: fallback,
      state: fallback,
    };
  }

  // Helper to build the lat/lon fallback object
  const buildLatLonFallback = () => {
    const coords = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    return {
      userAddress: coords,
      neighborhood: coords,
      locality: coords,
      metro: coords,
      state: coords,
    };
  };

  // 1) Attempt to load public cache JSON
  try {
    console.log("[reverseGeocode] Loading reverse cache:", CACHE_URL);
    const res = await fetch(CACHE_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const cache = await res.json();
      if (cache[key]?.address) {
        console.log(`[reverseGeocode] Cache hit for ${key}`, cache[key]);
        return extractFields(cache[key].address);
      }
      console.log(`[reverseGeocode] Cache miss for ${key}`);
    } else {
      console.error(
        "[reverseGeocode] loadReverseCache failed:",
        res.status,
        res.statusText,
      );
    }
  } catch (err) {
    console.error("[reverseGeocode] loadReverseCache error:", err);
  }

  // 2) Fallback to Nominatim API (wrapped in its own try/catch)
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("lat", lat);
    url.searchParams.set("lon", lon);
    url.searchParams.set("zoom", "10");
    url.searchParams.set("accept-language", "en");

    console.log("[reverseGeocode] Fetching from Nominatim:", url.toString());
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "AzriusAnalytics/1.0 (contact@azrius.com)",
        Referer: window.location.origin,
      },
    });

    if (!response.ok) {
      console.error(
        "[reverseGeocode] Nominatim API error:",
        response.status,
        response.statusText,
      );
      throw new Error("Nominatim response not OK");
    }

    const data = await response.json();
    console.log("[reverseGeocode] Nominatim result:", data);
    return extractFields(data.address || {});
  } catch (err) {
    console.error("[reverseGeocode] Nominatim fallback failed:", err);
    return buildLatLonFallback();
  }
}

/**
 * extractFields(address): picks desired address fields
 */
function extractFields(address) {
  const result = { userAddress: "Default" };

  // 1) copy every field from address (undefined → null)
  for (const [key, value] of Object.entries(address)) {
    result[key] = value ?? null;
  }

  // 2) run your special lookups
  const stateCode = stateNameToCode[address.state] || null;
  result.stateCode = stateCode;

  const metroKey = `${address.county}, ${stateCode}`;
  result.metroKey = metroKey;

  const metro = countyToMetro[metroKey] || null;
  result.metro = metro;

  return result;
}
