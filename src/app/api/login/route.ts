import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    // Get login data from request body
    const body = await req.json();
    const { email, action, token } = body;

    // If action is "request-link", generate a token and return success
    if (action === 'request-link') {
      // Validate input for request-link action
      if (!email) {
        return NextResponse.json(
          { message: 'E-Mail ist erforderlich.' },
          { status: 400 }
        );
      }
      

      // Find trainer by email
      const trainer = await prisma.trainer.findUnique({
        where: { email }
      });

      // If trainer not found, return error
      if (!trainer) {
        return NextResponse.json(
          { message: 'Kein Trainer mit dieser E-Mail gefunden.' },
          { status: 401 }
        );
      }

      // Generate a random token
      const tokenString = crypto.randomBytes(32).toString('hex');
      
      // Set token expiration (1 week from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 1 week
      
      // Store the token in database
      try {
        await prisma.loginToken.create({
          data: {
            token: tokenString,
            trainerId: trainer.id,
            expiresAt: expiresAt,
            used: false
          }
        });
      } catch (createError) {
        console.error('Error creating login token:', createError);
        return NextResponse.json(
          { message: 'Fehler beim Erstellen des Login-Tokens.' },
          { status: 500 }
        );
      }
      
      // Generate login link that points directly to dashboard
      // In a real app, you would send this via email
      const loginLink = `http://localhost:3000/dashboard?token=${tokenString}`;
      console.log(`Login link for ${email}: ${loginLink}`);
      
      return NextResponse.json({
        message: 'Login-Link wurde erstellt. In einer richtigen Anwendung würde dieser per E-Mail gesendet werden.',
        // Include the link directly in the response for demonstration
        loginLink: loginLink
      }, { status: 200 });
    }
    
    // If action is "verify-token", validate the token and return trainer data
    if (action === 'verify-token') {
      // Validate token for verify-token action
      if (!token) {
        return NextResponse.json(
          { message: 'Token ist erforderlich.' },
          { status: 400 }
        );
      }
      
      // Find token in database
      const tokenData = await prisma.loginToken.findUnique({
        where: { token },
        include: {
          trainer: {
            include: {
              topics: {
                include: {
                  topic: true,
                },
              },
            },
          }
        }
      });
      
      if (!tokenData) {
        return NextResponse.json(
          { message: 'Ungültiger Token.' },
          { status: 401 }
        );
      }
      
      // Check if token is expired
      if (new Date() > tokenData.expiresAt) {
        return NextResponse.json(
          { message: 'Dieser Login-Link ist abgelaufen. Bitte fordern Sie einen neuen an.' },
          { status: 401 }
        );
      }
      
      // Check if token was already used
      if (tokenData.used) {
        return NextResponse.json(
          { message: 'Dieser Login-Link wurde bereits verwendet.' },
          { status: 401 }
        );
      }
      
      // Mark the token as used
      await prisma.loginToken.update({
        where: { token },
        data: {
          used: true,
          usedAt: new Date()
        }
      });
      
      // Format the trainer data for the response
      const trainerResponse = {
        id: tokenData.trainer.id,
        firstName: tokenData.trainer.firstName,
        lastName: tokenData.trainer.lastName,
        email: tokenData.trainer.email,
        phone: tokenData.trainer.phone,
        status: tokenData.trainer.status,
        topics: tokenData.trainer.topics.map(t => t.topic.name),
        bio: tokenData.trainer.bio || '',
        profilePicture: tokenData.trainer.profilePicture || '',
      };
      
      // Return success response with trainer data
      return NextResponse.json({
        message: 'Login erfolgreich!',
        trainer: trainerResponse,
      }, { status: 200 });
    }

    // If no valid action is provided
    return NextResponse.json(
      { message: 'Ungültige Anfrage. Bitte geben Sie eine gültige Aktion an.' },
      { status: 400 }
    );
    
  } catch (error: unknown) {
    // Error handling
    console.error('Login error:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
      return NextResponse.json({ 
        message: `Fehler: ${error.message}`,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, { status: 500 });
    }
    return NextResponse.json({ message: 'Ein unbekannter Fehler ist aufgetreten.' }, { status: 500 });
  }
} 