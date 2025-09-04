import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trainerId = searchParams.get('trainerId');
    const companyId = searchParams.get('companyId');
    const type = searchParams.get('type') || 'upcoming'; // 'upcoming' or 'past'

    if (companyId) {
      // Fetch trainings created by company
      const trainings = await prisma.training.findMany({
        where: {
          companyId: parseInt(companyId),
          status: type === 'upcoming' ? { not: 'COMPLETED' } : 'COMPLETED'
        },
        include: {
          topic: true,
          requests: {
            include: {
              trainer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        },
        orderBy: {
          startDate: type === 'upcoming' ? 'asc' : 'desc'
        }
      });

      // Transform to match frontend expectations
      const transformedTrainings = trainings.map(training => ({
        id: training.id,
        title: training.title,
        topicName: training.topic.name,
        date: training.startDate.toISOString(),
        endTime: new Date(`${training.startDate.toISOString().split('T')[0]}T${training.endTime}`).toISOString(),
        location: training.location,
        participants: training.participants,
        status: training.status.toLowerCase(),
        description: training.description,
        trainerNotes: null,
        materials: [],
        dailyRate: training.dailyRate,
        startTime: training.startTime,
        endDate: training.endDate.toISOString(),
        requestCount: training.requests.length,
        acceptedRequests: training.requests.filter(r => r.status === 'ACCEPTED').length
      }));

      return NextResponse.json(transformedTrainings);
    } else if (trainerId) {
      // Legacy: Fetch trainings for trainer (old system)
      const now = new Date();

      const inquiries = await prisma.inquiry.findMany({
        where: {
          trainerId: parseInt(trainerId),
          status: type === 'upcoming' ? 'ACCEPTED' : 'COMPLETED',
          event: type === 'upcoming'
            ? { date: { gte: now } }
            : { date: { lt: now } }
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
            date: type === 'upcoming' ? 'asc' : 'desc'
          }
        }
      });

      // Transform the data to match frontend expectations
      const trainings = inquiries.map(inquiry => ({
        id: inquiry.event.id,
        title: inquiry.event.course.title,
        topicName: inquiry.event.course.topic?.name || 'Unknown',
        date: inquiry.event.date.toISOString(),
        endTime: inquiry.event.endTime.toISOString(),
        location: inquiry.event.location,
        participants: inquiry.event.participants,
        status: type === 'upcoming' ? 'confirmed' : 'completed',
        description: inquiry.event.course.description,
        trainerNotes: inquiry.message,
        materials: []
      }));

      return NextResponse.json(trainings);
    } else {
      return NextResponse.json(
        { error: 'Either trainerId or companyId is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error fetching trainings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trainings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      topicId,
      startDate,
      endDate,
      startTime,
      endTime,
      location,
      participants,
      dailyRate,
      description,
      companyId
    } = body;

    // Create the training
    const training = await prisma.training.create({
      data: {
        title,
        topicId: parseInt(topicId),
        companyId: parseInt(companyId),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        startTime,
        endTime,
        location,
        participants: parseInt(participants),
        dailyRate: parseFloat(dailyRate),
        description,
        status: 'DRAFT'
      },
      include: {
        topic: true
      }
    });

    return NextResponse.json(training);
  } catch (error) {
    console.error('Error creating training:', error);
    return NextResponse.json(
      { error: 'Failed to create training' },
      { status: 500 }
    );
  }
} 