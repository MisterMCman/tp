import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceNumber: string }> }
) {
  try {
    const { invoiceNumber } = await params;
    
    if (!invoiceNumber) {
      return NextResponse.json(
        { error: 'Invoice number is required' },
        { status: 400 }
      );
    }

    // Fetch invoice by invoice number
    const invoice = await prisma.invoice.findUnique({
      where: { invoiceNumber },
      include: {
        trainer: {
          include: {
            country: true
          }
        },
        training: {
          include: {
            topic: true,
            course: true,
            requests: {
              where: {
                status: 'ACCEPTED'
              },
              take: 1,
              orderBy: {
                updatedAt: 'desc'
              }
            }
          }
        }
      }
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Get the training request (should be the accepted one)
    const trainingRequest = invoice.training?.requests?.[0];

    if (!trainingRequest) {
      return NextResponse.json(
        { error: 'Training request not found for this invoice' },
        { status: 404 }
      );
    }

    // Transform to match PDF generation needs (same format as trainer accounting credits)
    const response = {
      id: trainingRequest.id,
      counterPrice: trainingRequest.counterPrice,
      proposedPrice: invoice.amount, // Use invoice amount as proposed price
      updatedAt: invoice.invoiceDate?.toISOString() || invoice.createdAt.toISOString(),
      trainer: {
        firstName: invoice.trainer.firstName,
        lastName: invoice.trainer.lastName,
        street: invoice.trainer.street,
        houseNumber: invoice.trainer.houseNumber,
        zipCode: invoice.trainer.zipCode,
        city: invoice.trainer.city,
        taxId: invoice.trainer.taxId,
        bio: invoice.trainer.bio,
        country: invoice.trainer.country ? {
          name: invoice.trainer.country.name,
          code: invoice.trainer.country.code
        } : null
      },
      training: {
        title: invoice.training?.title || 'Unknown Training',
        course: invoice.training?.course ? {
          title: invoice.training.course.title
        } : null
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching invoice data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice data' },
      { status: 500 }
    );
  }
}

