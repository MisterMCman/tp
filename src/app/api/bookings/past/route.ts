import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTrainerData } from '@/lib/session';

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
    const currentUser = getTrainerData();
    if (!currentUser || currentUser.id.toString() !== companyId) {
      return NextResponse.json({
        message: 'Nicht autorisiert'
      }, { status: 403 });
    }

    // Find past bookings between this trainer and company
    const bookings = await prisma.training.findMany({
      where: {
        trainerId: parseInt(trainerId),
        trainingCompanyId: parseInt(companyId),
        status: {
          in: ['COMPLETED', 'CONFIRMED']
        }
      },
      select: {
        id: true,
        title: true,
        date: true,
        status: true,
        topic: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      },
      take: 10
    });

    // Format the bookings
    const formattedBookings = bookings.map(booking => ({
      id: booking.id,
      title: booking.title,
      date: booking.date.toISOString(),
      status: booking.status,
      topicName: booking.topic?.name || 'Thema nicht verfügbar'
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

