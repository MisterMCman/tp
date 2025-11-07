# Distance Check Implementation

## How Trainer Reachability is Checked

The system checks if a trainer is within reach of a training location in two ways, depending on the location type:

### 1. Physical Locations (PHYSICAL)

For physical training locations, the system uses **distance calculation**:

#### Process:
1. **Location**: When a `trainingId` is provided in the trainer search, the system fetches the training's `Location` record
2. **Coordinates**: Both the trainer and location must have `latitude` and `longitude` values
3. **Distance Calculation**: Uses the **Haversine formula** to calculate the great-circle distance between:
   - Trainer's coordinates (`trainer.latitude`, `trainer.longitude`)
   - Location's coordinates (`location.latitude`, `location.longitude`)
4. **Radius Check**: Compares the calculated distance to the trainer's `travelRadius` (in km)

#### Implementation:
```typescript
// In /api/trainers/search/route.ts
if (trainingLocation.type === 'PHYSICAL' && 
    trainingLocation.latitude && trainingLocation.longitude && 
    trainer.latitude && trainer.longitude && 
    trainer.travelRadius) {
  
  distanceInfo = checkWithinRadius(
    trainer.latitude,
    trainer.longitude,
    trainer.travelRadius,
    trainingLocation.latitude,
    trainingLocation.longitude
  );
}
```

#### Function: `checkWithinRadius()` (in `src/lib/geocoding.ts`)
- **Input**: Trainer lat/lon, trainer radius, location lat/lon
- **Output**: `{ isWithinRadius: boolean, distance: number | null }`
- **Formula**: Haversine formula for great-circle distance
- **Returns**: 
  - `isWithinRadius: true` if `distance <= trainerRadius`
  - `distance`: Rounded to 1 decimal place (km)

### 2. Online Locations (ONLINE)

For online training locations, the system checks **training type compatibility**:

#### Process:
1. **Location Type**: Checks if the training location is `ONLINE`
2. **Trainer Capability**: Checks if the trainer's `offeredTrainingTypes` includes `'ONLINE'`
3. **Result**: Returns `{ offersOnline: boolean }`

#### Implementation:
```typescript
// In /api/trainers/search/route.ts
if (trainingLocation.type === 'ONLINE') {
  const offersOnline = trainer.offeredTrainingTypes?.some(tt => tt.type === 'ONLINE') || false;
  onlineTrainingInfo = { offersOnline };
}
```

## UI Warnings

### Physical Locations:
- **Within Radius** (Green): "Trainer ist X km entfernt (innerhalb des Reiseradius von Y km)"
- **Outside Radius** (Yellow): "Der Trainer ist X km vom Schulungsort entfernt. Sein Reiseradius beträgt Y km."
  - Shows confirmation dialog when requesting: "Der Trainer ist X km entfernt (außerhalb seines Reiseradius von Y km). Möchten Sie dennoch eine Anfrage senden?"

### Online Locations:
- **Offers Online** (Green): "Trainer bietet Online-Schulungen an"
- **Doesn't Offer Online** (Yellow): "Trainer bietet keine Online-Schulungen an"
  - Shows confirmation dialog when requesting: "Der Trainer bietet keine Online-Schulungen an. Möchten Sie dennoch eine Anfrage senden?"

## Data Requirements

### For Distance Checks to Work:
1. **Trainer** must have:
   - `latitude` (Float)
   - `longitude` (Float)
   - `travelRadius` (Int, in km)

2. **Location** (PHYSICAL) must have:
   - `latitude` (Float)
   - `longitude` (Float)
   - `type` = 'PHYSICAL'

3. **Location** (ONLINE) must have:
   - `type` = 'ONLINE'

### Geocoding:
- Physical locations are automatically geocoded when created (via Google Maps API)
- Trainer addresses are geocoded when profile is updated (if `travelRadius` is set)

## Haversine Formula

The distance calculation uses the standard Haversine formula:

```
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
c = 2 × atan2(√a, √(1−a))
distance = R × c
```

Where:
- `R` = Earth's radius (6371 km)
- `lat1, lon1` = Trainer coordinates
- `lat2, lon2` = Location coordinates
- Result is in kilometers, rounded to 1 decimal place

