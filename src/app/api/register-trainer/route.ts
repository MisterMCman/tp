import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Diese Funktion verarbeitet den POST-Request für die Trainer-Registrierung
export async function POST(req: Request) {
    try {
        // Daten aus dem Request Body lesen
        const body = await req.json();  
        const { firstName, lastName, email, phone, availableFrom, availableTo } = body;

        // Trainer und Verfügbarkeiten erstellen
        const newTrainer = await prisma.trainer.create({
            data: {
                firstName: firstName,  
                lastName: lastName,    
                email: email,
                phone: phone,           // phone ist jetzt erforderlich
                availabilities: {
                    create: [
                        {
                            availableDate: new Date(availableFrom),
                            startTime: new Date(availableFrom),
                            endTime: new Date(availableTo),
                        },
                    ],
                },
            },
        });

        return NextResponse.json(newTrainer, { status: 200 });
    } catch (error: unknown) {
        // Fehlerbehandlung: Überprüfen, ob der Fehler eine 'message'-Eigenschaft hat
        if (error instanceof Error) {
            console.error('Error creating trainer:', error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ error: 'Unknown error occurred.' }, { status: 500 });
    }
}
