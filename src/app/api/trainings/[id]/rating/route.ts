import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserData } from '@/lib/session';
import { TrainingRequestStatus } from '@prisma/client';

// POST - Submit a rating for a completed training
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userData = getUserData();
    
    if (!userData || userData.userType !== 'TRAINING_COMPANY') {
      return NextResponse.json(
        { error: 'Unauthorized: Only companies can rate trainings' },
        { status: 403 }
      );
    }

    const trainingId = parseInt(params.id);
    const body = await request.json();
    const { rating, comment } = body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Get the training
    const training = await prisma.training.findUnique({
      where: { id: trainingId },
      include: {
        requests: {
          where: {
            status: TrainingRequestStatus.GEBUCHT
          },
          include: {
            trainer: true
          }
        }
      }
    });

    if (!training) {
      return NextResponse.json(
        { error: 'Training not found' },
        { status: 404 }
      );
    }

    // Verify the training belongs to the company
    const companyId = (userData.companyId || userData.id) as number;
    if (training.companyId !== companyId) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only rate your own trainings' },
        { status: 403 }
      );
    }

    // Verify the training is completed
    if (training.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'You can only rate completed trainings' },
        { status: 400 }
      );
    }

    // Get the booked trainer
    const bookedRequest = training.requests.find(r => r.status === TrainingRequestStatus.GEBUCHT);
    if (!bookedRequest) {
      return NextResponse.json(
        { error: 'No booked trainer found for this training' },
        { status: 400 }
      );
    }

    const trainerId = bookedRequest.trainerId;

    // Check if trainingRating model is available
    if (!prisma.trainingRating) {
      return NextResponse.json(
        { error: 'Rating system not available. Please restart the server.' },
        { status: 503 }
      );
    }

    // Check if rating already exists
    const existingRating = await prisma.trainingRating.findUnique({
      where: {
        trainingId_companyId: {
          trainingId,
          companyId
        }
      }
    });

    if (existingRating) {
      // Update existing rating
      const updatedRating = await prisma.trainingRating.update({
        where: { id: existingRating.id },
        data: {
          rating,
          comment: comment || null,
          trainerId,
          topicId: training.topicId
        }
      });

      return NextResponse.json({
        message: 'Rating updated successfully',
        rating: updatedRating
      });
    } else {
      // Create new rating
      const newRating = await prisma.trainingRating.create({
        data: {
          trainingId,
          trainerId,
          companyId,
          topicId: training.topicId,
          rating,
          comment: comment || null
        }
      });

      return NextResponse.json({
        message: 'Rating submitted successfully',
        rating: newRating
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Error submitting rating:', error);
    return NextResponse.json(
      { error: 'Failed to submit rating' },
      { status: 500 }
    );
  }
}

// GET - Get rating for a specific training (for the company)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userData = getUserData();
    
    if (!userData || userData.userType !== 'TRAINING_COMPANY') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const trainingId = parseInt(params.id);
    const companyId = (userData.companyId || userData.id) as number;

    // Check if trainingRating model is available
    if (!prisma.trainingRating) {
      return NextResponse.json({ rating: null });
    }

    const rating = await prisma.trainingRating.findUnique({
      where: {
        trainingId_companyId: {
          trainingId,
          companyId
        }
      },
      include: {
        topic: true
      }
    });

    return NextResponse.json({ rating });
  } catch (error) {
    console.error('Error fetching rating:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rating' },
      { status: 500 }
    );
  }
}

