import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // In a real app, you'd get the trainer ID from the authenticated session
    // For now, we'll use the trainer ID from query params or default to 1
    const { searchParams } = new URL(request.url);
    const trainerId = searchParams.get('trainerId') || '1';

    const inquiries = await prisma.inquiry.findMany({
      where: {
        trainerId: parseInt(trainerId)
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
        createdAt: 'desc'
      }
    });

    // Transform the data to match our frontend interface
    const trainingRequests = inquiries.map(inquiry => ({
      id: inquiry.id,
      courseTitle: inquiry.event.course.title,
      topicName: inquiry.event.course.topic?.name || 'Unknown',
      date: inquiry.event.date.toISOString(),
      endTime: inquiry.event.endTime.toISOString(),
      location: inquiry.event.location,
      participants: inquiry.event.participants,
      originalPrice: inquiry.originalPrice,
      proposedPrice: inquiry.proposedPrice,
      counterPrice: inquiry.counterPrice,
      message: inquiry.message,
      status: inquiry.status.toLowerCase(),
      createdAt: inquiry.createdAt.toISOString(),
      updatedAt: inquiry.updatedAt.toISOString()
    }));

    return NextResponse.json(trainingRequests);
  } catch (error) {
    console.error('Error fetching training requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch training requests' },
      { status: 500 }
    );
  }
} 