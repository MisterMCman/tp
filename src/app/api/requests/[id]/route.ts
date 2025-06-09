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
        select: { trainerId: true, status: true }
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

    // Check if status changed to COMPLETED and automatically generate credit
    if (updateData.status === 'COMPLETED') {
      await generateAccountingCredit(requestId);
    }

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

// Function to automatically generate accounting credit
async function generateAccountingCredit(inquiryId: number) {
  try {
    console.log(`Automatically generating accounting credit for inquiry ${inquiryId}`);
    
    // In a real implementation, you might:
    // 1. Create a record in an AccountingCredit table
    // 2. Queue a background job to generate the PDF
    // 3. Send email notification to trainer
    // 4. Update accounting system
    
    // For now, we'll just log the action
    // The PDF will be generated on-demand when the user downloads it
    
    console.log(`Accounting credit queued for inquiry ${inquiryId}`);
  } catch (error) {
    console.error('Error generating accounting credit:', error);
    // Don't throw error - we don't want to block the status update
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const inquiryId = parseInt(params.id);
    
    if (isNaN(inquiryId)) {
      return NextResponse.json(
        { error: 'Invalid inquiry ID' },
        { status: 400 }
      );
    }

    // Fetch inquiry with related data
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
      include: {
        trainer: true,
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

    if (!inquiry) {
      return NextResponse.json(
        { error: 'Inquiry not found' },
        { status: 404 }
      );
    }

    // Return inquiry data
    return NextResponse.json(inquiry);

  } catch (error) {
    console.error('Error fetching inquiry:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inquiry' },
      { status: 500 }
    );
  }
} 