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

    // Fetch training company data with country relation
    const company = await prisma.trainingCompany.findUnique({
      where: { id: currentUser.id },
      include: {
        country: true
      }
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
        firstName: company.firstName,
        lastName: company.lastName,
        email: company.email,
        phone: company.phone,
        address: company.address,
        street: company.street,
        houseNumber: company.houseNumber,
        zipCode: company.zipCode,
        city: company.city,
        country: company.country,
        domain: company.domain,
        bio: company.bio,
        logo: company.logo,
        website: company.website,
        industry: company.industry,
        employees: company.employees,
        consultantName: company.consultantName,
        vatId: company.vatId,
        billingEmail: company.billingEmail,
        billingNotes: company.billingNotes,
        iban: company.iban,
        taxId: company.taxId,
        tags: company.tags,
        onboardingStatus: company.onboardingStatus,
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
      firstName,
      lastName,
      email,
      phone,
      address,
      street,
      houseNumber,
      zipCode,
      city,
      countryId,
      bio,
      logo,
      website,
      industry,
      employees,
      consultantName,
      vatId,
      billingEmail,
      billingNotes,
      iban,
      taxId,
      tags
    } = body;

    // Validate required fields
    if (!companyName || !email || !phone) {
      return NextResponse.json(
        { message: 'Alle erforderlichen Felder müssen ausgefüllt werden.' },
        { status: 400 }
      );
    }

    // If firstName and lastName are provided, update contactName for legacy compatibility
    let updatedContactName = contactName;
    if (firstName && lastName) {
      updatedContactName = `${firstName} ${lastName}`;
    }

    // If address fields are provided, update address for legacy compatibility
    let updatedAddress = address;
    if (street && houseNumber && zipCode && city) {
      updatedAddress = `${street} ${houseNumber}, ${zipCode} ${city}`;
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
        contactName: updatedContactName,
        firstName: firstName || null,
        lastName: lastName || null,
        email,
        phone,
        address: updatedAddress,
        street: street || null,
        houseNumber: houseNumber || null,
        zipCode: zipCode || null,
        city: city || null,
        countryId: countryId || null,
        bio: bio || null,
        logo: logo || null,
        website: website || null,
        industry: industry || null,
        employees: employees || null,
        consultantName: consultantName || null,
        vatId: vatId || null,
        billingEmail: billingEmail || null,
        billingNotes: billingNotes || null,
        iban: iban || null,
        taxId: taxId || null,
        tags: tags || null
      },
      include: {
        country: true
      }
    });

    return NextResponse.json({
      message: 'Unternehmensprofil erfolgreich aktualisiert!',
      company: {
        id: updatedCompany.id,
        userType: updatedCompany.userType,
        companyName: updatedCompany.companyName,
        contactName: updatedCompany.contactName,
        firstName: updatedCompany.firstName,
        lastName: updatedCompany.lastName,
        email: updatedCompany.email,
        phone: updatedCompany.phone,
        address: updatedCompany.address,
        street: updatedCompany.street,
        houseNumber: updatedCompany.houseNumber,
        zipCode: updatedCompany.zipCode,
        city: updatedCompany.city,
        country: updatedCompany.country,
        bio: updatedCompany.bio,
        logo: updatedCompany.logo,
        website: updatedCompany.website,
        industry: updatedCompany.industry,
        employees: updatedCompany.employees,
        consultantName: updatedCompany.consultantName,
        vatId: updatedCompany.vatId,
        billingEmail: updatedCompany.billingEmail,
        billingNotes: updatedCompany.billingNotes,
        iban: updatedCompany.iban,
        taxId: updatedCompany.taxId,
        tags: updatedCompany.tags,
        onboardingStatus: updatedCompany.onboardingStatus,
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

