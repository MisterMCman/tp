import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserData } from '@/lib/session';

/**
 * PATCH /api/topics/[id]
 * Update a topic (companies only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = getUserData();
    if (!currentUser || currentUser.userType !== 'TRAINING_COMPANY') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const topicId = parseInt(params.id);
    if (isNaN(topicId)) {
      return NextResponse.json(
        { error: 'Invalid topic ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, short_title, state } = body;

    // Check if topic exists
    const existingTopic = await prisma.topic.findUnique({
      where: { id: topicId }
    });

    if (!existingTopic) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    
    if (name !== undefined) {
      updateData.name = name.trim();
      // Generate new slug if name changed
      if (name.trim() !== existingTopic.name) {
        updateData.slug = name
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
        
        // Check if new slug already exists (on different topic)
        const slugExists = await prisma.topic.findFirst({
          where: {
            slug: updateData.slug,
            id: { not: topicId }
          }
        });

        if (slugExists) {
          return NextResponse.json(
            { error: 'Ein Thema mit diesem Namen existiert bereits' },
            { status: 400 }
          );
        }
      }
    }

    if (short_title !== undefined) {
      updateData.short_title = short_title?.trim() || null;
    }

    if (state !== undefined) {
      updateData.state = state;
    }

    // Update topic
    const topic = await prisma.topic.update({
      where: { id: topicId },
      data: updateData
    });

    return NextResponse.json({ topic });
  } catch (error: any) {
    console.error('Error updating topic:', error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ein Thema mit diesem Namen existiert bereits' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update topic' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/topics/[id]
 * Delete a topic (companies only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = getUserData();
    if (!currentUser || currentUser.userType !== 'TRAINING_COMPANY') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const topicId = parseInt(params.id);
    if (isNaN(topicId)) {
      return NextResponse.json(
        { error: 'Invalid topic ID' },
        { status: 400 }
      );
    }

    // Check if topic exists
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: {
        trainings: {
          select: { id: true }
        },
        trainers: {
          select: { id: true }
        }
      }
    });

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    // Check if topic is being used
    if (topic.trainings.length > 0) {
      return NextResponse.json(
        { 
          error: `Dieses Thema wird in ${topic.trainings.length} Training(s) verwendet und kann nicht gelöscht werden`,
          trainingsCount: topic.trainings.length
        },
        { status: 400 }
      );
    }

    // Delete topic
    await prisma.topic.delete({
      where: { id: topicId }
    });

    return NextResponse.json({ message: 'Topic deleted successfully' });
  } catch (error) {
    console.error('Error deleting topic:', error);
    return NextResponse.json(
      { error: 'Failed to delete topic' },
      { status: 500 }
    );
  }
}

