import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { getUserData } from '@/lib/session';
import { prisma } from '@/lib/prisma';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'images');

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist, which is fine
  }
}

// Allowed image types
const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB for images

function getFileExtension(filename: string): string {
  return filename.toLowerCase().substring(filename.lastIndexOf('.'));
}

function isAllowedImageType(mimeType: string, filename: string): boolean {
  const extension = getFileExtension(filename);
  return ALLOWED_IMAGE_TYPES[mimeType as keyof typeof ALLOWED_IMAGE_TYPES]?.includes(extension) || false;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = getUserData();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await ensureUploadDir();

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'profilePicture' or 'logo'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!type || (type !== 'profilePicture' && type !== 'logo')) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "profilePicture" or "logo"' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!isAllowedImageType(file.type, file.name)) {
      return NextResponse.json(
        { error: 'File type not allowed. Allowed types: JPG, PNG, GIF, WEBP' },
        { status: 400 }
      );
    }

    const userId = user.id as number;
    
    // Delete old image if exists
    if (user.userType === 'TRAINER' && type === 'profilePicture') {
      const trainer = await prisma.trainer.findUnique({
        where: { id: userId },
        select: { profilePicture: true }
      });
      if (trainer?.profilePicture) {
        try {
          const oldFilePath = join(process.cwd(), trainer.profilePicture);
          await unlink(oldFilePath);
        } catch (error) {
          // File might not exist, continue anyway
          console.warn('Could not delete old profile picture:', error);
        }
      }
    } else if (user.userType === 'TRAINING_COMPANY' && type === 'logo') {
      const company = await prisma.trainingCompany.findUnique({
        where: { id: userId },
        select: { logo: true }
      });
      if (company?.logo) {
        try {
          const oldFilePath = join(process.cwd(), company.logo);
          await unlink(oldFilePath);
        } catch (error) {
          // File might not exist, continue anyway
          console.warn('Could not delete old logo:', error);
        }
      }
    }

    // Generate unique filename
    const fileExtension = getFileExtension(file.name);
    const storedFilename = `${type}-${userId}-${randomUUID()}${fileExtension}`;
    const filePath = join(UPLOAD_DIR, storedFilename);
    const relativePath = `uploads/images/${storedFilename}`;

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Update database
    if (user.userType === 'TRAINER' && type === 'profilePicture') {
      await prisma.trainer.update({
        where: { id: userId },
        data: { profilePicture: relativePath }
      });
    } else if (user.userType === 'TRAINING_COMPANY' && type === 'logo') {
      await prisma.trainingCompany.update({
        where: { id: userId },
        data: { logo: relativePath }
      });
    }

    // Return file metadata and URL
    return NextResponse.json({
      success: true,
      filename: file.name,
      storedFilename,
      filePath: relativePath,
      url: `/api/images/${storedFilename}`,
      fileSize: file.size,
      mimeType: file.type,
      uploadedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}

