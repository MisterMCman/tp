import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { prisma } from '@/lib/prisma';
import { getTrainerData } from '@/lib/session';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;
    const currentUser = getTrainerData();

    // Authentication check
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    // Security check: Verify the file belongs to a message that the user has access to
    const attachment = await prisma.fileAttachment.findFirst({
      where: {
        storedFilename: filename,
      },
      include: {
        message: {
          include: {
            trainingRequest: {
              include: {
                trainer: true,
                training: {
                  include: {
                    company: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!attachment || !attachment.message) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Authorization check: User must be either the sender or recipient of the message
    const message = attachment.message;
    const isSender = currentUser.id === message.senderId && currentUser.userType === message.senderType;
    const isRecipient = currentUser.id === message.recipientId && currentUser.userType === message.recipientType;

    if (!isSender && !isRecipient) {
      return NextResponse.json(
        { error: 'Nicht autorisiert - Sie haben keinen Zugriff auf diese Datei' },
        { status: 403 }
      );
    }

    const filePath = join(UPLOAD_DIR, filename);

    try {
      const fileBuffer = await readFile(filePath);

      // Set appropriate headers for file download
      const headers = new Headers();
      headers.set('Content-Type', attachment.mimeType);
      headers.set('Content-Disposition', `attachment; filename="${attachment.filename}"`);
      headers.set('Content-Length', fileBuffer.length.toString());

      return new NextResponse(fileBuffer, {
        status: 200,
        headers,
      });

    } catch (fileError) {
      console.error('File read error:', fileError);
      return NextResponse.json(
        { error: 'File not found on disk' },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('File download error:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
