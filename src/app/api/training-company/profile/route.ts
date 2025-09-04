import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTrainerData } from '@/lib/session';

export async function GET() {
  try {
    // Get current user to identify the training company
    const currentUser = getTrainerData();
    if (!currentUser || currentUser.userType !== 'TRAINING_COMPANY') {
      return NextResponse.json(
        { message: 'Nicht autorisiert oder kein Unternehmensaccount' },
        { status: 403 }
      );
    }

    // Fetch training company data
    const company = await prisma.trainingCompany.findUnique({
      where: { id: currentUser.id }
    });

    if (!company) {
      return NextResponse.json(
        { message: 'Unternehmen nicht gefunden' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      company: {
        id: company.id,
        userType: company.userType,
        companyName: company.companyName,
        contactName: company.contactName,
        email: company.email,
        phone: company.phone,
        address: company.address,
        bio: company.bio,
        logo: company.logo,
        website: company.website,
        industry: company.industry,
        employees: company.employees,
        consultantName: company.consultantName,
        status: company.status
      }
    });

  } catch (error: unknown) {
    console.error('Training company profile fetch error:', error);
    return NextResponse.json({
      message: 'Fehler beim Laden der Unternehmensdaten',
      details: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
    }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    // Get current user to identify the training company
    const currentUser = getTrainerData();
    if (!currentUser || currentUser.userType !== 'TRAINING_COMPANY') {
      return NextResponse.json(
        { message: 'Nicht autorisiert oder kein Unternehmensaccount' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      companyName,
      contactName,
      email,
      phone,
      address,
      bio,
      logo,
      website,
      industry,
      employees,
      consultantName
    } = body;

    // Validate required fields
    if (!companyName || !contactName || !email || !phone) {
      return NextResponse.json(
        { message: 'Alle erforderlichen Felder müssen ausgefüllt werden.' },
        { status: 400 }
      );
    }

    // Check if email is already taken by another user (excluding current user)
    const existingUser = await prisma.trainer.findFirst({
      where: {
        email,
        id: { not: currentUser.id }
      }
    });

    const existingCompany = await prisma.trainingCompany.findFirst({
      where: {
        email,
        id: { not: currentUser.id }
      }
    });

    if (existingUser || existingCompany) {
      return NextResponse.json(
        { message: 'Diese E-Mail-Adresse ist bereits vergeben.' },
        { status: 409 }
      );
    }

    // Update training company
    const updatedCompany = await prisma.trainingCompany.update({
      where: { id: currentUser.id },
      data: {
        companyName,
        contactName,
        email,
        phone,
        address,
        bio,
        logo,
        website,
        industry,
        employees,
        consultantName
      }
    });

    return NextResponse.json({
      message: 'Unternehmensprofil erfolgreich aktualisiert!',
      company: {
        id: updatedCompany.id,
        userType: updatedCompany.userType,
        companyName: updatedCompany.companyName,
        contactName: updatedCompany.contactName,
        email: updatedCompany.email,
        phone: updatedCompany.phone,
        address: updatedCompany.address,
        bio: updatedCompany.bio,
        logo: updatedCompany.logo,
        website: updatedCompany.website,
        industry: updatedCompany.industry,
        employees: updatedCompany.employees,
        consultantName: updatedCompany.consultantName,
        status: updatedCompany.status
      }
    });

  } catch (error: unknown) {
    console.error('Training company profile update error:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
      return NextResponse.json({
        message: `Aktualisierungsfehler: ${error.message}`,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, { status: 500 });
    }
    return NextResponse.json({ message: 'Ein unbekannter Fehler ist aufgetreten.' }, { status: 500 });
  }
}

