import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Funktion zum Validieren der E-Mail-Adresse
function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Funktion zum Validieren der Telefonnummer
function isValidPhone(phone: string): boolean {
    // Weniger striktes Regex für Telefonnummern
    const phoneRegex = /^[\d\s\+\-\(\)\.]+$/;
    return phoneRegex.test(phone);
}

// Diese Funktion verarbeitet den POST-Request für die Trainer-Registrierung
export async function POST(req: Request) {
    try {
        // Daten aus dem Request Body lesen
        const body = await req.json();
        const { firstName, lastName, email } = body;

        console.log('Received registration data:', body);

        // Validierung der Eingabedaten - nur firstName, lastName, email erforderlich
        if (!firstName || !lastName || !email) {
            return NextResponse.json(
                { message: 'Vorname, Nachname und E-Mail sind erforderlich.' },
                { status: 400 }
            );
        }

        if (!isValidEmail(email)) {
            return NextResponse.json(
                { message: 'Bitte eine gültige E-Mail-Adresse eingeben.' },
                { status: 400 }
            );
        }

        // Check if trainer with this email already exists
        const existingTrainer = await prisma.trainer.findUnique({
            where: { email }
        });

        if (existingTrainer) {
            return NextResponse.json(
                { message: 'Ein Trainer mit dieser E-Mail-Adresse ist bereits registriert.' },
                { status: 409 }
            );
        }

        // Trainer erstellen mit minimalen Daten - Status wird auf INACTIVE gesetzt bis Profil vollständig ist
        const newTrainer = await prisma.trainer.create({
            data: {
                firstName,
                lastName,
                email,
                phone: '000000000', // Placeholder - muss bei Profil-Vervollständigung geändert werden
                status: 'INACTIVE' // Inactive until profile is completed
            },
        });

        // Erstelle erste Version für Versionierung (nur mit minimalen Daten)
        await prisma.trainerProfileVersion.create({
            data: {
                trainerId: newTrainer.id,
                version: 1,
                firstName,
                lastName,
                email,
                phone: '000000000',
                changedFields: JSON.stringify(['firstName', 'lastName', 'email']),
                changedBy: 'trainer'
            }
        });

        // Trainer Response (minimal)
        const trainerResponse = {
            id: newTrainer.id,
            firstName: newTrainer.firstName,
            lastName: newTrainer.lastName,
            email: newTrainer.email,
            status: newTrainer.status,
            createdAt: newTrainer.createdAt.toISOString(),
        };

        // Erfolgreiche Antwort
        return NextResponse.json({ 
            message: 'Trainer erfolgreich registriert!',
            trainer: trainerResponse 
        }, { status: 200 });

    } catch (error: unknown) {
        // Fehlerbehandlung
        console.error('Registration error:', error);
        if (error instanceof Error) {
            console.error('Error stack:', error.stack);
            return NextResponse.json({ 
                message: `Fehler bei der Registrierung: ${error.message}`,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }, { status: 500 });
        }
        return NextResponse.json({ message: 'Ein unbekannter Fehler ist aufgetreten.' }, { status: 500 });
    }
}
