import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("search") || "";
  const all = searchParams.get("all"); // Special flag to get all topics

  // If 'all' parameter is set, return all online topics
  if (all === 'true') {
    try {
      const topics = await prisma.topic.findMany({
        where: {
          state: 'online'
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: 'asc'
        }
      });
      console.log(`API returning all ${topics.length} online topics`);
      return NextResponse.json(topics);
    } catch (dbError) {
      console.error("Database error loading topics:", dbError);
      return NextResponse.json({ error: 'Fehler beim Laden der Topics' }, { status: 500 });
    }
  }

  if (!query || query.trim() === '' || query.trim().length < 3) {
    // Return empty array for short queries to avoid overwhelming the user
    return NextResponse.json([]);
  }

  try {
    const searchTerm = query.trim();
    console.log(`API received search term: "${searchTerm}"`);

    try {
      // Intelligent multi-field search for MySQL
      // Note: MySQL LIKE is case-insensitive by default, so we don't convert to lowercase
      const topics = await prisma.topic.findMany({
        where: {
          AND: [
            { state: 'online' }, // Only show online topics
            {
              OR: [
                {
                  name: {
                    contains: searchTerm
                  }
                },
                {
                  short_title: {
                    contains: searchTerm
                  }
                },
                {
                  slug: {
                    contains: searchTerm
                  }
                }
              ]
            }
          ]
        },
        select: {
          id: true,
          name: true,
          short_title: true,
          slug: true,
        },
        orderBy: {
          name: 'asc'
        },
        // No limit - show all matching topics for better UX
      });

      // Sort results by relevance (case-insensitive)
      const searchLower = searchTerm.toLowerCase();
      const sortedTopics = topics.sort((a, b) => {
        const aNameLower = a.name.toLowerCase();
        const bNameLower = b.name.toLowerCase();
        const aShortLower = (a.short_title || '').toLowerCase();
        const bShortLower = (b.short_title || '').toLowerCase();
        
        // 1. Exact match in name or short_title first
        if (aNameLower === searchLower || aShortLower === searchLower) return -1;
        if (bNameLower === searchLower || bShortLower === searchLower) return 1;
        
        // 2. Name starts with search term
        if (aNameLower.startsWith(searchLower) && !bNameLower.startsWith(searchLower)) return -1;
        if (bNameLower.startsWith(searchLower) && !aNameLower.startsWith(searchLower)) return 1;
        
        // 3. Short title starts with search term
        if (aShortLower.startsWith(searchLower) && !bShortLower.startsWith(searchLower)) return -1;
        if (bShortLower.startsWith(searchLower) && !aShortLower.startsWith(searchLower)) return 1;
        
        // 4. Name contains search term in a word (word boundary-like)
        const aWordMatch = aNameLower.includes(' ' + searchLower) || aNameLower.includes('-' + searchLower);
        const bWordMatch = bNameLower.includes(' ' + searchLower) || bNameLower.includes('-' + searchLower);
        if (aWordMatch && !bWordMatch) return -1;
        if (bWordMatch && !aWordMatch) return 1;
        
        // 5. Shorter names first (more specific)
        const lengthDiff = a.name.length - b.name.length;
        if (Math.abs(lengthDiff) > 10) return lengthDiff;
        
        // 6. Alphabetical
        return aNameLower.localeCompare(bNameLower);
      });

      // Return id, name, and short_title for richer display
      // Show all matching topics (no artificial limit)
      const formattedTopics = sortedTopics.map(t => ({
        id: t.id,
        name: t.name,
        short_title: t.short_title,
        displayName: t.short_title && t.short_title !== t.name 
          ? `${t.name} (${t.short_title})` 
          : t.name
      }));
      
      console.log(`API returning ${formattedTopics.length} topics for "${searchTerm}"`);
      return NextResponse.json(formattedTopics);
    } catch (dbError) {
      console.error("Database error searching topics:", dbError);
      return NextResponse.json({ error: 'Fehler bei der Topic-Suche' }, { status: 500 });
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error in /api/topics:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "An unknown error occurred" }, { status: 500 });
  }
}
