import { NextRequest, NextResponse } from 'next/server';
import { InquiryStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestId = parseInt(params.id);
    const body = await request.json();
    
    const { status, counterPrice, message, trainerId } = body;

    // Security check: Verify the request belongs to the trainer
    if (trainerId) {
      const existingRequest = await prisma.inquiry.findUnique({
        where: { id: requestId },
        select: { trainerId: true }
      });

      if (!existingRequest) {
        return NextResponse.json(
          { error: 'Training request not found' },
          { status: 404 }
        );
      }

      if (existingRequest.trainerId !== parseInt(trainerId)) {
        return NextResponse.json(
          { error: 'Unauthorized: You can only update your own training requests' },
          { status: 403 }
        );
      }
    }

    // Build update data object
    const updateData: {
      updatedAt: Date;
      status?: InquiryStatus;
      counterPrice?: number;
      message?: string;
    } = {
      updatedAt: new Date()
    };

    if (status) {
      updateData.status = status.toUpperCase() as InquiryStatus;
    }

    if (counterPrice !== undefined) {
      updateData.counterPrice = parseFloat(counterPrice);
    }

    if (message !== undefined) {
      updateData.message = message;
    }

    // Update the inquiry
    await prisma.inquiry.update({
      where: {
        id: requestId
      },
      data: updateData
    });

    // Fetch the updated inquiry with includes
    const inquiryWithIncludes = await prisma.inquiry.findUnique({
      where: {
        id: requestId
      },
      include: {
        event: {
          include: {
            course: {
              include: {
                topic: true
              }
            }
          }
        }
      }
    });

    if (!inquiryWithIncludes) {
      return NextResponse.json(
        { error: 'Training request not found' },
        { status: 404 }
      );
    }

    // Transform the response to match frontend interface
    const trainingRequest = {
      id: inquiryWithIncludes.id,
      courseTitle: inquiryWithIncludes.event.course.title,
      topicName: inquiryWithIncludes.event.course.topic?.name || 'Unknown',
      date: inquiryWithIncludes.event.date.toISOString(),
      endTime: inquiryWithIncludes.event.endTime.toISOString(),
      location: inquiryWithIncludes.event.location,
      participants: inquiryWithIncludes.event.participants,
      originalPrice: inquiryWithIncludes.originalPrice,
      proposedPrice: inquiryWithIncludes.proposedPrice,
      counterPrice: inquiryWithIncludes.counterPrice,
      message: inquiryWithIncludes.message,
      status: inquiryWithIncludes.status.toLowerCase(),
      createdAt: inquiryWithIncludes.createdAt.toISOString(),
      updatedAt: inquiryWithIncludes.updatedAt.toISOString()
    };

    return NextResponse.json(trainingRequest);
  } catch (error) {
    console.error('Error updating training request:', error);
    return NextResponse.json(
      { error: 'Failed to update training request' },
      { status: 500 }
    );
  }
} 