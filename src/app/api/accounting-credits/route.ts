import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trainerId = searchParams.get('trainerId');
    const companyId = searchParams.get('companyId');

    if (!trainerId && !companyId) {
      return NextResponse.json(
        { error: 'Either trainerId or companyId is required' },
        { status: 400 }
      );
    }

    if (trainerId) {
      // Fetch completed training requests for the trainer (ACCEPTED status + training COMPLETED)
      const completedRequests = await prisma.trainingRequest.findMany({
        where: {
          trainerId: parseInt(trainerId),
          status: 'ACCEPTED',
          training: {
            status: 'COMPLETED'
          }
        },
        include: {
          training: {
            include: {
              topic: true,
              course: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      // Transform to accounting credits format
      const accountingCredits = completedRequests.map(request => {
        const finalPrice = request.counterPrice || request.training.dailyRate;
        const invoiceNumber = generateInvoiceNumber(request.id, request.updatedAt);
        
        return {
          id: request.id,
          invoiceNumber,
          courseTitle: request.training.title,
          amount: finalPrice || 0,
          status: 'generated', // For now, all are generated immediately
          createdAt: request.createdAt.toISOString(),
          generatedAt: request.updatedAt.toISOString(),
          downloadUrl: `#download-${invoiceNumber}` // Frontend will handle download
        };
      });

      return NextResponse.json(accountingCredits);
    } else if (companyId) {
      // For companies, fetch invoices from the Invoice table for their trainings
      // First, get all trainings for this company
      const companyTrainings = await prisma.training.findMany({
        where: {
          companyId: parseInt(companyId)
        },
        select: {
          id: true
        }
      });
      
      const trainingIds = companyTrainings.map(t => t.id);
      
      // Fetch invoices for these trainings
      // Note: We only fetch invoices that have a trainingId set, since we can't link invoices without trainingId to companies
      const invoices = trainingIds.length > 0 ? await prisma.invoice.findMany({
        where: {
          trainingId: {
            in: trainingIds
          }
        },
        include: {
          training: {
            include: {
              topic: true,
              course: true,
              company: {
                select: {
                  id: true,
                  companyName: true
                }
              }
            }
          },
          trainer: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }) : [];
      
      console.log(`Found ${invoices.length} invoices for company ${companyId} (${trainingIds.length} trainings)`);

      // Transform to accounting credits format (companies see invoices, not credits)
      const accountingCredits = invoices.map(invoice => {
        return {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber || `INV-${invoice.id}`,
          courseTitle: invoice.training?.title || 'Unknown Training',
          amount: invoice.amount,
          status: invoice.status.toLowerCase() === 'paid' ? 'paid' : invoice.status.toLowerCase() === 'submitted' ? 'generated' : 'pending',
          createdAt: invoice.createdAt.toISOString(),
          generatedAt: invoice.invoiceDate?.toISOString() || invoice.createdAt.toISOString(),
          paidAt: invoice.paidDate?.toISOString(),
          downloadUrl: invoice.invoiceNumber ? `#download-${invoice.invoiceNumber}` : undefined,
          trainerName: invoice.trainer ? `${invoice.trainer.firstName} ${invoice.trainer.lastName}` : undefined,
          trainerId: invoice.trainer?.id,
          startDate: invoice.training?.startDate?.toISOString(),
          endDate: invoice.training?.endDate?.toISOString()
        };
      });

      return NextResponse.json(accountingCredits);
    }
  } catch (error) {
    console.error('Error fetching accounting credits/invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounting credits/invoices' },
      { status: 500 }
    );
  }
}

function generateInvoiceNumber(trainingRequestId: number, date: Date): string {
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const sequence = trainingRequestId.toString().padStart(4, '0');
  
  return `AC-${year}${month}${day}-01-${sequence}`;
} 