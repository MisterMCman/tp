# Trainer Search - Topic Filtering Documentation

## Overview

The trainer search supports filtering by topic in two ways:
1. **By Topic Name** (partial text search)
2. **By Topic ID** (exact match)

Both methods can be combined with expertise level filtering.

## Database Structure

The filtering works through the `TrainerTopic` relation table:

```
Trainer ←→ TrainerTopic ←→ Topic
```

Where `TrainerTopic` contains:
- `trainerId` - Reference to Trainer
- `topicId` - Reference to Topic
- `expertiseLevel` - One of: `GRUNDLAGE`, `FORTGESCHRITTEN`, `EXPERTE`

## Implementation Details

### 1. Filter by Topic Name (`?topic=...`)

**Location:** `src/app/api/trainers/search/route.ts` (lines 59-86)

**How it works:**
```typescript
if (topic) {
  const topicFilter: any = {
    topic: {
      name: {
        contains: topic  // Case-insensitive partial match
      }
    }
  };

  // Add expertise level filter if provided
  if (expertiseLevel && expertiseLevel !== 'all') {
    const levelMap = {
      'minimum_grundlage': ['GRUNDLAGE', 'FORTGESCHRITTEN', 'EXPERTE'],
      'minimum_fortgeschritten': ['FORTGESCHRITTEN', 'EXPERTE'],
      'minimum_experte': ['EXPERTE']
    };
    
    const allowedLevels = levelMap[expertiseLevel];
    if (allowedLevels) {
      topicFilter.expertiseLevel = { in: allowedLevels };
    }
  }

  where.topics = {
    some: topicFilter  // Trainer must have at least ONE topic matching
  };
}
```

**Example:**
- Search: `?topic=JavaScript`
- Finds: All trainers who have ANY topic with "JavaScript" in the name
- Result: Trainers with topics like "JavaScript", "JavaScript Advanced", "Modern JavaScript", etc.

**Prisma Query Generated:**
```sql
WHERE EXISTS (
  SELECT 1 FROM TrainerTopic tt
  JOIN Topic t ON tt.topicId = t.id
  WHERE tt.trainerId = Trainer.id
    AND t.name LIKE '%JavaScript%'
    AND (expertiseLevel filter if provided)
)
```

### 2. Filter by Topic ID (`?topicId=...`)

**Location:** `src/app/api/trainers/search/route.ts` (lines 88-111)

**How it works:**
```typescript
if (topicId) {
  const topicIdFilter: any = {
    topicId: parseInt(topicId)  // Exact match
  };

  // Add expertise level filter if provided
  if (expertiseLevel && expertiseLevel !== 'all') {
    // Same level mapping as above
    topicIdFilter.expertiseLevel = { in: allowedLevels };
  }

  where.topics = {
    some: topicIdFilter
  };
}
```

**Example:**
- Search: `?topicId=42`
- Finds: All trainers who have topic with ID 42
- Result: Only trainers with that specific topic

**Use Case:**
- Used when a user selects a specific topic from a dropdown/list
- More precise than name search (avoids partial matches)

### 3. Expertise Level Filtering

**How it works:**
The expertise level filter uses a "minimum level" approach:

- **`minimum_grundlage`**: Shows trainers with GRUNDLAGE, FORTGESCHRITTEN, or EXPERTE
- **`minimum_fortgeschritten`**: Shows trainers with FORTGESCHRITTEN or EXPERTE only
- **`minimum_experte`**: Shows trainers with EXPERTE only

**Example:**
- Topic: "JavaScript"
- Level: `minimum_fortgeschritten`
- Result: Trainers who have JavaScript at FORTGESCHRITTEN or EXPERTE level (excludes GRUNDLAGE)

**Combined Filter:**
```typescript
where.topics = {
  some: {
    topic: { name: { contains: 'JavaScript' } },
    expertiseLevel: { in: ['FORTGESCHRITTEN', 'EXPERTE'] }
  }
}
```

## Frontend Usage

### From Training Overview ("Trainer anfragen")

**Location:** `src/app/dashboard/trainings/page.tsx`

When clicking "Trainer anfragen" on a training:
```typescript
router.push(`/dashboard/trainer?trainingId=${training.id}&topic=${encodeURIComponent(training.topicName)}`);
```

This:
1. Navigates to trainer search page
2. Pre-fills the topic field with the training's topic name
3. Auto-triggers a search using the topic name filter

### Manual Search

**Location:** `src/app/dashboard/trainer/page.tsx`

Users can:
1. Type a topic name in the search field
2. Get topic suggestions (via `/api/trainers/search` POST endpoint)
3. Select a topic from suggestions
4. Trigger search with `?topic=...` parameter

### Search Function

**Location:** `src/app/dashboard/trainer/page.tsx` (line ~150)

```typescript
const searchTrainers = async (filtersOverride?: any) => {
  const filters = filtersOverride || searchFilters;
  
  const params = new URLSearchParams();
  if (filters.topic) params.append('topic', filters.topic);
  if (filters.location) params.append('location', filters.location);
  if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
  if (filters.expertiseLevel !== 'all') {
    params.append('expertiseLevel', filters.expertiseLevel);
  }
  
  // Add trainingId if present (for distance checks)
  if (trainingIdFromUrl) {
    params.append('trainingId', trainingIdFromUrl.toString());
  }
  
  const response = await fetch(`/api/trainers/search?${params.toString()}`);
  // ...
}
```

## Query Logic

### The `some` Operator

The key to understanding the filtering is Prisma's `some` operator:

```typescript
where.topics = {
  some: { /* filter criteria */ }
}
```

This means: **"Find trainers where at least ONE of their topics matches the criteria"**

**Important:** A trainer will be included if they have ANY topic matching, even if they have other topics that don't match.

### Example Scenario

**Trainer A has:**
- JavaScript (EXPERTE)
- Python (GRUNDLAGE)
- React (FORTGESCHRITTEN)

**Search:** `?topic=JavaScript&expertiseLevel=minimum_fortgeschritten`

**Result:** ✅ Trainer A is included
- Because they have JavaScript at EXPERTE level (matches minimum_fortgeschritten)

**Search:** `?topic=Python&expertiseLevel=minimum_fortgeschritten`

**Result:** ❌ Trainer A is NOT included
- Because they only have Python at GRUNDLAGE level (doesn't meet minimum_fortgeschritten)

## Response Format

The API returns trainers with their topics:

```typescript
{
  trainers: [
    {
      id: 1,
      firstName: "John",
      lastName: "Doe",
      topics: ["JavaScript", "React", "TypeScript"],  // All topic names
      topicsWithLevels: [  // Topics with expertise levels
        { name: "JavaScript", level: "EXPERTE" },
        { name: "React", level: "FORTGESCHRITTEN" },
        { name: "TypeScript", level: "GRUNDLAGE" }
      ],
      // ... other fields
    }
  ],
  pagination: { /* ... */ }
}
```

## Performance Considerations

1. **Indexes:** The `TrainerTopic` table should have indexes on:
   - `trainerId` (already indexed)
   - `topicId` (for topicId searches)
   - `expertiseLevel` (for level filtering)

2. **Query Optimization:**
   - The `some` operator uses EXISTS subquery (efficient)
   - Topic name search uses `LIKE '%term%'` (can be slow on large datasets)
   - Consider full-text search for better performance if needed

3. **Pagination:**
   - Results are paginated (default: 50 per page)
   - Total count is calculated separately for performance

## Common Use Cases

### 1. Find all JavaScript trainers
```
GET /api/trainers/search?topic=JavaScript
```

### 2. Find expert Python trainers only
```
GET /api/trainers/search?topic=Python&expertiseLevel=minimum_experte
```

### 3. Find trainers for a specific training (with distance check)
```
GET /api/trainers/search?topicId=42&trainingId=123
```
- Filters by exact topic ID
- Calculates distance if training has physical location
- Checks online training compatibility if training is online

### 4. Combined filters
```
GET /api/trainers/search?topic=JavaScript&location=DE&maxPrice=1000&expertiseLevel=minimum_fortgeschritten
```
- Topic: JavaScript (partial match)
- Location: Germany
- Max price: €1000/day
- Minimum level: FORTGESCHRITTEN

## Summary

**Topic filtering works by:**
1. Using Prisma's `some` operator to find trainers with matching topics
2. Supporting both name-based (partial) and ID-based (exact) searches
3. Combining with expertise level filtering using "minimum level" logic
4. Returning all topics for each trainer (not just the matching one)

**Key Point:** A trainer is included if they have **at least one** topic matching the search criteria, regardless of their other topics.

