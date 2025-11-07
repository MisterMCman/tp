import { NextResponse } from 'next/server';

/**
 * Geocoding API endpoint using Google Maps Geocoding API
 * POST /api/geocode
 * Body: { address: string }
 */
export async function POST(req: Request) {
  try {
    const { address } = await req.json();

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'Geocoding service is not configured' },
        { status: 500 }
      );
    }

    // Call Google Maps Geocoding API
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

    const response = await fetch(geocodeUrl);

    if (!response.ok) {
      console.error('Google Maps API error:', response.statusText);
      return NextResponse.json(
        { error: 'Failed to geocode address' },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (data.status === 'ZERO_RESULTS') {
      return NextResponse.json(
        { error: 'No results found for this address' },
        { status: 404 }
      );
    }

    if (data.status !== 'OK') {
      console.error('Google Maps API error status:', data.status);
      return NextResponse.json(
        { error: `Geocoding failed: ${data.status}` },
        { status: 500 }
      );
    }

    if (!data.results || data.results.length === 0) {
      return NextResponse.json(
        { error: 'No results found' },
        { status: 404 }
      );
    }

    const result = data.results[0];
    const location = result.geometry.location;

    return NextResponse.json({
      latitude: location.lat,
      longitude: location.lng,
      formattedAddress: result.formatted_address,
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

