import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserData } from '@/lib/session';
import { geocodeAddress } from '@/lib/geocoding';
import { TrainingRequestStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trainerId = searchParams.get('trainerId');
    const companyId = searchParams.get('companyId');
    const type = searchParams.get('type') || 'upcoming'; // 'upcoming' or 'past'

    // Get current user for authorization
    const currentUser = getUserData();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (companyId) {
      // Verify that companies can only see their own trainings
      const userCompanyId = (currentUser.companyId || currentUser.id) as number;
      if (currentUser.userType === 'TRAINING_COMPANY' && userCompanyId !== parseInt(companyId)) {
        return NextResponse.json(
          { error: 'Unauthorized: You can only view your own trainings' },
          { status: 403 }
        );
      }
      // Fetch trainings created by company
      const trainings = await prisma.training.findMany({
        where: {
          companyId: parseInt(companyId),
          status: type === 'upcoming' ? { not: 'COMPLETED' } : 'COMPLETED'
        },
        include: {
          topic: true,
          location: {
            include: {
              country: true
            }
          },
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
        // Find the booked trainer request (GEBUCHT status - fully booked)
        const bookedRequest = training.requests.find(r => r.status === TrainingRequestStatus.GEBUCHT);
        // Find accepted requests (trainer accepted, waiting for company)
        const acceptedRequests = training.requests.filter(r => r.status === TrainingRequestStatus.ACCEPTED);
        // Find pending requests (not yet accepted by trainer)
        const pendingRequests = training.requests.filter(r => r.status === TrainingRequestStatus.PENDING);
        
        // Use booked request if available, otherwise null
        const assignedTrainer = bookedRequest ? {
          id: bookedRequest.trainer.id,
          firstName: bookedRequest.trainer.firstName,
          lastName: bookedRequest.trainer.lastName,
          fullName: `${bookedRequest.trainer.firstName} ${bookedRequest.trainer.lastName}`
        } : null;

        // Get trainer price from booked request (counterPrice or dailyRate)
        const trainerPrice = bookedRequest 
          ? (bookedRequest.counterPrice || training.dailyRate)
          : null;

        // Get requested trainers (pending + accepted requests - trainer accepted but not yet booked)
        const requestedTrainers = [...pendingRequests, ...acceptedRequests].map(req => ({
          id: req.trainer.id,
          firstName: req.trainer.firstName,
          lastName: req.trainer.lastName,
          fullName: `${req.trainer.firstName} ${req.trainer.lastName}`
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

        return {
          id: training.id,
          title: training.title,
          topicName: training.topic.name,
          date: training.startDate.toISOString(),
          endTime: new Date(`${training.startDate.toISOString().split('T')[0]}T${training.endTime}`).toISOString(),
          location: locationDisplay,
          participants: training.participantCount,
          status: training.status.toLowerCase(),
          description: training.description,
          trainerNotes: null,
          materials: [],
          dailyRate: training.dailyRate,
          startTime: training.startTime,
          endDate: training.endDate.toISOString(),
          requestCount: training.requests.length,
          acceptedRequests: training.requests.filter(r => r.status === TrainingRequestStatus.ACCEPTED || r.status === TrainingRequestStatus.GEBUCHT).length,
          assignedTrainer: assignedTrainer,
          trainerPrice: trainerPrice,
          requestedTrainers: requestedTrainers,
          hasAcceptedTrainer: !!bookedRequest
        };
      });

      return NextResponse.json(transformedTrainings);
    } else if (type === 'available') {
      // Get trainings without booked trainers for sending requests
      const trainings = await prisma.training.findMany({
        where: {
          status: 'PUBLISHED',
          requests: {
            none: {
              status: TrainingRequestStatus.GEBUCHT
            }
          }
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
              companyName: true
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

      const availableTrainings = trainings.map(training => {
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

        return {
          id: training.id,
          title: training.title,
          topicName: training.topic.name,
          date: training.startDate.toISOString(),
          endTime: new Date(`${training.startDate.toISOString().split('T')[0]}T${training.endTime}`).toISOString(),
          location: locationDisplay,
          participants: training.participantCount,
          dailyRate: training.dailyRate,
          description: training.description,
          company: training.company,
          requestCount: training.requests.length
        };
      });

      return NextResponse.json(availableTrainings);
    } else if (trainerId) {
      // Verify that trainers can only see their own trainings
      if (currentUser.userType === 'TRAINER' && Number(currentUser.id) !== parseInt(trainerId)) {
        return NextResponse.json(
          { error: 'Unauthorized: You can only view your own trainings' },
          { status: 403 }
        );
      }
      
      // Fetch trainings for trainer via TrainingRequest with GEBUCHT status (fully booked)
      const now = new Date();

      const trainingRequests = await prisma.trainingRequest.findMany({
        where: {
          trainerId: parseInt(trainerId),
          status: TrainingRequestStatus.GEBUCHT,
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
                  companyName: true
                },
                include: {
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
      const trainings = trainingRequests.map(request => {
        // Get location display string from Location table
        let locationDisplay = 'Kein Ort angegeben';
        if (request.training.location) {
          if (request.training.location.type === 'ONLINE') {
            locationDisplay = request.training.location.name || 'Online';
          } else {
            locationDisplay = request.training.location.name || 
              (request.training.location.city ? `${request.training.location.city}${request.training.location.street ? `, ${request.training.location.street}` : ''}` : 'Vor Ort');
          }
        }

        return {
          id: request.training.id,
          title: request.training.title,
          topicName: request.training.topic?.name || 'Unknown',
          date: request.training.startDate.toISOString(),
          endTime: new Date(`${request.training.endDate.toISOString().split('T')[0]}T${request.training.endTime}`).toISOString(),
          location: locationDisplay,
          participants: request.training.participantCount,
          status: type === 'upcoming' ? 'confirmed' : 'completed',
          description: request.training.description,
          trainerNotes: null, // Message field removed - notes should be in Message table now
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
          company: {
            id: request.training.company.id,
            name: request.training.company.companyName,
            firstName: request.training.company.users?.[0]?.firstName || '',
            lastName: request.training.company.users?.[0]?.lastName || '',
            email: request.training.company.users?.[0]?.email || ''
          }
        };
      });

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
    // Check permissions - only ADMIN and USER can create trainings
    const currentUser = getUserData();
    if (!currentUser || currentUser.userType !== 'TRAINING_COMPANY') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // VIEWER role cannot create trainings - only ADMIN and EDITOR can
    if (currentUser.role === 'VIEWER') {
      return NextResponse.json(
        { error: 'Viewers cannot create trainings' },
        { status: 403 }
      );
    }
    
    // Ensure role is ADMIN or EDITOR
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'EDITOR') {
      return NextResponse.json(
        { error: 'Only admins and editors can create trainings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      topicId,
      startDate,
      endDate,
      startTime,
      endTime,
      type,
      locationId, // ID of existing location
      // Location creation data (if creating new location)
      locationName,
      locationType, // 'ONLINE' or 'PHYSICAL'
      onlinePlatform,
      onlineLink,
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

    // Ensure user can only create trainings for their own company
    const userCompanyId = (currentUser.companyId || currentUser.id) as number;
    if (parseInt(companyId) !== userCompanyId) {
      return NextResponse.json(
        { error: 'Unauthorized: Can only create trainings for your own company' },
        { status: 403 }
      );
    }

    // Create or use location
    let finalLocationId: number | null = null;

    if (locationId) {
      // Use existing location - verify it belongs to the company
      const existingLocation = await prisma.location.findFirst({
        where: {
          id: parseInt(locationId),
          companyId: userCompanyId
        }
      });

      if (!existingLocation) {
        return NextResponse.json(
          { error: 'Location not found or unauthorized' },
          { status: 404 }
        );
      }

      finalLocationId = parseInt(locationId);
    } else if (locationName && locationType) {
      // Create new location (one-time address - will have companyId set but user can choose to save it later)
      const locationData: any = {
        name: locationName,
        type: locationType === 'ONLINE' ? 'ONLINE' : 'PHYSICAL',
        companyId: userCompanyId, // Set companyId so it appears in their locations list
      };

      if (locationType === 'ONLINE') {
        locationData.onlinePlatform = onlinePlatform || 'OTHER';
        locationData.onlineLink = onlineLink;
      } else {
        // PHYSICAL location
        locationData.street = locationStreet;
        locationData.houseNumber = locationHouseNumber;
        locationData.zipCode = locationZipCode;
        locationData.city = locationCity;
        locationData.countryId = locationCountryId ? parseInt(locationCountryId) : null;

        // Geocode physical location
        if (locationStreet && locationCity) {
          const country = locationCountryId 
            ? await prisma.country.findUnique({ where: { id: parseInt(locationCountryId) } })
            : null;

          const geocodeResult = await geocodeAddress(
            locationStreet,
            locationHouseNumber,
            locationZipCode,
            locationCity,
            country?.name
          );

          if (geocodeResult) {
            locationData.latitude = geocodeResult.latitude;
            locationData.longitude = geocodeResult.longitude;
          }
        }
      }

      const newLocation = await prisma.location.create({
        data: locationData
      });

      finalLocationId = newLocation.id;
    }

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
        locationId: finalLocationId,
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