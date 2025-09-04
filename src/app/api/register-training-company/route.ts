import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      companyName,
      contactName,
      email,
      phone,
      address,
      countryId,
      bio,
      website,
      industry,
      employees,
      consultantName
    } = body;

    // Validate required fields
    if (!companyName || !contactName || !email || !phone || !countryId) {
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

    // Create the training company
    const trainingCompany = await prisma.trainingCompany.create({
      data: {
        userType: 'TRAINING_COMPANY',
        companyName,
        contactName,
        email,
        phone,
        address,
        countryId,
        bio,
        website,
        industry,
        employees,
        consultantName,
        status: 'ACTIVE'
      }
    });

    // Return success response
    return NextResponse.json({
      message: 'Unternehmensregistrierung erfolgreich!',
      company: {
        id: trainingCompany.id,
        companyName: trainingCompany.companyName,
        contactName: trainingCompany.contactName,
        email: trainingCompany.email,
        phone: trainingCompany.phone,
        address: trainingCompany.address,
        countryId: trainingCompany.countryId,
        bio: trainingCompany.bio,
        website: trainingCompany.website,
        industry: trainingCompany.industry,
        employees: trainingCompany.employees,
        consultantName: trainingCompany.consultantName,
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
