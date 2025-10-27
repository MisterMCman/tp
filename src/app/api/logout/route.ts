import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { message: 'Token ist erforderlich.' },
        { status: 400 }
      );
    }

    // Try to find and invalidate the token for both trainer and company
    let tokenFound = false;

    // Check trainer tokens first
    try {
      const trainerToken = await prisma.loginToken.findUnique({
        where: { token }
      });

      if (trainerToken) {
        // Mark the token as used to invalidate it
        await prisma.loginToken.update({
          where: { token },
          data: {
            used: true,
            usedAt: new Date()
          }
        });
        tokenFound = true;
      }
    } catch (error) {
      console.warn('Error updating trainer token:', error);
    }

    // If not found in trainer tokens, check company tokens
    if (!tokenFound) {
      try {
        const companyToken = await prisma.trainingCompanyLoginToken.findUnique({
          where: { token }
        });

        if (companyToken) {
          // Mark the token as used to invalidate it
          await prisma.trainingCompanyLoginToken.update({
            where: { token },
            data: {
              used: true,
              usedAt: new Date()
            }
          });
          tokenFound = true;
        }
      } catch (error) {
        console.warn('Error updating company token:', error);
      }
    }

    if (!tokenFound) {
      return NextResponse.json(
        { message: 'Token nicht gefunden.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Erfolgreich abgemeldet.',
      success: true
    });

  } catch (error) {
    console.error('Error during logout:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abmelden.' },
      { status: 500 }
    );
  }
}
