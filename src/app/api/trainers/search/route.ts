import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Topic suggestions endpoint
export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query || query.length < 2) {
      return NextResponse.json({ topics: [] });
    }

    // Find topics that contain the query
    const topics = await prisma.topic.findMany({
      where: {
        name: {
          contains: query
        }
      },
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      },
      take: 10
    });

    return NextResponse.json({ topics });
  } catch (error: unknown) {
    console.error('Topic suggestions error:', error);
    return NextResponse.json({
      message: 'Fehler beim Laden der Themen-Vorschläge',
      topics: []
    }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const topic = url.searchParams.get('topic');
    const topicId = url.searchParams.get('topicId');
    const location = url.searchParams.get('location');
    const minPrice = url.searchParams.get('minPrice');
    const maxPrice = url.searchParams.get('maxPrice');
    const status = url.searchParams.get('status') || 'ACTIVE';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    // Build the where clause based on filters
    const where: any = {};
    console.log('Search params:', { topic, topicId, location, minPrice, maxPrice, status });

    // Filter by topic if provided (name search)
    if (topic) {
      where.topics = {
        some: {
          topic: {
            name: {
              contains: topic
            }
          }
        }
      };
    }

    // Filter by topic ID if provided (exact match for trainer selection)
    if (topicId) {
      where.topics = {
        some: {
          topicId: parseInt(topicId)
        }
      };
    }

    // Filter by location if provided
    if (location) {
      where.country = {
        code: location.toUpperCase()
      };
    }

    // Filter by price range if provided
    if (minPrice || maxPrice) {
      where.dailyRate = {};
      if (minPrice) {
        where.dailyRate.gte = parseFloat(minPrice);
      }
      if (maxPrice) {
        where.dailyRate.lte = parseFloat(maxPrice);
      }
    }

    // Always filter for active trainers only
    where.status = 'ACTIVE';
    where.userType = 'TRAINER';

    // Get total count for pagination
    const totalCount = await prisma.trainer.count({ where });

    // Get trainers with relationships
    const trainers = await prisma.trainer.findMany({
      where,
      include: {
        topics: {
          include: {
            topic: true
          }
        },
        country: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    // Format the response
    const formattedTrainers = trainers.map(trainer => ({
      id: trainer.id,
      firstName: trainer.firstName,
      lastName: trainer.lastName,
      email: trainer.email,
      phone: trainer.phone,
      bio: trainer.bio || '',
      profilePicture: trainer.profilePicture || '',
      dailyRate: trainer.dailyRate,
      location: trainer.country ? {
        name: trainer.country.name,
        code: trainer.country.code
      } : null,
      topics: trainer.topics?.map(t => t.topic.name) || [],
      completedTrainings: 0, // TODO: Calculate this separately
      isCompany: trainer.isCompany,
      companyName: trainer.companyName
    }));

    return NextResponse.json({
      trainers: formattedTrainers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error: unknown) {
    console.error('Trainer search error:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
      return NextResponse.json({
        message: `Suchfehler: ${error.message}`,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, { status: 500 });
    }
    return NextResponse.json({ message: 'Ein unbekannter Fehler ist aufgetreten.' }, { status: 500 });
  }
}
