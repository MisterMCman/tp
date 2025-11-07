# Travel Areas (Einzugsgebiete) Setup Guide

## Overview
This feature allows trainers to specify a travel radius from their address, and the system automatically calculates distances to training locations. Companies can see if a trainer is within their travel radius when requesting trainers.

## Setup Requirements

### 1. Google Maps API Key

You need a Google Maps API key for geocoding (converting addresses to latitude/longitude).

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Geocoding API**
4. Create credentials (API Key)
5. Add the API key to your `.env` file:

```env
GOOGLE_MAPS_API_KEY=your_api_key_here
```

**Note:** For production, restrict the API key to only allow requests from your domain and limit it to the Geocoding API.

### 2. Database Migration

Run the database migration to add latitude/longitude fields:

```bash
npx prisma db push
```

This will add:
- `latitude` and `longitude` fields to the `Trainer` model
- `locationLatitude` and `locationLongitude` fields to the `Training` model

## How It Works

### For Trainers

1. **Setting Travel Radius:**
   - Trainers can set their travel radius (in km) in their profile settings
   - When they save their address, the system automatically geocodes it to get latitude/longitude
   - The geocoding happens automatically when address fields change

2. **Profile Fields:**
   - Street, House Number, ZIP Code, City, Country
   - Travel Radius (in km)
   - Latitude/Longitude (automatically calculated, not editable)

### For Companies

1. **Creating Trainings:**
   - When creating a HYBRID or VOR_ORT training, companies enter location details
   - The system automatically geocodes the training location
   - Latitude/Longitude are stored for distance calculations

2. **Requesting Trainers:**
   - When searching for trainers with a specific training selected, the system calculates distances
   - If a trainer is outside their travel radius, a warning is shown:
     - Yellow warning box with distance information
     - Confirmation dialog when sending request
   - Companies can still send requests even if outside radius
   - If within radius, a green info box confirms the trainer is within range

## API Endpoints

### `/api/geocode` (POST)
Geocodes an address using Google Maps API.

**Request:**
```json
{
  "address": "Hermannstraße 3, 33602 Bielefeld, Germany"
}
```

**Response:**
```json
{
  "latitude": 52.0235,
  "longitude": 8.5325,
  "formattedAddress": "Hermannstraße 3, 33602 Bielefeld, Germany"
}
```

### `/api/trainers/search` (GET)
Includes distance information when `trainingId` parameter is provided.

**Query Parameters:**
- `trainingId` (optional): Training ID to calculate distance from

**Response includes:**
```json
{
  "trainers": [
    {
      "id": 1,
      "distanceInfo": {
        "isWithinRadius": false,
        "distance": 125.5
      },
      "travelRadius": 100
    }
  ]
}
```

## Distance Calculation

The system uses the **Haversine formula** to calculate the great-circle distance between two points on Earth:

- Distance is calculated in kilometers
- Rounded to 1 decimal place
- Only calculated for HYBRID and VOR_ORT trainings
- Requires both trainer and training location to have valid coordinates

## UI Features

### Trainer Search Results
- **Within Radius:** Green info box showing distance
- **Outside Radius:** Yellow warning box with distance and radius info
- Confirmation dialog when requesting trainer outside radius

### Trainer Profile
- Shows travel radius in profile
- Address is automatically geocoded when saved

## Troubleshooting

### Geocoding Not Working
1. Check that `GOOGLE_MAPS_API_KEY` is set in `.env`
2. Verify the API key has Geocoding API enabled
3. Check API key restrictions (should allow your domain)
4. Check browser console for errors

### Distance Not Showing
1. Ensure trainer has set travel radius
2. Ensure trainer address has been geocoded (check `latitude`/`longitude` in database)
3. Ensure training location has been geocoded (check `locationLatitude`/`locationLongitude`)
4. Training must be HYBRID or VOR_ORT type

### Address Not Geocoding
1. Check that address fields are complete (at least street, city, and country)
2. Check server logs for geocoding errors
3. Verify Google Maps API quota hasn't been exceeded

## Future Enhancements

- Map visualization of trainer locations and travel radius
- Filter trainers by distance
- Automatic geocoding when address is entered (real-time)
- Multiple travel areas per trainer
- Travel cost estimation based on distance

