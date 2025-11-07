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
        offeredTrainingTypes: true,
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
      offeredTrainingTypes: trainer.offeredTrainingTypes?.map(tt => tt.type) || [],
      travelRadius: trainer.travelRadius,
      topics: trainer.topics.map(t => ({
        name: t.topic.name,
        level: t.expertiseLevel
      })),
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
    
    // Extract topicsWithLevels, topicSuggestions, and offeredTrainingTypes separately
    const { topicsWithLevels: topicsWithLevelsToUpdate, topicSuggestions: suggestionsToUpdate, offeredTrainingTypes: offeredTrainingTypesToUpdate, ...updateData } = body;

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
        offeredTrainingTypes: true,
        country: true
      }
    });

    // Update topics if provided
    const topicsToProcess = topicsWithLevelsToUpdate || null;
    
    if (topicsToProcess && Array.isArray(topicsToProcess) && topicsToProcess.length > 0) {
      // Delete all existing trainer topics
      await prisma.trainerTopic.deleteMany({
        where: { trainerId: trainerData.id as number }
      });

      // Add new topics with expertise levels
      for (const topicItem of topicsToProcess) {
        const topicName = typeof topicItem === 'string' ? topicItem : topicItem.name;
        const expertiseLevel = typeof topicItem === 'string' ? 'GRUNDLAGE' : (topicItem.level || 'GRUNDLAGE');
        
        // Find or create topic
        let topic = await prisma.topic.findFirst({
          where: { name: topicName }
        });

        if (!topic) {
          // Create topic if it doesn't exist (shouldn't happen with our current flow)
          topic = await prisma.topic.create({
            data: { 
              name: topicName,
              slug: topicName.toLowerCase().replace(/\s+/g, '-')
            }
          });
        }

        // Create trainer-topic relation with expertise level
        await prisma.trainerTopic.create({
          data: {
            trainerId: trainerData.id as number,
            topicId: topic.id,
            expertiseLevel: expertiseLevel as 'GRUNDLAGE' | 'FORTGESCHRITTEN' | 'EXPERTE'
          }
        });
      }
    } else if (topicsToProcess === null) {
      // If topicsWithLevels is explicitly null, delete all topics
      await prisma.trainerTopic.deleteMany({
        where: { trainerId: trainerData.id as number }
      });
    }

    // Update topic suggestions if provided
    if (suggestionsToUpdate && Array.isArray(suggestionsToUpdate)) {
      // Delete all existing pending suggestions for this trainer
      await prisma.topicSuggestion.deleteMany({
        where: { 
          trainerId: trainerData.id as number,
          status: 'PENDING'
        }
      });

      // Add new suggestions
      for (const suggestionName of suggestionsToUpdate as string[]) {
        // Check if topic already exists
        const existingTopic = await prisma.topic.findFirst({
          where: { name: suggestionName }
        });

        if (!existingTopic) {
          // Create suggestion only if topic doesn't exist
          await prisma.topicSuggestion.create({
            data: {
              name: suggestionName,
              trainerId: trainerData.id as number,
              status: 'PENDING'
            }
          });
        }
      }
    }

    // Update offered training types if provided
    if (offeredTrainingTypesToUpdate !== undefined && Array.isArray(offeredTrainingTypesToUpdate)) {
      // Delete all existing training types for this trainer
      await prisma.trainerTrainingType.deleteMany({
        where: { trainerId: trainerData.id as number }
      });

      // Add new training types
      for (const trainingType of offeredTrainingTypesToUpdate as string[]) {
        if (['ONLINE', 'HYBRID', 'VOR_ORT'].includes(trainingType)) {
          await prisma.trainerTrainingType.create({
            data: {
              trainerId: trainerData.id as number,
              type: trainingType as 'ONLINE' | 'HYBRID' | 'VOR_ORT'
            }
          });
        }
      }
    }

    // Reload trainer with updated topics and suggestions
    const reloadedTrainer = await prisma.trainer.findUnique({
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
        offeredTrainingTypes: true,
        country: true
      }
    });

    // Formatiere die Antwort mit reloaded data
    const trainerToReturn = reloadedTrainer || updatedTrainer;
    const response = {
      id: trainerToReturn.id,
      firstName: trainerToReturn.firstName,
      lastName: trainerToReturn.lastName,
      email: trainerToReturn.email,
      phone: trainerToReturn.phone,
      street: trainerToReturn.street,
      houseNumber: trainerToReturn.houseNumber,
      zipCode: trainerToReturn.zipCode,
      city: trainerToReturn.city,
      country: trainerToReturn.country,
      bio: trainerToReturn.bio,
      profilePicture: trainerToReturn.profilePicture,
      iban: trainerToReturn.iban,
      taxId: trainerToReturn.taxId,
      companyName: trainerToReturn.companyName,
      isCompany: trainerToReturn.isCompany,
      dailyRate: trainerToReturn.dailyRate,
      status: trainerToReturn.status,
      offeredTrainingTypes: trainerToReturn.offeredTrainingTypes.map(tt => tt.type) || [],
      travelRadius: trainerToReturn.travelRadius,
      topics: trainerToReturn.topics.map(t => ({
        name: t.topic.name,
        level: t.expertiseLevel
      })),
      pendingSuggestions: trainerToReturn.topicSuggestions.map(s => s.name),
      createdAt: trainerToReturn.createdAt.toISOString(),
      updatedAt: trainerToReturn.updatedAt.toISOString(),
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
