import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserData } from '@/lib/session';
import { TrainingRequestStatus } from '@prisma/client';

/**
 * GET /api/dashboard/company
 * Get dashboard data for training company:
 * - Trainings without assigned trainers
 * - 5 latest invoices
 * - 5 latest messages
 * - 5 next trainings
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserData();
    
    if (!currentUser || currentUser.userType !== 'TRAINING_COMPANY') {
      return NextResponse.json(
        { error: 'Nicht authentifiziert oder kein Unternehmensaccount' },
        { status: 401 }
      );
    }

    const companyId = (currentUser.companyId || currentUser.id) as number;
    const now = new Date();

    // 1. Get trainings without assigned trainers
    // Trainings where no request has status GEBUCHT (fully booked)
    const allTrainings = await prisma.training.findMany({
      where: {
        companyId: companyId,
        status: { not: 'COMPLETED' }
      },
      include: {
        topic: true,
        location: {
          include: {
            country: true
          }
        },
        requests: {
          where: {
            status: TrainingRequestStatus.GEBUCHT
          }
        }
      },
      orderBy: {
        startDate: 'asc'
      }
    });

    const trainingsWithoutTrainer = allTrainings
      .filter(training => training.requests.length === 0)
      .map(training => ({
        id: training.id,
        title: training.title,
        topicName: training.topic.name,
        date: training.startDate.toISOString(),
        endDate: training.endDate.toISOString(),
        startTime: training.startTime,
        endTime: training.endTime,
        location: training.location?.name || (training.location?.city ? `${training.location.city}` : 'Kein Ort angegeben'),
        participants: training.participantCount,
        status: training.status
      }));

    // 2. Get 5 latest invoices
    const companyTrainings = await prisma.training.findMany({
      where: {
        companyId: companyId
      },
      select: {
        id: true
      }
    });

    const trainingIds = companyTrainings.map(t => t.id);
    const invoices = trainingIds.length > 0 ? await prisma.invoice.findMany({
      where: {
        trainingId: {
          in: trainingIds
        }
      },
      include: {
        training: {
          include: {
            topic: true
          }
        },
        trainer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    }) : [];

    const latestInvoices = invoices.map(invoice => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber || `INV-${invoice.id}`,
      amount: invoice.amount,
      status: invoice.status,
      createdAt: invoice.createdAt.toISOString(),
      invoiceDate: invoice.invoiceDate?.toISOString(),
      paidDate: invoice.paidDate?.toISOString(),
      trainingTitle: invoice.training?.title || 'Unknown Training',
      topicName: invoice.training?.topic?.name || 'Unknown Topic',
      trainerName: invoice.trainer ? `${invoice.trainer.firstName} ${invoice.trainer.lastName}` : null
    }));

    // 3. Get 5 latest messages
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: companyId, senderType: 'TRAINING_COMPANY' },
          { recipientId: companyId, recipientType: 'TRAINING_COMPANY' }
        ]
      },
      include: {
        trainingRequest: {
          include: {
            training: {
              include: {
                topic: true
              }
            },
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
        createdAt: 'desc'
      },
      take: 5
    });

    const latestMessages = messages.map(message => ({
      id: message.id,
      subject: message.subject,
      message: message.message,
      isRead: message.isRead,
      createdAt: message.createdAt.toISOString(),
      senderType: message.senderType,
      trainingTitle: message.trainingRequest?.training?.title || 'Unknown Training',
      topicName: message.trainingRequest?.training?.topic?.name || 'Unknown Topic',
      trainerName: message.trainingRequest?.trainer ? `${message.trainingRequest.trainer.firstName} ${message.trainingRequest.trainer.lastName}` : null,
      trainingRequestId: message.trainingRequestId
    }));

    // 4. Get 5 next trainings (all upcoming trainings, with or without assigned trainers)
    const nextTrainingsQuery = await prisma.training.findMany({
      where: {
        companyId: companyId,
        status: { not: 'COMPLETED' }
      },
      include: {
        topic: true,
        location: {
          include: {
            country: true
          }
        },
        requests: {
          where: {
            status: TrainingRequestStatus.GEBUCHT
          },
          include: {
            trainer: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          take: 1
        }
      },
      orderBy: {
        startDate: 'asc'
      },
      take: 5
    });

    const nextTrainings = nextTrainingsQuery.map(training => {
      const acceptedRequest = training.requests[0];
      return {
        id: training.id,
        title: training.title,
        topicName: training.topic.name,
        date: training.startDate.toISOString(),
        endDate: training.endDate.toISOString(),
        startTime: training.startTime,
        endTime: training.endTime,
        location: training.location?.name || (training.location?.city ? `${training.location.city}` : 'Kein Ort angegeben'),
        participants: training.participantCount,
        status: training.status.toLowerCase(),
        trainerName: acceptedRequest && acceptedRequest.trainer ? `${acceptedRequest.trainer.firstName} ${acceptedRequest.trainer.lastName}` : null
      };
    });

    return NextResponse.json({
      trainingsWithoutTrainer,
      latestInvoices,
      latestMessages,
      nextTrainings
    });
  } catch (error) {
    console.error('Error fetching company dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

