import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserData } from '@/lib/session';

// GET - Get ratings for a trainer (only visible to companies)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userData = getUserData();
    
    if (!userData || userData.userType !== 'TRAINING_COMPANY') {
      return NextResponse.json(
        { error: 'Unauthorized: Only companies can view ratings' },
        { status: 403 }
      );
    }

    const trainerId = parseInt(params.id);

    // Get all ratings for this trainer
    let ratings: any[] = [];
    try {
      if (prisma.trainingRating) {
        ratings = await prisma.trainingRating.findMany({
          where: {
            trainerId
          },
          include: {
            topic: {
              select: {
                id: true,
                name: true
              }
            },
            training: {
              select: {
                id: true,
                title: true,
                startDate: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      }
    } catch (error) {
      console.warn('Could not fetch ratings (Prisma client may need regeneration):', error);
      // Return empty ratings if the model isn't available yet
      return NextResponse.json({
        averageRating: null,
        totalRatings: 0,
        ratingsByTopic: [],
        allRatings: []
      });
    }

    // Calculate average rating
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : null;

    // Group ratings by topic
    const ratingsByTopic: Record<number, {
      topic: { id: number; name: string };
      ratings: typeof ratings;
      average: number;
    }> = {};

    ratings.forEach(rating => {
      if (!ratingsByTopic[rating.topicId]) {
        ratingsByTopic[rating.topicId] = {
          topic: rating.topic,
          ratings: [],
          average: 0
        };
      }
      ratingsByTopic[rating.topicId].ratings.push(rating);
    });

    // Calculate average for each topic
    Object.keys(ratingsByTopic).forEach(topicId => {
      const topicRatings = ratingsByTopic[parseInt(topicId)].ratings;
      ratingsByTopic[parseInt(topicId)].average = topicRatings.length > 0
        ? topicRatings.reduce((sum, r) => sum + r.rating, 0) / topicRatings.length
        : 0;
    });

    return NextResponse.json({
      averageRating,
      totalRatings: ratings.length,
      ratingsByTopic: Object.values(ratingsByTopic),
      allRatings: ratings
    });
  } catch (error) {
    console.error('Error fetching trainer ratings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ratings' },
      { status: 500 }
    );
  }
}

