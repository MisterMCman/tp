import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTrainerData } from '@/lib/session';

// GET - Aktuelle Trainer-Daten abrufen
export async function GET() {
  try {
    const trainerData = getTrainerData();

    if (!trainerData) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    // Hole aktuelle Trainer-Daten mit allen Beziehungen
    const trainer = await prisma.trainer.findUnique({
      where: { id: trainerData.id as number },
      include: {
        topics: {
          include: {
            topic: true
          }
        },
        topicSuggestions: {
          where: {
            status: 'PENDING'
          }
        },
        country: true
      }
    });

    if (!trainer) {
      return NextResponse.json(
        { error: 'Trainer nicht gefunden' },
        { status: 404 }
      );
    }

    // Formatiere die Antwort
    const response = {
      id: trainer.id,
      firstName: trainer.firstName,
      lastName: trainer.lastName,
      email: trainer.email,
      phone: trainer.phone,
      address: trainer.address, // Legacy field
      street: trainer.street,
      houseNumber: trainer.houseNumber,
      zipCode: trainer.zipCode,
      city: trainer.city,
      country: trainer.country,
      bio: trainer.bio,
      profilePicture: trainer.profilePicture,
      iban: trainer.iban,
      taxId: trainer.taxId,
      companyName: trainer.companyName,
      isCompany: trainer.isCompany,
      dailyRate: trainer.dailyRate,
      status: trainer.status,
      topics: trainer.topics.map(t => t.topic.name),
      pendingSuggestions: trainer.topicSuggestions.map(s => s.name),
      createdAt: trainer.createdAt.toISOString(),
      updatedAt: trainer.updatedAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error fetching trainer profile:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "An unknown error occurred" }, { status: 500 });
  }
}

// PATCH - Trainer-Profil aktualisieren mit Versionierung
export async function PATCH(request: NextRequest) {
  try {
    const trainerData = getTrainerData();

    if (!trainerData) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    const body = await request.json() as Record<string, unknown>;
    const updateData = body;

    // Hole aktuelle Trainer-Daten für Vergleich
    const currentTrainer = await prisma.trainer.findUnique({
      where: { id: trainerData.id as number }
    });

    if (!currentTrainer) {
      return NextResponse.json(
        { error: 'Trainer nicht gefunden' },
        { status: 404 }
      );
    }

    // Bestimme geänderte Felder
    const changedFields: string[] = [];
    const versionData: Record<string, unknown> = {
      trainerId: trainerData.id as number,
      changedBy: 'trainer'
    };

    // Vergleiche jedes Feld und sammle Änderungen
    Object.keys(updateData).forEach(key => {
      if (currentTrainer[key as keyof typeof currentTrainer] !== updateData[key]) {
        changedFields.push(key);
        versionData[key] = updateData[key];
      }
    });

    if (changedFields.length === 0) {
      return NextResponse.json(
        { message: 'Keine Änderungen gefunden' },
        { status: 200 }
      );
    }

    // Hole die nächste Versionsnummer
    const lastVersion = await prisma.trainerProfileVersion.findFirst({
      where: { trainerId: trainerData.id as number },
      orderBy: { version: 'desc' }
    });

    const nextVersion = (lastVersion?.version || 0) + 1;

    // Erstelle neue Version
    await prisma.trainerProfileVersion.create({
      data: {
        trainerId: trainerData.id as number,
        version: nextVersion,
        changedFields: JSON.stringify(changedFields),
        changedBy: versionData.changedBy as string
      }
    });

    // Aktualisiere Trainer-Daten
    const updatedTrainer = await prisma.trainer.update({
      where: { id: trainerData.id as number },
      data: updateData,
      include: {
        topics: {
          include: {
            topic: true
          }
        },
        topicSuggestions: {
          where: {
            status: 'PENDING'
          }
        },
        country: true
      }
    });

    // Formatiere die Antwort
    const response = {
      id: updatedTrainer.id,
      firstName: updatedTrainer.firstName,
      lastName: updatedTrainer.lastName,
      email: updatedTrainer.email,
      phone: updatedTrainer.phone,
      address: updatedTrainer.address, // Legacy field
      street: updatedTrainer.street,
      houseNumber: updatedTrainer.houseNumber,
      zipCode: updatedTrainer.zipCode,
      city: updatedTrainer.city,
      country: updatedTrainer.country,
      bio: updatedTrainer.bio,
      profilePicture: updatedTrainer.profilePicture,
      iban: updatedTrainer.iban,
      taxId: updatedTrainer.taxId,
      companyName: updatedTrainer.companyName,
      isCompany: updatedTrainer.isCompany,
      dailyRate: updatedTrainer.dailyRate,
      status: updatedTrainer.status,
      topics: updatedTrainer.topics.map(t => t.topic.name),
      pendingSuggestions: updatedTrainer.topicSuggestions.map(s => s.name),
      createdAt: updatedTrainer.createdAt.toISOString(),
      updatedAt: updatedTrainer.updatedAt.toISOString(),
    };

    return NextResponse.json({
      message: 'Profil erfolgreich aktualisiert',
      trainer: response,
      changedFields,
      version: nextVersion
    }, {
      headers: {
        'Set-Cookie': `trainer_data=${JSON.stringify(response)}; Path=/; HttpOnly=false; Secure=${process.env.NODE_ENV === 'production'}; SameSite=strict; Max-Age=${60 * 60 * 24 * 7}`
      }
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error updating trainer profile:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "An unknown error occurred" }, { status: 500 });
  }
}
