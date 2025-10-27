import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const trainingId = parseInt(params.id);

    if (isNaN(trainingId)) {
      return NextResponse.json(
        { error: 'Invalid training ID' },
        { status: 400 }
      );
    }

    const training = await prisma.training.findUnique({
      where: {
        id: trainingId
      },
      include: {
        topic: true,
        company: {
          select: {
            id: true,
            companyName: true,
            contactName: true
          }
        },
        requests: {
          where: {
            status: 'ACCEPTED'
          },
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
      }
    });

    if (!training) {
      return NextResponse.json(
        { error: 'Training not found' },
        { status: 404 }
      );
    }

    // Find the accepted trainer request
    const acceptedRequest = training.requests.find(r => r.status === 'ACCEPTED');

    // Transform to match frontend expectations
    const transformedTraining = {
      id: training.id,
      title: training.title,
      topicName: training.topic.name,
      date: training.startDate.toISOString(),
      endTime: new Date(`${training.startDate.toISOString().split('T')[0]}T${training.endTime}`).toISOString(),
      location: training.location,
      participants: training.participants,
      status: training.status.toLowerCase(),
      description: training.description,
      trainerNotes: null, // Not available in current schema
      materials: [], // Not available in current schema
      dailyRate: training.dailyRate,
      startTime: training.startTime,
      endDate: training.endDate.toISOString(),
      company: training.company,
      assignedTrainer: acceptedRequest ? {
        id: acceptedRequest.trainer.id,
        firstName: acceptedRequest.trainer.firstName,
        lastName: acceptedRequest.trainer.lastName,
        fullName: `${acceptedRequest.trainer.firstName} ${acceptedRequest.trainer.lastName}`
      } : null
    };

    return NextResponse.json(transformedTraining);
  } catch (error) {
    console.error('Error fetching training details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch training details' },
      { status: 500 }
    );
  }
}
