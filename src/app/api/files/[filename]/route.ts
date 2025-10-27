import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { prisma } from '@/lib/prisma';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;

    // Security check: Verify the file belongs to a message that the user has access to
    const attachment = await prisma.fileAttachment.findFirst({
      where: {
        storedFilename: filename,
      },
      include: {
        inquiryMessage: {
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

    if (!attachment) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // TODO: Add user authentication and authorization check here
    // For now, we'll allow access to all uploaded files

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
