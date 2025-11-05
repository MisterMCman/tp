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
      const transformedTrainings = trainings.map(training => {
        // Find the accepted trainer request
        const acceptedRequest = training.requests.find(r => r.status === 'ACCEPTED');
        
        const assignedTrainer = acceptedRequest ? {
          id: acceptedRequest.trainer.id,
          firstName: acceptedRequest.trainer.firstName,
          lastName: acceptedRequest.trainer.lastName,
          fullName: `${acceptedRequest.trainer.firstName} ${acceptedRequest.trainer.lastName}`
        } : null;

        return {
          id: training.id,
          title: training.title,
          topicName: training.topic.name,
          date: training.startDate.toISOString(),
          endTime: new Date(`${training.startDate.toISOString().split('T')[0]}T${training.endTime}`).toISOString(),
          location: training.location,
          participants: training.participantCount,
          status: training.status.toLowerCase(),
          description: training.description,
          trainerNotes: null,
          materials: [],
          dailyRate: training.dailyRate,
          startTime: training.startTime,
          endDate: training.endDate.toISOString(),
          requestCount: training.requests.length,
          acceptedRequests: training.requests.filter(r => r.status === 'ACCEPTED').length,
          assignedTrainer: assignedTrainer
        };
      });

      return NextResponse.json(transformedTrainings);
    } else if (type === 'available') {
      // Get trainings without assigned trainers for sending requests
      const trainings = await prisma.training.findMany({
        where: {
          status: 'PUBLISHED',
          requests: {
            none: {
              status: 'ACCEPTED'
            }
          }
        },
        include: {
          topic: true,
          company: {
            select: {
              id: true,
              companyName: true,
              firstName: true,
              lastName: true
            }
          },
          requests: {
            select: {
              id: true,
              status: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const availableTrainings = trainings.map(training => ({
        id: training.id,
        title: training.title,
        topicName: training.topic.name,
        date: training.startDate.toISOString(),
        endTime: new Date(`${training.startDate.toISOString().split('T')[0]}T${training.endTime}`).toISOString(),
        location: training.location,
        participants: training.participantCount,
        dailyRate: training.dailyRate,
        description: training.description,
        company: training.company,
        requestCount: training.requests.length
      }));

      return NextResponse.json(availableTrainings);
    } else if (trainerId) {
      // Fetch trainings for trainer via TrainingRequest with ACCEPTED status
      const now = new Date();

      const trainingRequests = await prisma.trainingRequest.findMany({
        where: {
          trainerId: parseInt(trainerId),
          status: 'ACCEPTED',
          training: type === 'upcoming'
            ? { startDate: { gte: now } }
            : { startDate: { lt: now } }
        },
        include: {
          training: {
            include: {
              topic: true,
              company: {
                select: {
                  id: true,
                  companyName: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        },
        orderBy: {
          training: {
            startDate: type === 'upcoming' ? 'asc' : 'desc'
          }
        }
      });

      // Transform the data to match frontend expectations
      const trainings = trainingRequests.map(request => ({
        id: request.training.id,
        title: request.training.title,
        topicName: request.training.topic?.name || 'Unknown',
        date: request.training.startDate.toISOString(),
        endTime: new Date(`${request.training.endDate.toISOString().split('T')[0]}T${request.training.endTime}`).toISOString(),
        location: request.training.location,
        participants: request.training.participantCount,
        status: type === 'upcoming' ? 'confirmed' : 'completed',
        description: request.training.description,
        trainerNotes: request.message,
        materials: [],
        dailyRate: request.training.dailyRate,
        startTime: request.training.startTime,
        endDate: request.training.endDate.toISOString(),
        assignedTrainer: {
          id: parseInt(trainerId),
          firstName: '',
          lastName: '',
          fullName: 'You'
        },
        company: request.training.company
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
      type,
      location,
      locationStreet,
      locationHouseNumber,
      locationZipCode,
      locationCity,
      locationCountryId,
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
        type: type || 'ONLINE',
        location,
        locationStreet: (type === 'HYBRID' || type === 'VOR_ORT') ? locationStreet : null,
        locationHouseNumber: (type === 'HYBRID' || type === 'VOR_ORT') ? locationHouseNumber : null,
        locationZipCode: (type === 'HYBRID' || type === 'VOR_ORT') ? locationZipCode : null,
        locationCity: (type === 'HYBRID' || type === 'VOR_ORT') ? locationCity : null,
        locationCountryId: (type === 'HYBRID' || type === 'VOR_ORT') && locationCountryId ? parseInt(locationCountryId) : null,
        participantCount: parseInt(participants),
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