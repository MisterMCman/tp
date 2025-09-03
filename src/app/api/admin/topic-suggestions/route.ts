import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch all topic suggestions for admin review
export async function GET() {
  try {
    const suggestions = await prisma.topicSuggestion.findMany({
      include: {
        trainer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(suggestions);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error fetching topic suggestions:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "An unknown error occurred" }, { status: 500 });
  }
}

// PATCH - Approve or reject topic suggestions
export async function PATCH(request: NextRequest) {
  try {
    const { id, action } = await request.json();

    if (!id || !action) {
      return NextResponse.json(
        { error: 'ID and action are required' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    const status = action === 'approve' ? 'APPROVED' : 'REJECTED';

    const updatedSuggestion = await prisma.topicSuggestion.update({
      where: { id: parseInt(id) },
      data: { status },
      include: {
        trainer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      }
    });

    // If approved, create the topic in the main topics table
    if (action === 'approve') {
      const existingTopic = await prisma.topic.findFirst({
        where: { name: updatedSuggestion.name }
      });

      if (!existingTopic) {
        await prisma.topic.create({
          data: { name: updatedSuggestion.name }
        });
      }
    }

    return NextResponse.json({
      message: `Topic suggestion ${action}d successfully`,
      suggestion: updatedSuggestion,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error updating topic suggestion:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "An unknown error occurred" }, { status: 500 });
  }
}
