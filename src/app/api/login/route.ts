import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { cookies } from 'next/headers';

// Simple email sending function (replace with real email service in production)
async function sendLoginEmail(email: string, loginLink: string): Promise<void> {
  // For demo purposes, just log the email
  // In production, use a service like SendGrid, Mailgun, AWS SES, etc.

  const emailContent = `
Hallo,

Sie haben einen Login-Link für das Trainerportal angefordert.

Bitte klicken Sie auf den folgenden Link, um sich anzumelden:

${loginLink}

Dieser Link ist 7 Tage gültig und kann nur einmal verwendet werden.

Falls Sie keinen Login-Link angefordert haben, ignorieren Sie diese E-Mail.

Mit freundlichen Grüßen,
Ihr Trainerportal Team
  `.trim();

  console.log('=== LOGIN EMAIL SIMULATION ===');
  console.log(`To: ${email}`);
  console.log(`Subject: Ihr Login-Link für das Trainerportal`);
  console.log(`Body:\n${emailContent}`);
  console.log('=================================');

  // Simulate email sending delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // In production, you would use something like:
  /*
  const nodemailer = require('nodemailer');

  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: email,
    subject: 'Ihr Login-Link für das Trainerportal',
    text: emailContent
  });
  */
}

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
      const loginLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard?token=${tokenString}`;

      // Send email (simulated for demo - in production use a real email service)
      try {
        await sendLoginEmail(email, loginLink);
        console.log(`Login email sent to ${email}: ${loginLink}`);
      } catch (emailError) {
        console.error('Failed to send login email:', emailError);
        // Continue anyway - we can still return the link
      }

      return NextResponse.json({
        message: 'Login-Link wurde per E-Mail versendet.',
        // In production, don't include the link in the response for security
        ...(process.env.NODE_ENV === 'development' && { loginLink })
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
      
      // Mark the token as used (with error handling for race conditions)
      try {
        await prisma.loginToken.update({
          where: { token },
          data: {
            used: true,
            usedAt: new Date()
          }
        });
      } catch (updateError) {
        console.warn('Token update failed, checking if already used:', updateError);
        // Check if token was already used by another request
        const currentToken = await prisma.loginToken.findUnique({
          where: { token }
        });

        if (currentToken?.used) {
          return NextResponse.json(
            { message: 'Dieser Login-Link wurde bereits verwendet.' },
            { status: 401 }
          );
        }

        // If it's not used, rethrow the error
        throw updateError;
      }

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
        isCompany: tokenData.trainer.isCompany,
        companyName: tokenData.trainer.companyName || '',
      };

      // Set cookies for session management (7 days)
      const cookieStore = await cookies();
      cookieStore.set('mr_token', 'trainer_' + tokenData.trainer.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      });

      cookieStore.set('trainer_data', JSON.stringify(trainerResponse), {
        httpOnly: false, // Allow client-side access
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      });

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