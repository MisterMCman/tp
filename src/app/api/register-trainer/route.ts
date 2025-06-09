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
        const { firstName, lastName, email, phone, address, topics, bio, profilePicture } = body;

        console.log('Received registration data:', body);

        // Validierung der Eingabedaten
        if (!firstName || !lastName || !email || !phone || !address) {
            return NextResponse.json(
                { message: 'Vorname, Nachname, E-Mail, Telefonnummer und Adresse sind erforderlich.' },
                { status: 400 }
            );
        }

        if (!isValidEmail(email)) {
            return NextResponse.json(
                { message: 'Bitte eine gültige E-Mail-Adresse eingeben.' },
                { status: 400 }
            );
        }

        if (!isValidPhone(phone)) {
            return NextResponse.json(
                { message: 'Bitte eine gültige Telefonnummer eingeben.' },
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

        // Trainer erstellen mit allen Feldern aus dem Schema
        const newTrainer = await prisma.trainer.create({
            data: {
                firstName,
                lastName,
                email,
                phone,
                address,
                bio: bio || null,
                profilePicture: profilePicture || null,
                status: 'ACTIVE'
            },
        });

        // TrainerTopic-Einträge erstellen falls topics vorhanden
        if (topics && topics.length > 0) {
            // Zuerst prüfen, ob alle Topics in der Datenbank existieren
            // Falls nicht, erstellen wir sie
            for (const topicName of topics) {
                const existingTopic = await prisma.topic.findFirst({
                    where: { name: topicName }
                });
                
                if (!existingTopic) {
                    await prisma.topic.create({
                        data: { name: topicName }
                    });
                }
            }
            
            // Dann Verbindungen erstellen
            for (const topicName of topics) {
                const topic = await prisma.topic.findFirst({
                    where: { name: topicName }
                });
                
                if (topic) {
                    await prisma.trainerTopic.create({
                        data: {
                            trainerId: newTrainer.id,
                            topicId: topic.id
                        }
                    });
                }
            }
        }

        // Trainer mit Topics für die Antwort laden
        const trainerWithTopics = await prisma.trainer.findUnique({
            where: { id: newTrainer.id },
            include: {
                topics: {
                    include: {
                        topic: true
                    }
                }
            }
        });

        const trainerResponse = {
            id: newTrainer.id,
            firstName: newTrainer.firstName,
            lastName: newTrainer.lastName,
            email: newTrainer.email,
            phone: newTrainer.phone,
            address: newTrainer.address,
            bio: newTrainer.bio || '',
            profilePicture: newTrainer.profilePicture || '',
            topics: trainerWithTopics?.topics.map(t => t.topic.name) || [],
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
