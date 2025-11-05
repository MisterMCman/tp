import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
              message: message || null,
              status: 'PENDING'
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
            data: { status: 'PUBLISHED' }
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
              message: message || null,
              status: 'PENDING'
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
        data: { status: 'PUBLISHED' }
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
    const trainingId = searchParams.get('trainingId');

    if (trainerId) {
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
    const { requestId, status, message, counterPrice } = body;

    const updatedRequest = await prisma.trainingRequest.update({
      where: { id: parseInt(requestId) },
      data: {
        status: status,
        message: message || undefined,
        counterPrice: counterPrice !== undefined ? parseFloat(counterPrice) : undefined
      },
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

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Error updating training request:', error);
    return NextResponse.json(
      { error: 'Failed to update training request' },
      { status: 500 }
    );
  }
}
