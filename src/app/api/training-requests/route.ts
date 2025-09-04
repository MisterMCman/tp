import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trainingId, trainerIds, message } = body;

    // Create training requests for all selected trainers
    const trainingRequests = await Promise.all(
      trainerIds.map(async (trainerId: number) => {
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
                    contactName: true,
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
                  contactName: true,
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
    const { requestId, status, message } = body;

    const updatedRequest = await prisma.trainingRequest.update({
      where: { id: parseInt(requestId) },
      data: {
        status: status,
        message: message || undefined
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
