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
      

      // Find trainer or training company by email
      const trainer = await prisma.trainer.findUnique({
        where: { email }
      });

      const trainingCompany = await prisma.trainingCompany.findUnique({
        where: { email }
      });

      // If neither trainer nor training company found, return error
      if (!trainer && !trainingCompany) {
        return NextResponse.json(
          { message: 'Kein Konto mit dieser E-Mail gefunden.' },
          { status: 401 }
        );
      }

      const user = trainer || trainingCompany;
      const userType = trainer ? 'trainer' : 'trainingCompany';
      const userId = user!.id;

      // Generate a random token
      const tokenString = crypto.randomBytes(32).toString('hex');
      
      // Set token expiration (1 week from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 1 week
      
      // Store the token in database
      try {
        if (userType === 'trainer') {
          await prisma.loginToken.create({
            data: {
              token: tokenString,
              trainerId: userId,
              expiresAt: expiresAt,
              used: false
            }
          });
        } else {
          await prisma.trainingCompanyLoginToken.create({
            data: {
              token: tokenString,
              trainingCompanyId: userId,
              expiresAt: expiresAt,
              used: false
            }
          });
        }
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
      
      // Find token in database (check both trainer and training company tokens)
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

      let trainingCompanyTokenData = null;
      if (!tokenData) {
        trainingCompanyTokenData = await prisma.trainingCompanyLoginToken.findUnique({
          where: { token },
          include: {
            trainingCompany: true
          }
        });
      }

      const finalTokenData = tokenData || trainingCompanyTokenData;

      if (!finalTokenData) {
        return NextResponse.json(
          { message: 'Ungültiger Token.' },
          { status: 401 }
        );
      }

      const user = tokenData ? finalTokenData.trainer : finalTokenData.trainingCompany;
      const userType = tokenData ? 'trainer' : 'trainingCompany';
      
      // Check if token is expired
      if (new Date() > finalTokenData.expiresAt) {
        return NextResponse.json(
          { message: 'Dieser Login-Link ist abgelaufen. Bitte fordern Sie einen neuen an.' },
          { status: 401 }
        );
      }

      // Check if token was already used
      if (finalTokenData.used) {
        return NextResponse.json(
          { message: 'Dieser Login-Link wurde bereits verwendet.' },
          { status: 401 }
        );
      }
      
      // Mark the token as used (with error handling for race conditions)
      try {
        if (userType === 'trainer') {
          await prisma.loginToken.update({
            where: { token },
            data: {
              used: true,
              usedAt: new Date()
            },
            select: { id: true } // Only select what we need
          });
        } else {
          await prisma.trainingCompanyLoginToken.update({
            where: { token },
            data: {
              used: true,
              usedAt: new Date()
            },
            select: { id: true } // Only select what we need
          });
        }
      } catch (updateError) {
        console.warn('Token update failed, checking if already used:', updateError);
        // Check if token was already used by another request
        let currentToken;
        if (userType === 'trainer') {
          currentToken = await prisma.loginToken.findUnique({
            where: { token }
          });
        } else {
          currentToken = await prisma.trainingCompanyLoginToken.findUnique({
            where: { token }
          });
        }

        if (currentToken?.used) {
          return NextResponse.json(
            { message: 'Dieser Login-Link wurde bereits verwendet.' },
            { status: 401 }
          );
        }

        // If it's not used, rethrow the error
        throw updateError;
      }

      // Format the user data for the response
      let userResponse;
      if (userType === 'trainer') {
        const trainerData = finalTokenData as { trainer: any }; // Type assertion for trainer token
        userResponse = {
          id: trainerData.trainer.id,
          userType: 'TRAINER',
          firstName: trainerData.trainer.firstName,
          lastName: trainerData.trainer.lastName,
          email: trainerData.trainer.email,
          phone: trainerData.trainer.phone,
          status: trainerData.trainer.status,
          topics: trainerData.trainer.topics.map((t: { topic: { name: string } }) => t.topic.name),
          bio: trainerData.trainer.bio || '',
          profilePicture: trainerData.trainer.profilePicture || '',
          iban: trainerData.trainer.iban,
          isCompany: trainerData.trainer.isCompany,
          companyName: trainerData.trainer.companyName || '',
        };
      } else {
        const companyData = finalTokenData as { trainingCompany: any }; // Type assertion for training company token
        userResponse = {
          id: companyData.trainingCompany.id,
          userType: 'TRAINING_COMPANY',
          companyName: companyData.trainingCompany.companyName,
          contactName: companyData.trainingCompany.contactName,
          email: companyData.trainingCompany.email,
          phone: companyData.trainingCompany.phone,
          status: companyData.trainingCompany.status,
          bio: companyData.trainingCompany.bio || '',
          logo: companyData.trainingCompany.logo || '',
          website: companyData.trainingCompany.website || '',
          industry: companyData.trainingCompany.industry || '',
          employees: companyData.trainingCompany.employees || '',
          consultantName: companyData.trainingCompany.consultantName || '',
        };
      }

      // Set cookies for session management (7 days)
      const cookieStore = await cookies();
      const tokenValue = userType === 'trainer' ? 'trainer_' + user!.id : 'company_' + user!.id;
      cookieStore.set('mr_token', tokenValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      });

      cookieStore.set('trainer_data', JSON.stringify(userResponse), {
        httpOnly: false, // Allow client-side access
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      });

      // Return success response with user data
      return NextResponse.json({
        message: 'Login erfolgreich!',
        trainer: userResponse,
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