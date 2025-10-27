import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST - Create a new inquiry message (supports both JSON and multipart form data)
export async function POST(request: NextRequest) {
  try {
    let body: any;
    const attachments: any[] = [];

    // Check if this is a multipart form data request
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // Handle multipart form data
      const formData = await request.formData();

      body = {
        trainingRequestId: formData.get('trainingRequestId'),
        subject: formData.get('subject'),
        message: formData.get('message'),
      };

      // Handle file attachments
      const files = formData.getAll('attachments');
      for (const file of files) {
        if (file instanceof File) {
          // Upload file first
          const uploadResponse = await fetch(`${request.nextUrl.origin}/api/upload`, {
            method: 'POST',
            body: (() => {
              const uploadFormData = new FormData();
              uploadFormData.append('file', file);
              return uploadFormData;
            })(),
          });

          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            attachments.push(uploadResult);
          } else {
            console.error('File upload failed:', await uploadResponse.text());
            // Continue with message creation even if file upload fails
          }
        }
      }
    } else {
      // Handle JSON request
      body = await request.json();
    }

    const { trainingRequestId, subject, message } = body;

    if (!trainingRequestId || !subject || !message) {
      return NextResponse.json(
        { error: 'trainingRequestId, subject, and message are required' },
        { status: 400 }
      );
    }

    // Get the training request to determine sender and recipient
    const trainingRequest = await prisma.trainingRequest.findUnique({
      where: { id: parseInt(trainingRequestId) },
      include: {
        training: {
          include: {
            company: true
          }
        },
        trainer: true
      }
    });

    if (!trainingRequest) {
      return NextResponse.json(
        { error: 'Training request not found' },
        { status: 404 }
      );
    }

    // For now, we'll assume the sender is the trainer (this could be enhanced with proper auth)
    // In production, you'd get this from the authenticated user session
    const senderId = trainingRequest.trainerId;
    const senderType = 'TRAINER' as const;
    const recipientId = trainingRequest.training.companyId;
    const recipientType = 'TRAINING_COMPANY' as const;

    const inquiryMessage = await prisma.inquiryMessage.create({
      data: {
        trainingRequestId: parseInt(trainingRequestId),
        senderId,
        senderType,
        recipientId,
        recipientType,
        subject,
        message,
        isRead: false
      },
      include: {
        trainingRequest: {
          include: {
            training: {
              include: {
                topic: true,
                company: true
              }
            },
            trainer: true
          }
        }
      }
    });

    // Create file attachments if any were uploaded
    if (attachments.length > 0) {
      await prisma.fileAttachment.createMany({
        data: attachments.map((attachment: any) => ({
          inquiryMessageId: inquiryMessage.id,
          filename: attachment.filename,
          storedFilename: attachment.storedFilename,
          filePath: attachment.filePath,
          fileSize: attachment.fileSize,
          mimeType: attachment.mimeType,
        }))
      });

      // Fetch the message with attachments
      const messageWithAttachments = await prisma.inquiryMessage.findUnique({
        where: { id: inquiryMessage.id },
        include: {
          trainingRequest: {
            include: {
              training: {
                include: {
                  topic: true,
                  company: true
                }
              },
              trainer: true
            }
          },
          attachments: true
        }
      });

      return NextResponse.json(messageWithAttachments);
    }

    return NextResponse.json(inquiryMessage);
  } catch (error) {
    console.error('Error creating inquiry message:', error);
    return NextResponse.json(
      { error: 'Failed to create inquiry message' },
      { status: 500 }
    );
  }
}

// GET - Get inquiry messages for a user (trainer or company)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userType = searchParams.get('userType'); // 'TRAINER' or 'TRAINING_COMPANY'

    if (!userId || !userType) {
      return NextResponse.json(
        { error: 'userId and userType are required' },
        { status: 400 }
      );
    }

    const userIdInt = parseInt(userId);

    // Get messages where user is either sender or recipient
    const messages = await prisma.inquiryMessage.findMany({
      where: {
        OR: [
          { senderId: userIdInt, senderType: userType as any },
          { recipientId: userIdInt, recipientType: userType as any }
        ]
      },
      include: {
        trainingRequest: {
          include: {
            training: {
              include: {
                topic: true,
                company: true
              }
            },
            trainer: true
          }
        },
        attachments: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching inquiry messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inquiry messages' },
      { status: 500 }
    );
  }
}

// PATCH - Mark message as read
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId } = body;

    if (!messageId) {
      return NextResponse.json(
        { error: 'messageId is required' },
        { status: 400 }
      );
    }

    const updatedMessage = await prisma.inquiryMessage.update({
      where: { id: parseInt(messageId) },
      data: { isRead: true },
      include: {
        trainingRequest: {
          include: {
            training: {
              include: {
                topic: true,
                company: true
              }
            },
            trainer: true
          }
        }
      }
    });

    return NextResponse.json(updatedMessage);
  } catch (error) {
    console.error('Error updating inquiry message:', error);
    return NextResponse.json(
      { error: 'Failed to update inquiry message' },
      { status: 500 }
    );
  }
}
