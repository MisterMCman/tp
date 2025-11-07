import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserData } from '@/lib/session';
import { geocodeAddress } from '@/lib/geocoding';

/**
 * POST /api/locations
 * Create a new location (ONLINE or PHYSICAL)
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = getUserData();
    if (!currentUser || currentUser.userType !== 'TRAINING_COMPANY') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      name,
      type, // 'ONLINE' or 'PHYSICAL'
      onlinePlatform, // For ONLINE: 'ZOOM', 'TEAMS', 'GOOGLE_MEET', 'OTHER'
      onlineLink, // For ONLINE: meeting link
      street, // For PHYSICAL
      houseNumber, // For PHYSICAL
      zipCode, // For PHYSICAL
      city, // For PHYSICAL
      countryId, // For PHYSICAL
      description
    } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    // Validate ONLINE location
    if (type === 'ONLINE') {
      if (!onlinePlatform) {
        return NextResponse.json(
          { error: 'Online platform is required for ONLINE locations' },
          { status: 400 }
        );
      }
    }

    // Validate PHYSICAL location
    if (type === 'PHYSICAL') {
      if (!street || !city) {
        return NextResponse.json(
          { error: 'Street and city are required for PHYSICAL locations' },
          { status: 400 }
        );
      }
    }

    // Geocode PHYSICAL location
    let latitude: number | null = null;
    let longitude: number | null = null;

    if (type === 'PHYSICAL' && street && city) {
      const country = countryId 
        ? await prisma.country.findUnique({ where: { id: parseInt(countryId) } })
        : null;

      const geocodeResult = await geocodeAddress(
        street,
        houseNumber,
        zipCode,
        city,
        country?.name
      );

      if (geocodeResult) {
        latitude = geocodeResult.latitude;
        longitude = geocodeResult.longitude;
      }
    }

    // Get company ID from current user
    const userCompanyId = (currentUser.companyId || currentUser.id) as number;

    // Create location
    const location = await prisma.location.create({
      data: {
        name,
        type: type === 'ONLINE' ? 'ONLINE' : 'PHYSICAL',
        companyId: userCompanyId, // Set companyId for reusable locations
        onlinePlatform: type === 'ONLINE' ? onlinePlatform : null,
        onlineLink: type === 'ONLINE' ? onlineLink : null,
        street: type === 'PHYSICAL' ? street : null,
        houseNumber: type === 'PHYSICAL' ? houseNumber : null,
        zipCode: type === 'PHYSICAL' ? zipCode : null,
        city: type === 'PHYSICAL' ? city : null,
        countryId: type === 'PHYSICAL' && countryId ? parseInt(countryId) : null,
        latitude,
        longitude,
        description
      },
      include: {
        country: true
      }
    });

    return NextResponse.json({ location });
  } catch (error) {
    console.error('Error creating location:', error);
    return NextResponse.json(
      { error: 'Failed to create location' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/locations
 * Get all locations for the current company
 */
export async function GET() {
  try {
    const currentUser = getUserData();
    if (!currentUser || currentUser.userType !== 'TRAINING_COMPANY') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get company ID from current user
    const userCompanyId = (currentUser.companyId || currentUser.id) as number;

    // Return only locations owned by this company (where companyId is set)
    const locations = await prisma.location.findMany({
      where: {
        companyId: userCompanyId
      },
      include: {
        country: true,
        trainings: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ locations });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}

