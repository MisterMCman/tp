import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserData } from '@/lib/session';

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

    // Get current user from session (works for both trainers and companies)
    const currentUser = getUserData();

    const training = await prisma.training.findUnique({
      where: {
        id: trainingId
      },
      include: {
        topic: true,
        location: {
          include: {
            country: true
          }
        },
        company: {
          select: {
            id: true,
            companyName: true,
            firstName: true,
            lastName: true
          }
        },
        requests: {
          include: {
            trainer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
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
    const acceptedRequest = training.requests.find(r => 
      String(r.status).toUpperCase() === 'ACCEPTED'
    );
    
    // Determine assigned trainer based on user type and permissions
    let assignedTrainer = null;
    
    if (acceptedRequest && acceptedRequest.trainer) {
      // If user is a company, they can always see the assigned trainer
      if (currentUser && currentUser.userType === 'TRAINING_COMPANY') {
        assignedTrainer = {
          id: acceptedRequest.trainer.id,
          firstName: acceptedRequest.trainer.firstName,
          lastName: acceptedRequest.trainer.lastName,
          fullName: `${acceptedRequest.trainer.firstName} ${acceptedRequest.trainer.lastName}`
        };
      }
      // If user is a trainer, only show assigned trainer if it's them
      else if (currentUser && currentUser.userType === 'TRAINER' && Number(currentUser.id) === acceptedRequest.trainer.id) {
        assignedTrainer = {
          id: acceptedRequest.trainer.id,
          firstName: acceptedRequest.trainer.firstName,
          lastName: acceptedRequest.trainer.lastName,
          fullName: `${acceptedRequest.trainer.firstName} ${acceptedRequest.trainer.lastName}`
        };
      }
      // If user is not logged in or not the assigned trainer, don't show assigned trainer info
    }

    // Transform requests to include trainer info and status
    const requestedTrainers = training.requests.map(request => ({
      id: request.trainer.id,
      firstName: request.trainer.firstName,
      lastName: request.trainer.lastName,
      email: request.trainer.email || '',
      status: request.status.toLowerCase(),
      counterPrice: request.counterPrice,
      companyCounterPrice: request.companyCounterPrice,
      trainerAccepted: request.trainerAccepted,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString()
    }));

    // Get location display string from Location table
    let locationDisplay = 'Kein Ort angegeben';
    if (training.location) {
      if (training.location.type === 'ONLINE') {
        locationDisplay = training.location.name || 'Online';
      } else {
        locationDisplay = training.location.name || 
          (training.location.city ? `${training.location.city}${training.location.street ? `, ${training.location.street}` : ''}` : 'Vor Ort');
      }
    }

    // Transform to match frontend expectations
    const transformedTraining = {
      id: training.id,
      title: training.title,
      topicName: training.topic.name,
      date: training.startDate.toISOString(),
      endTime: new Date(`${training.startDate.toISOString().split('T')[0]}T${training.endTime}`).toISOString(),
      location: locationDisplay,
      participants: training.participantCount,
      status: training.status.toLowerCase(),
      description: training.description,
      trainerNotes: null, // Not available in current schema
      materials: [], // Not available in current schema
      dailyRate: training.dailyRate,
      startTime: training.startTime,
      endDate: training.endDate.toISOString(),
      company: training.company,
      assignedTrainer: assignedTrainer,
      requestedTrainers: requestedTrainers
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
