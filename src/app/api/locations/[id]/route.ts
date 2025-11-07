import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserData } from '@/lib/session';
import { geocodeAddress } from '@/lib/geocoding';

/**
 * GET /api/locations/[id]
 * Get a specific location
 */
export async function GET(
  req: NextRequest,
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

    const locationId = parseInt(params.id);
    if (isNaN(locationId)) {
      return NextResponse.json(
        { error: 'Invalid location ID' },
        { status: 400 }
      );
    }

    const userCompanyId = (currentUser.companyId || currentUser.id) as number;

    const location = await prisma.location.findFirst({
      where: {
        id: locationId,
        companyId: userCompanyId // Ensure user can only access their own locations
      },
      include: {
        country: true,
        trainings: {
          select: {
            id: true
          }
        }
      }
    });

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ location });
  } catch (error) {
    console.error('Error fetching location:', error);
    return NextResponse.json(
      { error: 'Failed to fetch location' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/locations/[id]
 * Update a location
 */
export async function PATCH(
  req: NextRequest,
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

    const locationId = parseInt(params.id);
    if (isNaN(locationId)) {
      return NextResponse.json(
        { error: 'Invalid location ID' },
        { status: 400 }
      );
    }

    const userCompanyId = (currentUser.companyId || currentUser.id) as number;

    // Verify location belongs to company
    const existingLocation = await prisma.location.findFirst({
      where: {
        id: locationId,
        companyId: userCompanyId
      }
    });

    if (!existingLocation) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      name,
      type,
      onlinePlatform,
      onlineLink,
      street,
      houseNumber,
      zipCode,
      city,
      countryId,
      description
    } = body;

    // Geocode PHYSICAL location if address changed
    let latitude: number | null = existingLocation.latitude;
    let longitude: number | null = existingLocation.longitude;

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
    } else if (type === 'ONLINE') {
      // Clear coordinates for online locations
      latitude = null;
      longitude = null;
    }

    const location = await prisma.location.update({
      where: { id: locationId },
      data: {
        name,
        type: type === 'ONLINE' ? 'ONLINE' : 'PHYSICAL',
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
    console.error('Error updating location:', error);
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/locations/[id]
 * Delete a location (only if not used in any trainings)
 */
export async function DELETE(
  req: NextRequest,
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

    const locationId = parseInt(params.id);
    if (isNaN(locationId)) {
      return NextResponse.json(
        { error: 'Invalid location ID' },
        { status: 400 }
      );
    }

    const userCompanyId = (currentUser.companyId || currentUser.id) as number;

    // Verify location belongs to company
    const existingLocation = await prisma.location.findFirst({
      where: {
        id: locationId,
        companyId: userCompanyId
      },
      include: {
        trainings: true
      }
    });

    if (!existingLocation) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // Check if location is used in any trainings
    if (existingLocation.trainings.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete location that is used in trainings' },
        { status: 400 }
      );
    }

    await prisma.location.delete({
      where: { id: locationId }
    });

    return NextResponse.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error deleting location:', error);
    return NextResponse.json(
      { error: 'Failed to delete location' },
      { status: 500 }
    );
  }
}

