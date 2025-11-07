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
        const { firstName, lastName, email, phone, street, houseNumber, zipCode, city, countryId, topics, topicsWithLevels, bio, profilePicture, isCompany, companyName, topicSuggestions, dailyRate } = body;

        console.log('Received registration data:', body);

        // Validierung der Eingabedaten
        if (!firstName || !lastName || !email || !phone || !street || !zipCode || !city || !countryId) {
            return NextResponse.json(
                { message: 'Vorname, Nachname, E-Mail, Telefonnummer, Straße, PLZ, Stadt und Land sind erforderlich.' },
                { status: 400 }
            );
        }

        // Validierung für Firmenfelder
        if (isCompany && !companyName) {
            return NextResponse.json(
                { message: 'Firmenname ist erforderlich wenn als Firma registriert wird.' },
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
                street: street || null,
                houseNumber: houseNumber || null,
                zipCode: zipCode || null,
                city: city || null,
                countryId: parseInt(countryId),
                bio: bio || null,
                profilePicture: profilePicture || null,
                isCompany: isCompany || false,
                companyName: companyName || null,
                dailyRate: dailyRate || null,
                status: 'ACTIVE'
            },
        });

        // Erstelle erste Version für Versionierung
        await prisma.trainerProfileVersion.create({
            data: {
                trainerId: newTrainer.id,
                version: 1,
                firstName,
                lastName,
                email,
                phone,
                street: street || null,
                houseNumber: houseNumber || null,
                zipCode: zipCode || null,
                city: city || null,
                countryId: parseInt(countryId),
                bio,
                profilePicture,
                companyName,
                isCompany,
                dailyRate,
                changedFields: JSON.stringify(['firstName', 'lastName', 'email', 'phone', 'street', 'houseNumber', 'zipCode', 'city', 'countryId', 'bio', 'profilePicture', 'companyName', 'isCompany', 'dailyRate']),
                changedBy: 'trainer'
            }
        });

        // TrainerTopic-Einträge erstellen falls topics vorhanden
        const topicsToProcess = topicsWithLevels || [];
        
        if (topicsToProcess && topicsToProcess.length > 0) {
            // Zuerst prüfen, ob alle Topics in der Datenbank existieren
            // Falls nicht, erstellen wir sie
            for (const topicItem of topicsToProcess) {
                const topicName = typeof topicItem === 'string' ? topicItem : topicItem.name;
                const existingTopic = await prisma.topic.findFirst({
                    where: { name: topicName }
                });

                if (!existingTopic) {
                    await prisma.topic.create({
                        data: { 
                            name: topicName,
                            slug: topicName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                        }
                    });
                }
            }

            // Dann Verbindungen erstellen mit expertise levels
            for (const topicItem of topicsToProcess) {
                const topicName = typeof topicItem === 'string' ? topicItem : topicItem.name;
                const expertiseLevel = typeof topicItem === 'string' ? 'GRUNDLAGE' : (topicItem.level || 'GRUNDLAGE');
                
                const topic = await prisma.topic.findFirst({
                    where: { name: topicName }
                });

                if (topic) {
                    await prisma.trainerTopic.create({
                        data: {
                            trainerId: newTrainer.id,
                            topicId: topic.id,
                            expertiseLevel: expertiseLevel as 'GRUNDLAGE' | 'FORTGESCHRITTEN' | 'EXPERTE'
                        }
                    });
                }
            }
        }

        // TopicSuggestions erstellen falls vorhanden
        if (topicSuggestions && topicSuggestions.length > 0) {
            for (const suggestionName of topicSuggestions) {
                // Check if suggestion already exists (to avoid duplicates)
                const existingSuggestion = await prisma.topicSuggestion.findFirst({
                    where: {
                        trainerId: newTrainer.id,
                        name: suggestionName,
                        status: 'PENDING'
                    }
                });

                if (!existingSuggestion) {
                    await prisma.topicSuggestion.create({
                        data: {
                            name: suggestionName,
                            trainerId: newTrainer.id,
                            status: 'PENDING'
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
            street: newTrainer.street,
            houseNumber: newTrainer.houseNumber,
            zipCode: newTrainer.zipCode,
            city: newTrainer.city,
            bio: newTrainer.bio || '',
            profilePicture: newTrainer.profilePicture || '',
            isCompany: newTrainer.isCompany,
            companyName: newTrainer.companyName || '',
            dailyRate: newTrainer.dailyRate,
            topics: trainerWithTopics?.topics.map(t => ({
                name: t.topic.name,
                level: t.expertiseLevel
            })) || [],
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
