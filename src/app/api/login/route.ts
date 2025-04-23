import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// In-memory store for login tokens (in a production app, use Redis or a database)
const loginTokens: Record<string, { token: string, email: string, expires: Date }> = {};

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
      const token = crypto.randomBytes(32).toString('hex');
      
      // Set token expiration (e.g., 15 minutes)
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 15);
      
      // Store the token
      loginTokens[token] = { token, email, expires };
      
      // Generate login link that points directly to dashboard
      // In a real app, you would send this via email
      const loginLink = `http://localhost:3000/dashboard?token=${token}`;
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
      
      // Check if token exists and is valid
      const tokenData = loginTokens[token];
      if (!tokenData) {
        return NextResponse.json(
          { message: 'Ungültiger oder abgelaufener Token.' },
          { status: 401 }
        );
      }
      
      // Check if token is expired
      if (new Date() > tokenData.expires) {
        // Remove expired token
        delete loginTokens[token];
        
        return NextResponse.json(
          { message: 'Dieser Login-Link ist abgelaufen. Bitte fordern Sie einen neuen an.' },
          { status: 401 }
        );
      }
      
      // Get trainer data
      const trainer = await prisma.trainer.findUnique({
        where: { email: tokenData.email },
        include: {
          topics: {
            include: {
              topic: true,
            },
          },
        },
      });
      
      if (!trainer) {
        return NextResponse.json(
          { message: 'Trainer nicht gefunden.' },
          { status: 404 }
        );
      }
      
      // Remove the used token (one-time use)
      delete loginTokens[token];
      
      // Format the trainer data for the response
      const trainerResponse = {
        id: trainer.id,
        firstName: trainer.firstName,
        lastName: trainer.lastName,
        email: trainer.email,
        phone: trainer.phone,
        status: trainer.status,
        topics: trainer.topics.map(t => t.topic.name),
        bio: '', // Not in database schema, but expected in the UI
        profilePicture: '', // Not in database schema, but expected in the UI
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
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'Ein unbekannter Fehler ist aufgetreten.' }, { status: 500 });
  }
} 