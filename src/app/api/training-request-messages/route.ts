import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST - Create a new training request message (supports both JSON and multipart form data)
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

    // Determine sender and recipient from the training request
    // The sender is the one creating the message (from auth/session)
    // The recipient is the other party in the training request
    const senderId = body.senderId;
    const senderType = body.senderType; // 'TRAINER' or 'TRAINING_COMPANY'
    
    // Determine recipient based on sender
    let recipientId: number;
    let recipientType: string;
    
    if (senderType === 'TRAINER' && parseInt(senderId) === trainingRequest.trainerId) {
      // Trainer is sending, recipient is company
      recipientId = trainingRequest.training.companyId;
      recipientType = 'TRAINING_COMPANY';
    } else if (senderType === 'TRAINING_COMPANY' && parseInt(senderId) === trainingRequest.training.companyId) {
      // Company is sending, recipient is trainer
      recipientId = trainingRequest.trainerId;
      recipientType = 'TRAINER';
    } else {
      return NextResponse.json(
        { error: 'Unauthorized: Sender must be part of the training request' },
        { status: 403 }
      );
    }

    const trainingRequestMessage = await prisma.trainingRequestMessage.create({
      data: {
        trainingRequestId: parseInt(trainingRequestId),
        senderId: parseInt(senderId),
        senderType: senderType as any,
        recipientId: parseInt(recipientId),
        recipientType: recipientType as any,
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
          trainingRequestMessageId: trainingRequestMessage.id,
          filename: attachment.filename,
          storedFilename: attachment.storedFilename,
          filePath: attachment.filePath,
          fileSize: attachment.fileSize,
          mimeType: attachment.mimeType,
        }))
      });

      // Fetch the message with attachments
      const messageWithAttachments = await prisma.trainingRequestMessage.findUnique({
        where: { id: trainingRequestMessage.id },
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

    return NextResponse.json(trainingRequestMessage);
  } catch (error) {
    console.error('Error creating training request message:', error);
    return NextResponse.json(
      { error: 'Failed to create training request message' },
      { status: 500 }
    );
  }
}

// GET - Get training request messages for a user (trainer or company)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userType = searchParams.get('userType'); // 'TRAINER' or 'TRAINING_COMPANY'
    const trainingRequestId = searchParams.get('trainingRequestId');

    if (trainingRequestId) {
      // Get all messages for a specific training request
      const messages = await prisma.trainingRequestMessage.findMany({
        where: {
          trainingRequestId: parseInt(trainingRequestId)
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
          createdAt: 'asc'
        }
      });

      return NextResponse.json(messages);
    }

    if (!userId || !userType) {
      return NextResponse.json(
        { error: 'userId and userType are required (or trainingRequestId)' },
        { status: 400 }
      );
    }

    const userIdInt = parseInt(userId);

    // For companies, we need to also check if they're the company associated with the training
    // in the training request, not just senderId/recipientId
    let whereClause: any;
    
    if (userType === 'TRAINING_COMPANY') {
      // For companies: check senderId/recipientId OR check if they're the company in the training
      whereClause = {
        OR: [
          { senderId: userIdInt, senderType: userType as any },
          { recipientId: userIdInt, recipientType: userType as any },
          // Also include messages where the company is associated with the training in the request
          {
            trainingRequest: {
              training: {
                companyId: userIdInt
              }
            }
          }
        ]
      };
    } else {
      // For trainers: standard query
      whereClause = {
        OR: [
          { senderId: userIdInt, senderType: userType as any },
          { recipientId: userIdInt, recipientType: userType as any }
        ]
      };
    }

    // Get messages where user is either sender or recipient
    const messages = await prisma.trainingRequestMessage.findMany({
      where: whereClause,
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

    console.log(`Found ${messages.length} messages for user ${userIdInt} (${userType})`);
    
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching training request messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch training request messages' },
      { status: 500 }
    );
  }
}

// PATCH - Mark message as read
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, isRead } = body;

    if (!messageId || typeof isRead !== 'boolean') {
      return NextResponse.json(
        { error: 'messageId and isRead (boolean) are required' },
        { status: 400 }
      );
    }

    const updatedMessage = await prisma.trainingRequestMessage.update({
      where: { id: parseInt(messageId) },
      data: { isRead }
    });

    return NextResponse.json(updatedMessage);
  } catch (error) {
    console.error('Error updating training request message:', error);
    return NextResponse.json(
      { error: 'Failed to update training request message' },
      { status: 500 }
    );
  }
}

