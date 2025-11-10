import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkWithinRadius } from '@/lib/geocoding';

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
    const locationId = url.searchParams.get('locationId');
    const minPrice = url.searchParams.get('minPrice');
    const maxPrice = url.searchParams.get('maxPrice');
    const expertiseLevel = url.searchParams.get('expertiseLevel'); // 'minimum_grundlage', 'minimum_fortgeschritten', 'minimum_experte'
    const status = url.searchParams.get('status') || 'ACTIVE';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const trainingId = url.searchParams.get('trainingId'); // For distance calculation

    // Build the where clause based on filters
    const where: any = {};
    console.log('Search params:', { topic, topicId, location, locationId, minPrice, maxPrice, status });

    // Filter by topic ID if provided (exact match for trainer selection)
    // Priority: topicId over topic name to ensure exact matching
    if (topicId) {
      const topicIdFilter: any = {
        topicId: parseInt(topicId)
      };

      // Add expertise level filter if provided
      if (expertiseLevel && expertiseLevel !== 'all') {
        const levelMap: Record<string, ('GRUNDLAGE' | 'FORTGESCHRITTEN' | 'EXPERTE')[]> = {
          'minimum_grundlage': ['GRUNDLAGE', 'FORTGESCHRITTEN', 'EXPERTE'],
          'minimum_fortgeschritten': ['FORTGESCHRITTEN', 'EXPERTE'],
          'minimum_experte': ['EXPERTE']
        };
        
        const allowedLevels = levelMap[expertiseLevel];
        if (allowedLevels) {
          topicIdFilter.expertiseLevel = { in: allowedLevels };
        }
      }

      where.topics = {
        some: topicIdFilter
      };
    } else if (topic) {
      // Filter by topic if provided (name search) - only if topicId is not set
      const topicFilter: any = {
        topic: {
          name: {
            contains: topic
          }
        }
      };

      // Add expertise level filter if provided
      if (expertiseLevel && expertiseLevel !== 'all') {
        const levelMap: Record<string, ('GRUNDLAGE' | 'FORTGESCHRITTEN' | 'EXPERTE')[]> = {
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
        some: topicFilter
      };
    }

    // Filter by location if provided
    // Priority: locationId (specific location) over location (country code)
    if (locationId) {
      // Get the location details to filter trainers by distance
      const locationData = await prisma.location.findUnique({
        where: { id: parseInt(locationId) },
        include: { country: true }
      });
      
      if (locationData && locationData.latitude && locationData.longitude) {
        // Filter trainers who can travel to this location
        // We'll filter by trainers who have a travel radius and are within that radius
        // This will be done after fetching trainers
        where.latitude = { not: null };
        where.longitude = { not: null };
        where.travelRadius = { not: null };
      } else if (locationData?.country) {
        // Fallback to country filter if location doesn't have coordinates
        where.country = {
          code: locationData.country.code
        };
      }
    } else if (location) {
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
        offeredTrainingTypes: true,
        country: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    // Get completed trainings count for each trainer (using TrainingRequest with ACCEPTED status and COMPLETED training status)
    const trainerIds = trainers.map(t => t.id);
    const completedRequests = await prisma.trainingRequest.findMany({
      where: {
        trainerId: { in: trainerIds },
        status: 'ACCEPTED',
        training: {
          status: 'COMPLETED'
        }
      },
      select: {
        trainerId: true
      }
    });

    // Create a map for quick lookup
    const completedMap = new Map<number, number>();
    completedRequests.forEach(req => {
      completedMap.set(req.trainerId, (completedMap.get(req.trainerId) || 0) + 1);
    });

    // Get average ratings for each trainer
    let ratings: Array<{ trainerId: number; rating: number }> = [];
    try {
      if (prisma.trainingRating) {
        ratings = await prisma.trainingRating.findMany({
          where: {
            trainerId: { in: trainerIds }
          },
          select: {
            trainerId: true,
            rating: true
          }
        });
      }
    } catch (error) {
      console.warn('Could not fetch ratings (Prisma client may need regeneration):', error);
      // Continue without ratings if the model isn't available yet
    }

    // Calculate average rating per trainer
    const ratingMap = new Map<number, { average: number; count: number }>();
    trainerIds.forEach(id => {
      const trainerRatings = ratings.filter(r => r.trainerId === id);
      if (trainerRatings.length > 0) {
        const average = trainerRatings.reduce((sum, r) => sum + r.rating, 0) / trainerRatings.length;
        ratingMap.set(id, { average, count: trainerRatings.length });
      }
    });

    // Get location for distance calculation (from trainingId or locationId)
    let trainingLocation: { 
      latitude: number | null; 
      longitude: number | null;
      type: 'ONLINE' | 'PHYSICAL' | null;
    } | null = null;
    
    if (locationId) {
      // Use locationId if provided (for location-based filtering)
      const locationData = await prisma.location.findUnique({
        where: { id: parseInt(locationId) },
        include: { country: true }
      });
      
      if (locationData) {
        trainingLocation = {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          type: locationData.type
        };
      }
    } else if (trainingId) {
      // Fallback to trainingId if locationId not provided
      const training = await prisma.training.findUnique({
        where: { id: parseInt(trainingId) },
        include: {
          location: {
            include: {
              country: true
            }
          }
        }
      });

      if (training && training.location) {
        trainingLocation = {
          latitude: training.location.latitude,
          longitude: training.location.longitude,
          type: training.location.type
        };
      }
    }

    // Format the response
    const formattedTrainers = trainers.map(trainer => {
      // Calculate distance for PHYSICAL locations
      let distanceInfo: { isWithinRadius: boolean; distance: number | null } | null = null;
      let onlineTrainingInfo: { offersOnline: boolean } | null = null;
      
      if (trainingLocation) {
        if (trainingLocation.type === 'PHYSICAL' && trainingLocation.latitude && trainingLocation.longitude && trainer.latitude && trainer.longitude && trainer.travelRadius) {
          // Physical location: check distance
          distanceInfo = checkWithinRadius(
            trainer.latitude,
            trainer.longitude,
            trainer.travelRadius,
            trainingLocation.latitude,
            trainingLocation.longitude
          );
        } else if (trainingLocation.type === 'ONLINE') {
          // Online location: check if trainer offers online training
          const offersOnline = trainer.offeredTrainingTypes?.some(tt => tt.type === 'ONLINE') || false;
          onlineTrainingInfo = { offersOnline };
        }
      }

      return {
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
        topicsWithLevels: trainer.topics?.map(t => ({
          name: t.topic.name,
          level: t.expertiseLevel
        })) || [],
        offeredTrainingTypes: trainer.offeredTrainingTypes?.map(tt => tt.type) || [],
        travelRadius: trainer.travelRadius,
        completedTrainings: completedMap.get(trainer.id) || 0,
        isCompany: trainer.isCompany,
        companyName: trainer.companyName,
        averageRating: ratingMap.get(trainer.id)?.average || null,
        ratingCount: ratingMap.get(trainer.id)?.count || 0,
        // Distance information (for PHYSICAL locations)
        distanceInfo: distanceInfo ? {
          isWithinRadius: distanceInfo.isWithinRadius,
          distance: distanceInfo.distance
        } : null,
        // Online training information (for ONLINE locations)
        onlineTrainingInfo: onlineTrainingInfo
      };
    });

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
