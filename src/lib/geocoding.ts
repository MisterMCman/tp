/**
 * Geocoding utilities using Google Maps API
 */

interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
}

/**
 * Geocode an address to get latitude and longitude
 * @param address - Full address string or address components
 * @returns Promise with latitude and longitude
 */
export async function geocodeAddress(
  street?: string,
  houseNumber?: string,
  zipCode?: string,
  city?: string,
  country?: string
): Promise<GeocodeResult | null> {
  // Build address string
  const addressParts: string[] = [];
  if (street) {
    addressParts.push(houseNumber ? `${street} ${houseNumber}` : street);
  }
  if (zipCode) addressParts.push(zipCode);
  if (city) addressParts.push(city);
  if (country) addressParts.push(country);

  const address = addressParts.join(', ');

  if (!address.trim()) {
    console.warn('No address provided for geocoding');
    return null;
  }

  // For server-side usage, call Google Maps API directly
  // For client-side usage, use the API endpoint
  if (typeof window === 'undefined') {
    // Server-side: call Google Maps API directly
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY is not set');
      return null;
    }

    try {
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
      const response = await fetch(geocodeUrl);

      if (!response.ok) {
        console.error('Google Maps API error:', response.statusText);
        return null;
      }

      const data = await response.json();

      if (data.status === 'ZERO_RESULTS' || data.status !== 'OK') {
        console.error('Geocoding failed:', data.status);
        return null;
      }

      if (!data.results || data.results.length === 0) {
        return null;
      }

      const result = data.results[0];
      const location = result.geometry.location;

      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: result.formatted_address,
      };
    } catch (error) {
      console.error('Geocoding request failed:', error);
      return null;
    }
  } else {
    // Client-side: use API endpoint
    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Geocoding error:', error);
        return null;
      }

      const data = await response.json();
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        formattedAddress: data.formattedAddress,
      };
    } catch (error) {
      console.error('Geocoding request failed:', error);
      return null;
    }
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a location is within a trainer's travel radius
 * @param trainerLat - Trainer's latitude
 * @param trainerLon - Trainer's longitude
 * @param trainerRadius - Trainer's travel radius in km
 * @param locationLat - Location's latitude
 * @param locationLon - Location's longitude
 * @returns Object with isWithinRadius and distance
 */
export function checkWithinRadius(
  trainerLat: number | null | undefined,
  trainerLon: number | null | undefined,
  trainerRadius: number | null | undefined,
  locationLat: number | null | undefined,
  locationLon: number | null | undefined
): { isWithinRadius: boolean; distance: number | null } {
  if (
    !trainerLat ||
    !trainerLon ||
    !trainerRadius ||
    !locationLat ||
    !locationLon
  ) {
    return { isWithinRadius: false, distance: null };
  }

  const distance = calculateDistance(
    trainerLat,
    trainerLon,
    locationLat,
    locationLon
  );

  return {
    isWithinRadius: distance <= trainerRadius,
    distance,
  };
}

