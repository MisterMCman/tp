import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Der Pfad zu deinem Prisma-Client

export async function GET(req: Request) {
  // Die URL und die Query-Parameter auslesen
  const url = new URL(req.url);
  const trainerId = url.searchParams.get('trainerId');  // trainerId als Query-Parameter erhalten

  if (!trainerId) {
    return NextResponse.json({ error: 'trainerId is required' }, { status: 400 });
  }

  try {
    const availabilities = await prisma.availability.findMany({
      where: {
        trainerId: Number(trainerId),
      },
    });

    return NextResponse.json(availabilities, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error occurred.' }, { status: 500 });
  }
}
