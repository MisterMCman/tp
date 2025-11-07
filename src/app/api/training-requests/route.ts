import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserData } from '@/lib/session';
import { TrainingRequestStatus, TrainingStatus } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trainingId, trainerIds, trainingIds, trainerId, message } = body;

    // Handle new format: multiple training IDs for one trainer
    if (trainingIds && trainerId) {
      const trainingRequests = await Promise.all(
        trainingIds.map(async (trainingId: number) => {
          // Check if request already exists
          const existing = await prisma.trainingRequest.findUnique({
            where: {
              trainingId_trainerId: {
                trainingId: trainingId,
                trainerId: parseInt(trainerId)
              }
            }
          });

          if (existing) {
            // Return existing request instead of creating duplicate
            return await prisma.trainingRequest.findUnique({
              where: { id: existing.id },
              include: {
                trainer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                },
                training: {
                  include: {
                    topic: true,
                    company: {
                      select: {
                        id: true,
                        companyName: true,
                        firstName: true,
                        lastName: true,
                        email: true
                      }
                    }
                  }
                }
              }
            });
          }

          return await prisma.trainingRequest.create({
            data: {
              trainingId: trainingId,
              trainerId: parseInt(trainerId),
              status: TrainingRequestStatus.PENDING
            },
            include: {
              trainer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              },
              training: {
                include: {
                  topic: true,
                  company: {
                    select: {
                      id: true,
                      companyName: true,
                      firstName: true,
                      lastName: true,
                      email: true
                    }
                  }
                }
              }
            }
          });
        })
      );

      // Update training statuses to PUBLISHED when requests are sent
      await Promise.all(
        trainingIds.map(async (id: number) => {
          await prisma.training.update({
            where: { id: id },
            data: { status: TrainingStatus.PUBLISHED }
          });
        })
      );

      return NextResponse.json({
        success: true,
        requests: trainingRequests,
        message: `Training requests sent for ${trainingIds.length} training(s)`
      });
    }

    // Handle old format: single training ID for multiple trainers
    if (trainingId && trainerIds) {
      const trainingRequests = await Promise.all(
        trainerIds.map(async (trainerId: number) => {
          // Check if request already exists
          const existing = await prisma.trainingRequest.findUnique({
            where: {
              trainingId_trainerId: {
                trainingId: parseInt(trainingId),
                trainerId: trainerId
              }
            }
          });

          if (existing) {
            // Return existing request
            return await prisma.trainingRequest.findUnique({
              where: { id: existing.id },
              include: {
                trainer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                },
                training: {
                  include: {
                    topic: true,
                    company: {
                      select: {
                        id: true,
                        companyName: true,
                        firstName: true,
                        lastName: true,
                        email: true
                      }
                    }
                  }
                }
              }
            });
          }

          return await prisma.trainingRequest.create({
            data: {
              trainingId: parseInt(trainingId),
              trainerId: trainerId,
              status: TrainingRequestStatus.PENDING
            },
            include: {
              trainer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              },
              training: {
                include: {
                  topic: true,
                  company: {
                    select: {
                      id: true,
                      companyName: true,
                      firstName: true,
                      lastName: true,
                      email: true
                    }
                  }
                }
              }
            }
          });
        })
      );

      // Update training status to PUBLISHED when requests are sent
      await prisma.training.update({
        where: { id: parseInt(trainingId) },
        data: { status: TrainingStatus.PUBLISHED }
      });

      return NextResponse.json({
        success: true,
        requests: trainingRequests,
        message: `Training requests sent to ${trainerIds.length} trainer(s)`
      });
    }

    return NextResponse.json(
      { error: 'Invalid request format. Either provide trainingIds+trainerId or trainingId+trainerIds' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error creating training requests:', error);
    return NextResponse.json(
      { error: 'Failed to create training requests' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trainerId = searchParams.get('trainerId');
    const companyId = searchParams.get('companyId');
    const trainingId = searchParams.get('trainingId');

    // Get current user for authorization
    const currentUser = getUserData();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (companyId) {
      // Verify that companies can only see requests for their own trainings
      if (currentUser.userType === 'TRAINING_COMPANY' && Number(currentUser.id) !== parseInt(companyId)) {
        return NextResponse.json(
          { error: 'Unauthorized: You can only view requests for your own company' },
          { status: 403 }
        );
      }
      
      // Get all training requests for trainings owned by this company
      const requests = await prisma.trainingRequest.findMany({
        where: {
          training: {
            companyId: parseInt(companyId)
          }
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
                  lastName: true,
                  email: true,
                  logo: true
                }
              }
            }
          },
          trainer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profilePicture: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return NextResponse.json(requests);
    } else if (trainerId) {
      // Verify that trainers can only see their own requests
      if (currentUser.userType === 'TRAINER' && Number(currentUser.id) !== parseInt(trainerId)) {
        return NextResponse.json(
          { error: 'Unauthorized: You can only view your own requests' },
          { status: 403 }
        );
      }
      
      // Get training requests for a specific trainer
      const requests = await prisma.trainingRequest.findMany({
        where: {
          trainerId: parseInt(trainerId)
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
                  lastName: true,
                  email: true,
                  logo: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return NextResponse.json(requests);
    } else if (trainingId) {
      // Verify that companies can only see requests for their own trainings
      if (currentUser.userType === 'TRAINING_COMPANY') {
        const training = await prisma.training.findUnique({
          where: { id: parseInt(trainingId) },
          select: { companyId: true }
        });
        
        if (!training) {
          return NextResponse.json(
            { error: 'Training not found' },
            { status: 404 }
          );
        }
        
        if (training.companyId !== Number(currentUser.id)) {
          return NextResponse.json(
            { error: 'Unauthorized: You can only view requests for your own trainings' },
            { status: 403 }
          );
        }
      } else if (currentUser.userType === 'TRAINER') {
        // Trainers can only see requests for trainings they have a request for
        const trainerRequest = await prisma.trainingRequest.findFirst({
          where: {
            trainingId: parseInt(trainingId),
            trainerId: Number(currentUser.id)
          }
        });
        
        if (!trainerRequest) {
          return NextResponse.json(
            { error: 'Unauthorized: You can only view requests for trainings you are involved in' },
            { status: 403 }
          );
        }
      }
      
      // Get all requests for a specific training
      const requests = await prisma.trainingRequest.findMany({
        where: {
          trainingId: parseInt(trainingId)
        },
        include: {
          trainer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profilePicture: true,
              dailyRate: true,
              bio: true
            }
          },
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
          createdAt: 'desc'
        }
      });

      return NextResponse.json(requests);
    } else {
      return NextResponse.json(
        { error: 'Either trainerId or trainingId is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error fetching training requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch training requests' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, status, message, counterPrice, companyCounterPrice } = body;

    // Get current user for authorization
    const currentUser = getUserData();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // First, get the current request to understand the training context
    const currentRequest = await prisma.trainingRequest.findUnique({
      where: { id: parseInt(requestId) },
      include: {
        training: {
          include: {
            topic: true,
            company: true
          }
        },
        trainer: true
      }
    });

    if (!currentRequest) {
      return NextResponse.json(
        { error: 'Training request not found' },
        { status: 404 }
      );
    }

    // Authorization: Trainers can only update their own requests, companies can only update requests for their trainings
    if (currentUser.userType === 'TRAINER' && currentRequest.trainerId !== Number(currentUser.id)) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only update your own requests' },
        { status: 403 }
      );
    }
    
    if (currentUser.userType === 'TRAINING_COMPANY') {
      const training = await prisma.training.findUnique({
        where: { id: currentRequest.trainingId },
        select: { companyId: true }
      });
      
      if (!training || training.companyId !== Number(currentUser.id)) {
        return NextResponse.json(
          { error: 'Unauthorized: You can only update requests for your own trainings' },
          { status: 403 }
        );
      }
    }

    // Prevent counter offer updates if request is already ACCEPTED (locked)
    if (currentRequest.status === TrainingRequestStatus.ACCEPTED) {
      if (counterPrice !== undefined || companyCounterPrice !== undefined) {
        return NextResponse.json(
          { error: 'Cannot update counter offers: Request has already been accepted and is locked' },
          { status: 400 }
        );
      }
    }

    // Update the current request
    // Handle two-step acceptance: trainer accepts first, then company accepts
    const updateData: any = {};
    
    // If trainer is accepting, set trainerAccepted = true but keep status as PENDING
    if (currentUser.userType === 'TRAINER' && status === TrainingRequestStatus.ACCEPTED) {
      // Prevent duplicate accepts
      if (currentRequest.trainerAccepted) {
        return NextResponse.json(
          { error: 'You have already accepted this training request. Waiting for company response.' },
          { status: 400 }
        );
      }
      updateData.trainerAccepted = true;
      updateData.status = TrainingRequestStatus.PENDING; // Keep as PENDING until company accepts
    } 
    // If company is accepting and trainer has already accepted, then set status to ACCEPTED
    else if (currentUser.userType === 'TRAINING_COMPANY' && status === TrainingRequestStatus.ACCEPTED) {
      // If trainer already accepted, then fully accept
      if (currentRequest.trainerAccepted) {
        updateData.status = TrainingRequestStatus.ACCEPTED;
      } else {
        // Company accepting a counter offer or accepting before trainer - set status to ACCEPTED
        updateData.status = TrainingRequestStatus.ACCEPTED;
      }
    }
    // For other status changes (DECLINED, etc.), update status normally
    else {
      updateData.status = status;
    }
    
    // Only update counterPrice if it's explicitly provided in the request and status is PENDING
    // This allows trainers to send new counters to replace old ones (only latest is shown to company)
    if (counterPrice !== undefined) {
      if (currentRequest.status !== TrainingRequestStatus.PENDING) {
        return NextResponse.json(
          { error: 'Cannot send counter offer: Request must be pending' },
          { status: 400 }
        );
      }
      // Prevent counter offers if trainer has already accepted
      if (currentUser.userType === 'TRAINER' && currentRequest.trainerAccepted) {
        return NextResponse.json(
          { error: 'Cannot send counter offer: You have already accepted this request. Waiting for company response.' },
          { status: 400 }
        );
      }
      updateData.counterPrice = parseFloat(counterPrice);
    }
    
    // Only update companyCounterPrice if it's explicitly provided in the request and status is PENDING
    // This allows companies to send new counters to replace old ones (only latest is shown to trainer)
    if (companyCounterPrice !== undefined) {
      if (currentRequest.status !== TrainingRequestStatus.PENDING) {
        return NextResponse.json(
          { error: 'Cannot send counter offer: Request must be pending' },
          { status: 400 }
        );
      }
      updateData.companyCounterPrice = parseFloat(companyCounterPrice);
    }
    
    const updatedRequest = await prisma.trainingRequest.update({
      where: { id: parseInt(requestId) },
      data: updateData,
      include: {
        training: {
          include: {
            topic: true,
            company: true
          }
        },
        trainer: true
      }
    });

    // If a request is being fully accepted (status = ACCEPTED), automatically decline all other pending requests for the same training
    // Only do this when the final status is ACCEPTED (not just trainerAccepted)
    const finalStatus = updateData.status || updatedRequest.status;
    if (finalStatus === TrainingRequestStatus.ACCEPTED && currentRequest.status !== TrainingRequestStatus.ACCEPTED) {
      // Find all other pending requests for this training
      const otherPendingRequests = await prisma.trainingRequest.findMany({
        where: {
          trainingId: currentRequest.trainingId,
          id: { not: parseInt(requestId) },
          status: TrainingRequestStatus.PENDING
        },
        include: {
          trainer: true,
          training: {
            include: {
              topic: true,
              company: true
            }
          }
        }
      });

      // Decline all other pending requests
      if (otherPendingRequests.length > 0) {
        await prisma.trainingRequest.updateMany({
          where: {
            id: { in: otherPendingRequests.map(r => r.id) }
          },
          data: {
            status: TrainingRequestStatus.DECLINED
          }
        });

        // Send notifications to all declined trainers
        for (const declinedRequest of otherPendingRequests) {
          const declineMessage = `Ihre Anfrage für das Training "${currentRequest.training.title}" wurde abgelehnt, da ein anderer Trainer die Anfrage bereits angenommen hat.`;
          
          await prisma.message.create({
            data: {
              trainingRequestId: declinedRequest.id,
              senderId: currentRequest.training.companyId,
              senderType: 'TRAINING_COMPANY',
              recipientId: declinedRequest.trainerId,
              recipientType: 'TRAINER',
              subject: `Anfrage abgelehnt: ${currentRequest.training.title}`,
              message: declineMessage,
              isRead: false,
              messageType: 'NOTIFICATION'
            }
          });
        }
      }

      // Send notification to the accepted trainer
      const acceptMessage = `Herzlichen Glückwunsch! Ihre Anfrage für das Training "${currentRequest.training.title}" wurde angenommen. Sie können nun weitere Details im Dashboard einsehen.`;
      
      await prisma.message.create({
        data: {
          trainingRequestId: parseInt(requestId),
          senderId: currentRequest.training.companyId,
          senderType: 'TRAINING_COMPANY',
          recipientId: currentRequest.trainerId,
          recipientType: 'TRAINER',
          subject: `Anfrage angenommen: ${currentRequest.training.title}`,
          message: acceptMessage,
          isRead: false,
          messageType: 'NOTIFICATION'
        }
      });
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Error updating training request:', error);
    return NextResponse.json(
      { error: 'Failed to update training request' },
      { status: 500 }
    );
  }
}
