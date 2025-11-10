import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserData } from '@/lib/session';
import { TrainingRequestStatus } from '@prisma/client';

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
            users: {
              where: {
                role: 'ADMIN',
                isActive: true
              },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              },
              take: 1
            }
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

    // Find the booked trainer request (GEBUCHT status - fully booked)
    // Also check for ACCEPTED as fallback (for backward compatibility with old data)
    const bookedRequest = training.requests.find(r => 
      r.status === TrainingRequestStatus.GEBUCHT
    ) || training.requests.find(r => 
      r.status === TrainingRequestStatus.ACCEPTED
    );
    
    // Determine assigned trainer based on user type and permissions
    let assignedTrainer = null;
    
    if (bookedRequest && bookedRequest.trainer) {
      // If user is a company, they can always see the assigned trainer
      if (currentUser && currentUser.userType === 'TRAINING_COMPANY') {
        assignedTrainer = {
          id: bookedRequest.trainer.id,
          firstName: bookedRequest.trainer.firstName,
          lastName: bookedRequest.trainer.lastName,
          fullName: `${bookedRequest.trainer.firstName} ${bookedRequest.trainer.lastName}`
        };
      }
      // If user is a trainer, only show assigned trainer if it's them
      else if (currentUser && currentUser.userType === 'TRAINER' && Number(currentUser.id) === bookedRequest.trainer.id) {
        assignedTrainer = {
          id: bookedRequest.trainer.id,
          firstName: bookedRequest.trainer.firstName,
          lastName: bookedRequest.trainer.lastName,
          fullName: `${bookedRequest.trainer.firstName} ${bookedRequest.trainer.lastName}`
        };
      }
      // If user is not logged in or not the assigned trainer, don't show assigned trainer info
    }

    // Separate booked trainer (GEBUCHT or ACCEPTED) from requested trainers (PENDING/ACCEPTED but not booked)
    const bookedRequestForDetails = training.requests.find(r => 
      r.status === TrainingRequestStatus.GEBUCHT
    ) || training.requests.find(r => 
      r.status === TrainingRequestStatus.ACCEPTED
    );
    
    const bookedTrainer = bookedRequestForDetails ? {
      id: bookedRequestForDetails.trainer.id,
      firstName: bookedRequestForDetails.trainer.firstName,
      lastName: bookedRequestForDetails.trainer.lastName,
      fullName: `${bookedRequestForDetails.trainer.firstName} ${bookedRequestForDetails.trainer.lastName}`,
      email: bookedRequestForDetails.trainer.email || '',
      price: bookedRequestForDetails.counterPrice || training.dailyRate
    } : null;

    // Transform requests to include trainer info and status
    // Exclude booked trainers from requested list
    const requestedTrainers = training.requests
      .filter(request => {
        return request.status !== TrainingRequestStatus.GEBUCHT && request.status !== TrainingRequestStatus.ACCEPTED;
      })
      .map(request => ({
        id: request.trainer.id,
        trainingRequestId: request.id,
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
    
    // Also include ACCEPTED requests (trainer accepted, waiting for company) in requested trainers
    const acceptedRequests = training.requests
      .filter(request => {
        return request.status === TrainingRequestStatus.ACCEPTED && (!bookedRequestForDetails || request.id !== bookedRequestForDetails.id);
      })
      .map(request => ({
        id: request.trainer.id,
        trainingRequestId: request.id,
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
    
    // Combine pending and accepted (but not booked) requests
    const allRequestedTrainers = [...requestedTrainers, ...acceptedRequests];

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

    // Transform company to include user data
    const transformedCompany = training.company ? {
      ...training.company,
      firstName: training.company.users?.[0]?.firstName || '',
      lastName: training.company.users?.[0]?.lastName || '',
      email: training.company.users?.[0]?.email || '',
      users: undefined // Remove users array from response
    } : null;

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
      company: transformedCompany,
      assignedTrainer: assignedTrainer,
      bookedTrainer: bookedTrainer,
      requestedTrainers: allRequestedTrainers
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
