import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserData } from '@/lib/session';
import { CompanyUserRole } from '@prisma/client';

// GET - Get a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = getUserData();
    
    if (!currentUser || currentUser.userType !== 'TRAINING_COMPANY') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const companyId = (currentUser.companyId || currentUser.id) as number;
    const userId = parseInt(params.id);

    const user = await prisma.companyUser.findFirst({
      where: {
        id: userId,
        companyId // Ensure user belongs to same company
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PATCH - Update a user
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = getUserData();
    
    if (!currentUser || currentUser.userType !== 'TRAINING_COMPANY') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const companyId = (currentUser.companyId || currentUser.id) as number;
    const userId = parseInt(params.id);
    const currentUserId = currentUser.id as number;
    const isAdmin = currentUser.role === 'ADMIN';

    // Check if user exists and belongs to same company
    const existingUser = await prisma.companyUser.findFirst({
      where: {
        id: userId,
        companyId
      }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Users can only update themselves, unless they're admin
    if (userId !== currentUserId && !isAdmin) {
      return NextResponse.json(
        { error: 'You can only update your own profile' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, firstName, lastName, phone, role, isActive } = body;

    // Build update data
    const updateData: any = {};
    if (email !== undefined) {
      // Check if email is already taken by another user
      const emailTaken = await prisma.companyUser.findFirst({
        where: {
          email,
          id: { not: userId }
        }
      });
      if (emailTaken) {
        return NextResponse.json(
          { error: 'Diese E-Mail-Adresse ist bereits vergeben' },
          { status: 409 }
        );
      }
      updateData.email = email;
    }
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;

    // Only admins can change role and isActive
    if (isAdmin) {
      if (role !== undefined && ['ADMIN', 'EDITOR', 'VIEWER'].includes(role)) {
        updateData.role = role as CompanyUserRole;
      }
      if (isActive !== undefined) {
        updateData.isActive = isActive;
      }
    }

    // Prevent removing the last admin
    if (isAdmin && role === 'EDITOR' && existingUser.role === 'ADMIN') {
      const adminCount = await prisma.companyUser.count({
        where: {
          companyId,
          role: 'ADMIN',
          isActive: true
        }
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last admin' },
          { status: 400 }
        );
      }
    }

    const updatedUser = await prisma.companyUser.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a user (soft delete by setting isActive to false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = getUserData();
    
    if (!currentUser || currentUser.userType !== 'TRAINING_COMPANY') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can delete users
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can delete users' },
        { status: 403 }
      );
    }

    const companyId = (currentUser.companyId || currentUser.id) as number;
    const userId = parseInt(params.id);
    const currentUserId = currentUser.id as number;

    // Cannot delete yourself
    if (userId === currentUserId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Check if user exists and belongs to same company
    const existingUser = await prisma.companyUser.findFirst({
      where: {
        id: userId,
        companyId
      }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent deleting the last admin
    if (existingUser.role === 'ADMIN') {
      const adminCount = await prisma.companyUser.count({
        where: {
          companyId,
          role: 'ADMIN',
          isActive: true
        }
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last admin' },
          { status: 400 }
        );
      }
    }

    // Soft delete by setting isActive to false
    await prisma.companyUser.update({
      where: { id: userId },
      data: { isActive: false }
    });

    return NextResponse.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}

