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
      consultantName,
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

    // Check if email already exists (for both trainers and companies)
    const existingTrainer = await prisma.trainer.findUnique({
      where: { email }
    });

    const existingCompany = await prisma.trainingCompany.findUnique({
      where: { email }
    });

    if (existingTrainer || existingCompany) {
      return NextResponse.json(
        { message: 'Diese E-Mail-Adresse ist bereits registriert.' },
        { status: 409 }
      );
    }

    // Extract domain from email for company identification
    const domain = email.split('@')[1];

    // Combine first and last name for legacy contactName field
    const contactName = `${firstName} ${lastName}`;

    // Combine address fields for legacy address field
    const address = `${street} ${houseNumber}, ${zipCode} ${city}`;

    // Create the training company
    const trainingCompany = await prisma.trainingCompany.create({
      data: {
        userType: 'TRAINING_COMPANY',
        companyName,
        firstName,
        lastName,
        contactName, // Legacy field
        email,
        phone,
        street,
        houseNumber,
        zipCode,
        city,
        address, // Legacy field
        domain,
        countryId,
        // Optional fields
        bio: bio || null,
        website: website || null,
        industry: industry || null,
        employees: employees || null,
        consultantName: consultantName || null,
        vatId: vatId || null,
        billingEmail: billingEmail || null,
        billingNotes: billingNotes || null,
        tags: tags || null,
        onboardingStatus: 'Profil unvollständig',
        status: 'ACTIVE'
      }
    });

    // Return success response
    return NextResponse.json({
      message: 'Unternehmensregistrierung erfolgreich!',
      company: {
        id: trainingCompany.id,
        companyName: trainingCompany.companyName,
        firstName: trainingCompany.firstName,
        lastName: trainingCompany.lastName,
        email: trainingCompany.email,
        phone: trainingCompany.phone,
        street: trainingCompany.street,
        houseNumber: trainingCompany.houseNumber,
        zipCode: trainingCompany.zipCode,
        city: trainingCompany.city,
        countryId: trainingCompany.countryId,
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
