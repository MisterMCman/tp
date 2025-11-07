import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserData } from '@/lib/session';
import { CompanyUserRole } from '@prisma/client';

// GET - Get all users for the current user's company
export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserData();
    
    if (!currentUser || currentUser.userType !== 'TRAINING_COMPANY') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const companyId = (currentUser.companyId || currentUser.id) as number;
    
    // Get all users for this company
    const users = await prisma.companyUser.findMany({
      where: { companyId },
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
      },
      orderBy: [
        { role: 'asc' }, // ADMIN first
        { createdAt: 'asc' }
      ]
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching company users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST - Create a new user for the company
export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserData();
    
    if (!currentUser || currentUser.userType !== 'TRAINING_COMPANY') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can create users
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can create users' },
        { status: 403 }
      );
    }

    const companyId = (currentUser.companyId || currentUser.id) as number;
    const body = await request.json();
    const { email, firstName, lastName, phone, role } = body;

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, first name, and last name are required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.companyUser.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    // Validate role
    const validRole = role && ['ADMIN', 'EDITOR', 'VIEWER'].includes(role) 
      ? (role as CompanyUserRole) 
      : 'EDITOR';

    // Create the user
    const newUser = await prisma.companyUser.create({
      data: {
        email,
        firstName,
        lastName,
        phone: phone || null,
        role: validRole,
        companyId,
        isActive: true
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

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error('Error creating company user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

