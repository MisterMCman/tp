import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const countries = await prisma.country.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({
      countries: countries.map(country => ({
        id: country.id,
        name: country.name,
        code: country.code
      }))
    });
  } catch (error: unknown) {
    console.error('Error fetching countries:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Länder' },
      { status: 500 }
    );
  }
}

