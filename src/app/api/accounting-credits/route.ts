import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trainerId = searchParams.get('trainerId');

    if (!trainerId) {
      return NextResponse.json(
        { error: 'Trainer ID is required' },
        { status: 400 }
      );
    }

    // Fetch completed inquiries for the trainer
    const completedInquiries = await prisma.inquiry.findMany({
      where: {
        trainerId: parseInt(trainerId),
        status: 'COMPLETED' // Only completed trainings have credits
      },
      include: {
        event: {
          include: {
            course: {
              include: {
                topic: true
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Transform to accounting credits format
    const accountingCredits = completedInquiries.map(inquiry => {
      const finalPrice = inquiry.counterPrice || inquiry.proposedPrice;
      const invoiceNumber = generateInvoiceNumber(inquiry.id, inquiry.updatedAt);
      
      return {
        id: inquiry.id,
        invoiceNumber,
        courseTitle: inquiry.event.course.title,
        amount: finalPrice,
        status: 'generated', // For now, all are generated immediately
        createdAt: inquiry.createdAt.toISOString(),
        generatedAt: inquiry.updatedAt.toISOString(),
        downloadUrl: `#download-${invoiceNumber}` // Frontend will handle download
      };
    });

    return NextResponse.json(accountingCredits);
  } catch (error) {
    console.error('Error fetching accounting credits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounting credits' },
      { status: 500 }
    );
  }
}

function generateInvoiceNumber(inquiryId: number, date: Date): string {
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const sequence = inquiryId.toString().padStart(4, '0');
  
  return `AC-${year}${month}${day}-01-${sequence}`;
} 