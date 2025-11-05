import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestId = parseInt(params.id);
    
    if (isNaN(requestId)) {
      return NextResponse.json(
        { error: 'Invalid training request ID' },
        { status: 400 }
      );
    }

    // Fetch training request with full details for PDF generation
    const trainingRequest = await prisma.trainingRequest.findUnique({
      where: { id: requestId },
      include: {
        trainer: {
          include: {
            country: true
          }
        },
        training: {
          include: {
            topic: true,
            course: true
          }
        }
      }
    });

    if (!trainingRequest) {
      return NextResponse.json(
        { error: 'Training request not found' },
        { status: 404 }
      );
    }

    // Transform to match PDF generation needs
    const response = {
      id: trainingRequest.id,
      counterPrice: trainingRequest.counterPrice,
      proposedPrice: trainingRequest.training.dailyRate,
      updatedAt: trainingRequest.updatedAt.toISOString(),
      trainer: {
        firstName: trainingRequest.trainer.firstName,
        lastName: trainingRequest.trainer.lastName,
        street: trainingRequest.trainer.street,
        houseNumber: trainingRequest.trainer.houseNumber,
        zipCode: trainingRequest.trainer.zipCode,
        city: trainingRequest.trainer.city,
        taxId: trainingRequest.trainer.taxId,
        bio: trainingRequest.trainer.bio,
        country: trainingRequest.trainer.country ? {
          name: trainingRequest.trainer.country.name,
          code: trainingRequest.trainer.country.code
        } : null
      },
      training: {
        title: trainingRequest.training.title,
        course: trainingRequest.training.course ? {
          title: trainingRequest.training.course.title
        } : null
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching training request for accounting credit:', error);
    return NextResponse.json(
      { error: 'Failed to fetch training request' },
      { status: 500 }
    );
  }
}

