import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get trainer ID from query params - in production this would come from session
    const { searchParams } = new URL(request.url);
    const trainerId = searchParams.get('trainerId') || '1';

    const now = new Date();
    
    // Fetch upcoming trainings (next 3 upcoming trainings)
    const upcomingTrainings = await prisma.inquiry.findMany({
      where: {
        trainerId: parseInt(trainerId),
        status: 'ACCEPTED',
        event: {
          date: { gte: now }
        }
      },
      include: {
        event: {
          include: {
            course: {
              include: {
                topic: true
              }
            }
          }
        }
      },
      orderBy: {
        event: {
          date: 'asc'
        }
      },
      take: 3 // Limit to next 3 trainings for dashboard
    });

    // Count pending requests
    const pendingRequestsCount = await prisma.inquiry.count({
      where: {
        trainerId: parseInt(trainerId),
        status: 'PENDING'
      }
    });

    // Transform upcoming trainings data
    const trainings = upcomingTrainings.map(inquiry => ({
      id: inquiry.event.id,
      title: inquiry.event.course.title,
      topicName: inquiry.event.course.topic?.name || 'Unknown',
      date: inquiry.event.date.toISOString(),
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