import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTrainerData } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const currentUser = getTrainerData();
    
    if (!currentUser || currentUser.userType !== 'TRAINER') {
      return NextResponse.json(
        { error: 'Nicht authentifiziert oder kein Trainer-Account' },
        { status: 401 }
      );
    }

    const trainerId = currentUser.id as number;

    const now = new Date();
    
    // Fetch upcoming trainings (next 3 upcoming trainings) via TrainingRequest
    const upcomingTrainings = await prisma.trainingRequest.findMany({
      where: {
        trainerId: trainerId,
        status: 'ACCEPTED',
        training: {
          startDate: { gte: now }
        }
      },
      include: {
        training: {
          include: {
            topic: true,
            course: true
          }
        }
      },
      orderBy: {
        training: {
          startDate: 'asc'
        }
      },
      take: 3 // Limit to next 3 trainings for dashboard
    });

    // Count pending requests
    const pendingRequestsCount = await prisma.trainingRequest.count({
      where: {
        trainerId: trainerId,
        status: 'PENDING'
      }
    });

    // Transform upcoming trainings data
    const trainings = upcomingTrainings.map(request => ({
      id: request.training.id,
      title: request.training.title,
      topicName: request.training.topic?.name || 'Unknown',
      date: request.training.startDate.toISOString(),
      status: 'confirmed'
    }));

    return NextResponse.json({
      upcomingTrainings: trainings,
      pendingRequests: pendingRequestsCount
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
} 