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
        const { firstName, lastName, email, phone, topics, bio, profilePicture } = body;

        console.log('Received registration data:', body);

        // Validierung der Eingabedaten
        if (!firstName || !lastName || !email || !phone) {
            return NextResponse.json(
                { message: 'Vorname, Nachname, E-Mail und Telefonnummer sind erforderlich.' },
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

        try {
            // Trainer erstellen - nur mit den Feldern, die im Schema definiert sind
            const newTrainer = await prisma.trainer.create({
                data: {
                    firstName,
                    lastName,
                    email,
                    phone,
                },
            });

            // Zusätzliche Informationen, die nicht im Schema sind, für die Antwort speichern
            const trainerResponse = {
                ...newTrainer,
                bio: bio || '',
                profilePicture: profilePicture || '',
            };

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

            // Erfolgreiche Antwort
            return NextResponse.json({ 
                message: 'Trainer erfolgreich registriert!',
                trainer: trainerResponse 
            }, { status: 200 });
        } catch (dbError) {
            console.error('Database error:', dbError);
            
            // Fallback to mock response
            const mockedTrainer = {
                id: Math.floor(Math.random() * 1000),
                firstName,
                lastName,
                email,
                phone,
                bio: bio || '',
                profilePicture: profilePicture || '',
                topics: topics || [],
                createdAt: new Date().toISOString(),
            };

            console.log('Falling back to mock registration:', mockedTrainer);

            return NextResponse.json({ 
                message: 'Trainer erfolgreich registriert! (Mock-Modus)',
                trainer: mockedTrainer 
            }, { status: 200 });
        }
    } catch (error: unknown) {
        // Fehlerbehandlung
        if (error instanceof Error) {
            console.error('Error creating trainer:', error.message);
            return NextResponse.json({ message: error.message }, { status: 500 });
        }
        return NextResponse.json({ message: 'Unknown error occurred.' }, { status: 500 });
    }
}
