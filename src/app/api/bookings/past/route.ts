import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserData } from '@/lib/session';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const trainerId = url.searchParams.get('trainerId');
    const companyId = url.searchParams.get('companyId');

    if (!trainerId || !companyId) {
      return NextResponse.json({
        message: 'Trainer-ID und Unternehmens-ID erforderlich'
      }, { status: 400 });
    }

    // Get current user to verify they own this company
    const currentUser = getUserData();
    if (!currentUser || currentUser.userType !== 'TRAINING_COMPANY') {
      return NextResponse.json({
        message: 'Nicht autorisiert'
      }, { status: 403 });
    }

    // Get company ID from CompanyUser (companyId) or fallback to id for legacy support
    const userCompanyId = (currentUser.companyId || currentUser.id) as number;
    if (userCompanyId.toString() !== companyId) {
      return NextResponse.json({
        message: 'Nicht autorisiert'
      }, { status: 403 });
    }

    // Find past bookings between this trainer and company via TrainingRequest system
    const trainingRequests = await prisma.trainingRequest.findMany({
      where: {
        trainerId: parseInt(trainerId),
        status: {
          in: ['ACCEPTED']
        },
        training: {
          companyId: parseInt(companyId),
          status: {
            in: ['COMPLETED', 'IN_PROGRESS']
          }
        }
      },
      include: {
        training: {
          include: {
            topic: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10
    });

    // Format the bookings
    const formattedBookings = trainingRequests.map(request => ({
      id: request.training.id,
      title: request.training.title,
      date: request.training.startDate.toISOString(),
      status: request.training.status,
      topicName: request.training.topic?.name || 'Thema nicht verfügbar'
    }));

    return NextResponse.json({
      bookings: formattedBookings
    });

  } catch (error: unknown) {
    console.error('Past bookings fetch error:', error);
    return NextResponse.json({
      message: 'Fehler beim Laden der vergangenen Buchungen',
      bookings: []
    }, { status: 500 });
  }
}

