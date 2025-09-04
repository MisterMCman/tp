import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface TrainerTopicWithTopic {
  topic: {
    name: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const trainerId = parseInt(params.id);
    
    if (isNaN(trainerId)) {
      return NextResponse.json(
        { error: 'Invalid trainer ID' },
        { status: 400 }
      );
    }

    // Fetch trainer with topics
    const trainer = await prisma.trainer.findUnique({
      where: { id: trainerId },
      include: {
        topics: {
          include: {
            topic: true
          }
        }
      }
    });

    if (!trainer) {
      return NextResponse.json(
        { error: 'Trainer not found' },
        { status: 404 }
      );
    }

    // Transform the data to match the frontend format
    const transformedTrainer = {
      id: trainer.id,
      firstName: trainer.firstName,
      lastName: trainer.lastName,
      email: trainer.email,
      phone: trainer.phone,
      address: trainer.address,
      status: trainer.status,
      bio: trainer.bio,
      profilePicture: trainer.profilePicture,
      taxId: trainer.taxId,
      topics: trainer.topics.map((tt: TrainerTopicWithTopic) => tt.topic.name),
      iban: trainer.iban
    };

    return NextResponse.json(transformedTrainer);

  } catch (error) {
    console.error('Error fetching trainer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trainer' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const trainerId = parseInt(params.id);
    
    if (isNaN(trainerId)) {
      return NextResponse.json(
        { error: 'Invalid trainer ID' },
        { status: 400 }
      );
    }

    const updateData = await request.json();

    // Update trainer data
    await prisma.trainer.update({
      where: { id: trainerId },
      data: {
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        email: updateData.email,
        phone: updateData.phone,
        address: updateData.address,
        bio: updateData.bio,
        profilePicture: updateData.profilePicture,
        taxId: updateData.taxId,
        iban: updateData.iban,
      }
    });

    // Handle topic updates
    if (updateData.topics) {
      // Remove existing topic associations
      await prisma.trainerTopic.deleteMany({
        where: { trainerId: trainerId }
      });

      // Add new topic associations
      for (const topicName of updateData.topics) {
        // Find or create topic
        let topic = await prisma.topic.findFirst({
          where: { name: topicName }
        });

        if (!topic) {
          topic = await prisma.topic.create({
            data: { name: topicName }
          });
        }

        // Create trainer-topic association
        await prisma.trainerTopic.create({
          data: {
            trainerId: trainerId,
            topicId: topic.id
          }
        });
      }
    }

    // Fetch updated trainer with topics
    const finalTrainer = await prisma.trainer.findUnique({
      where: { id: trainerId },
      include: {
        topics: {
          include: {
            topic: true
          }
        }
      }
    });

    // Transform the data
    const transformedTrainer = {
      id: finalTrainer!.id,
      firstName: finalTrainer!.firstName,
      lastName: finalTrainer!.lastName,
      email: finalTrainer!.email,
      phone: finalTrainer!.phone,
      address: finalTrainer!.address,
      status: finalTrainer!.status,
      bio: finalTrainer!.bio,
      profilePicture: finalTrainer!.profilePicture,
      taxId: finalTrainer!.taxId,
      topics: finalTrainer!.topics.map((tt: TrainerTopicWithTopic) => tt.topic.name),
      iban: finalTrainer!.iban
    };

    return NextResponse.json(transformedTrainer);

  } catch (error) {
    console.error('Error updating trainer:', error);
    return NextResponse.json(
      { error: 'Failed to update trainer' },
      { status: 500 }
    );
  }
} 