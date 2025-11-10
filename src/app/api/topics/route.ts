import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserData } from '@/lib/session';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("search") || "";
  const all = searchParams.get("all"); // Special flag to get all topics
  const manage = searchParams.get("manage"); // Flag for management view (all topics with details)

  // If 'manage' parameter is set, return all topics for management (companies only)
  if (manage === 'true') {
    try {
      const currentUser = getUserData();
      if (!currentUser || currentUser.userType !== 'TRAINING_COMPANY') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const now = new Date();
      
      const topics = await prisma.topic.findMany({
        include: {
          trainings: {
            select: {
              id: true,
              status: true,
              startDate: true,
              endDate: true
            }
          },
          trainers: {
            select: {
              id: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      // Calculate completed and future trainings for each topic
      const topicsWithCounts = topics.map(topic => {
        const completedTrainings = topic.trainings.filter(t => {
          const endDate = new Date(t.endDate);
          return t.status === 'COMPLETED' || (endDate < now && t.status !== 'CANCELLED');
        });
        
        const futureTrainings = topic.trainings.filter(t => {
          const startDate = new Date(t.startDate);
          return startDate >= now && t.status !== 'COMPLETED' && t.status !== 'CANCELLED';
        });

        return {
          ...topic,
          completedTrainingsCount: completedTrainings.length,
          futureTrainingsCount: futureTrainings.length,
          trainersCount: topic.trainers.length
        };
      });

      return NextResponse.json({ topics: topicsWithCounts });
    } catch (dbError) {
      console.error("Database error loading topics for management:", dbError);
      return NextResponse.json({ error: 'Fehler beim Laden der Topics' }, { status: 500 });
    }
  }

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

/**
 * POST /api/topics
 * Create a new topic (companies only)
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = getUserData();
    if (!currentUser || currentUser.userType !== 'TRAINING_COMPANY') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, short_title, state } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // Check if slug already exists
    const existingTopic = await prisma.topic.findUnique({
      where: { slug }
    });

    if (existingTopic) {
      return NextResponse.json(
        { error: 'Ein Thema mit diesem Namen existiert bereits' },
        { status: 400 }
      );
    }

    // Create topic
    const topic = await prisma.topic.create({
      data: {
        name: name.trim(),
        short_title: short_title?.trim() || null,
        slug,
        state: state || 'online'
      }
    });

    return NextResponse.json({ topic });
  } catch (error: any) {
    console.error('Error creating topic:', error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ein Thema mit diesem Namen existiert bereits' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create topic' },
      { status: 500 }
    );
  }
}
