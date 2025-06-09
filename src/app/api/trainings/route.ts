import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get trainer ID from query params - in production this would come from session
    const { searchParams } = new URL(request.url);
    const trainerId = searchParams.get('trainerId') || '1';
    const type = searchParams.get('type') || 'upcoming'; // 'upcoming' or 'past'

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
      materials: [] // Could be expanded later to include actual materials
    }));

    return NextResponse.json(trainings);
  } catch (error) {
    console.error('Error fetching trainings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trainings' },
      { status: 500 }
    );
  }
} 