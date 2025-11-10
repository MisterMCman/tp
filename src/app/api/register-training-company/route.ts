import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      companyName,
      firstName,
      lastName,
      email,
      phone,
      street,
      houseNumber,
      zipCode,
      city,
      countryId,
      // Optional fields
      bio,
      website,
      industry,
      employees,
      companyType,
      vatId,
      billingEmail,
      billingNotes,
      tags
    } = body;

    // Validate required fields
    if (!companyName || !firstName || !lastName || !email || !phone || !street || !houseNumber || !zipCode || !city || !countryId) {
      return NextResponse.json(
        { message: 'Alle erforderlichen Felder müssen ausgefüllt werden.' },
        { status: 400 }
      );
    }

    // Check if email already exists (for both trainers and company users)
    const existingTrainer = await prisma.trainer.findUnique({
      where: { email }
    });

    const existingCompanyUser = await prisma.companyUser.findUnique({
      where: { email }
    });

    if (existingTrainer || existingCompanyUser) {
      return NextResponse.json(
        { message: 'Diese E-Mail-Adresse ist bereits registriert.' },
        { status: 409 }
      );
    }

    // Extract domain from email for company identification
    const domain = email.split('@')[1];

    // Create the training company (without user data)
    const trainingCompany = await prisma.trainingCompany.create({
      data: {
        userType: 'TRAINING_COMPANY',
        companyName,
        phone: phone || null, // Keep as fallback for legacy
        street,
        houseNumber,
        zipCode,
        city,
        domain,
        countryId,
        // Optional fields
        bio: bio || null,
        website: website || null,
        industry: industry || null,
        employees: employees || null,
        companyType: companyType || null,
        vatId: vatId || null,
        billingEmail: billingEmail || null,
        billingNotes: billingNotes || null,
        tags: tags || null,
        onboardingStatus: 'Profil unvollständig',
        status: 'ACTIVE',
        // Create the first CompanyUser (ADMIN) along with the company
        users: {
          create: {
            email,
            firstName,
            lastName,
            phone: phone || null,
            role: 'ADMIN',
            isActive: true
          }
        }
      },
      include: {
        users: {
          where: {
            role: 'ADMIN',
            isActive: true
          },
          take: 1
        },
        country: true
      }
    });

    const adminUser = trainingCompany.users[0];

    // Return success response
    return NextResponse.json({
      message: 'Unternehmensregistrierung erfolgreich!',
      company: {
        id: trainingCompany.id,
        userType: trainingCompany.userType,
        companyName: trainingCompany.companyName,
        firstName: adminUser?.firstName || '',
        lastName: adminUser?.lastName || '',
        email: adminUser?.email || '',
        phone: adminUser?.phone || trainingCompany.phone || '',
        street: trainingCompany.street,
        houseNumber: trainingCompany.houseNumber,
        zipCode: trainingCompany.zipCode,
        city: trainingCompany.city,
        countryId: trainingCompany.countryId,
        country: trainingCompany.country,
        domain: trainingCompany.domain,
        onboardingStatus: trainingCompany.onboardingStatus,
        status: trainingCompany.status
      }
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Training company registration error:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
      return NextResponse.json({
        message: `Registrierungsfehler: ${error.message}`,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, { status: 500 });
    }
    return NextResponse.json({ message: 'Ein unbekannter Fehler ist aufgetreten.' }, { status: 500 });
  }
}
