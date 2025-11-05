import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const countries = await prisma.country.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    // Sort countries: Deutschland first, then Österreich, then Schweiz, then rest alphabetically
    const sortedCountries = countries
      .map(country => ({
        id: country.id,
        name: country.name,
        code: country.code
      }))
      .sort((a, b) => {
        // Priority countries (German-speaking)
        const priority = ['Deutschland', 'Österreich', 'Schweiz'];
        const aIndex = priority.indexOf(a.name);
        const bIndex = priority.indexOf(b.name);
        
        // If both are priority countries, maintain their order
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        
        // If only a is priority, it comes first
        if (aIndex !== -1) return -1;
        
        // If only b is priority, it comes first
        if (bIndex !== -1) return 1;
        
        // Both are non-priority, sort alphabetically
        return a.name.localeCompare(b.name, 'de');
      });

    return NextResponse.json({
      countries: sortedCountries
    });
  } catch (error: unknown) {
    console.error('Error fetching countries:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Länder' },
      { status: 500 }
    );
  }
}

