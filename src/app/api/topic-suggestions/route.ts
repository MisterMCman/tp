import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTrainerData } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const trainerData = getTrainerData();

    // For GET requests (topic search), we allow unauthenticated access
    // Only POST requests (creating suggestions) require authentication

    if (!query || query.trim() === '') {
      return NextResponse.json([], { status: 200 });
    }

    console.log(`API received topic suggestion query: "${query}"`);

    // First, try to find existing topics
    const existingTopics = await prisma.topic.findMany({
      where: {
        name: {
          contains: query.toLowerCase(),
        },
      },
      select: {
        id: true,
        name: true,
      },
      take: 10,
    });

    // Also check for existing suggestions by this trainer (only if authenticated)
    let existingSuggestions: any[] = [];
    if (trainerData && trainerData.id) {
      existingSuggestions = await prisma.topicSuggestion.findMany({
        where: {
          trainerId: trainerData.id as number,
          name: {
            contains: query.toLowerCase(),
          },
          status: 'PENDING', // Only show pending suggestions
        },
        select: {
          id: true,
          name: true,
          status: true,
        },
        take: 5,
      });
    }

    // Combine results
    const results = [
      ...existingTopics.map(topic => ({
        id: topic.id,
        name: topic.name,
        type: 'existing' as const,
      })),
      ...existingSuggestions.map(suggestion => ({
        id: suggestion.id,
        name: suggestion.name,
        type: 'suggestion' as const,
        status: suggestion.status,
      })),
    ];

    console.log(`API returning topic suggestions:`, results);
    return NextResponse.json(results);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error in /api/topic-suggestions:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "An unknown error occurred" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;
    const trainerData = getTrainerData();

    if (!trainerData) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Topic name ist erforderlich' },
        { status: 400 }
      );
    }

    console.log(`Creating topic suggestion: "${name}" for trainer ${trainerData.id}`);

    // Check if suggestion already exists for this trainer
    const existingSuggestion = await prisma.topicSuggestion.findFirst({
      where: {
        trainerId: trainerData.id as number,
        name: name.trim(),
      },
    });

    if (existingSuggestion) {
      return NextResponse.json(
        { error: 'Sie haben bereits einen Vorschlag für dieses Thema gemacht' },
        { status: 409 }
      );
    }

    // Check if topic already exists
    const existingTopic = await prisma.topic.findFirst({
      where: {
        name: name.trim(),
      },
    });

    if (existingTopic) {
      return NextResponse.json(
        { error: 'Dieses Thema existiert bereits' },
        { status: 409 }
      );
    }

    // Create the suggestion
    const suggestion = await prisma.topicSuggestion.create({
      data: {
        name: name.trim(),
        trainerId: trainerData.id as number,
        status: 'PENDING',
      },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
      },
    });

    console.log(`Created topic suggestion:`, suggestion);
    return NextResponse.json({
      message: 'Topic-Vorschlag wurde erstellt',
      suggestion,
    }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error creating topic suggestion:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "An unknown error occurred" }, { status: 500 });
  }
}
