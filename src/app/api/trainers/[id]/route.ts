import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const trainerId = parseInt(params.id);

    if (!trainerId || isNaN(trainerId)) {
      return NextResponse.json(
        { message: 'Ungültige Trainer-ID' },
        { status: 400 }
      );
    }

    // Fetch trainer with related data
    const trainer = await prisma.trainer.findUnique({
      where: { id: trainerId },
      include: {
        topics: {
          include: {
            topic: true
          }
        },
        country: true,
        offeredTrainingTypes: true
      }
    });

    if (!trainer) {
      return NextResponse.json(
        { message: 'Trainer nicht gefunden' },
        { status: 404 }
      );
    }

    // Format the response
    const formattedTrainer = {
      id: trainer.id,
      firstName: trainer.firstName,
      lastName: trainer.lastName,
      email: trainer.email,
      phone: trainer.phone,
      street: trainer.street,
      houseNumber: trainer.houseNumber,
      zipCode: trainer.zipCode,
      city: trainer.city,
      bio: trainer.bio,
      profilePicture: trainer.profilePicture,
      dailyRate: trainer.dailyRate,
      location: trainer.country ? {
        name: trainer.country.name,
        code: trainer.country.code
      } : null,
      topics: trainer.topics?.map(t => t.topic.name) || [],
      topicsWithLevels: trainer.topics?.map(t => ({
        name: t.topic.name,
        level: t.expertiseLevel
      })) || [],
      offeredTrainingTypes: trainer.offeredTrainingTypes?.map(tt => tt.type) || [],
      travelRadius: trainer.travelRadius,
      isCompany: trainer.isCompany,
      companyName: trainer.companyName,
      status: trainer.status,
      userType: trainer.userType,
      createdAt: trainer.createdAt
    };

    return NextResponse.json({
      trainer: formattedTrainer
    });

  } catch (error: unknown) {
    console.error('Trainer fetch error:', error);
    return NextResponse.json({
      message: 'Fehler beim Laden der Trainer-Daten',
      details: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
    }, { status: 500 });
  }
}
