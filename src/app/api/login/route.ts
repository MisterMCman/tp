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
      

      // Find trainer or company user by email
      const trainer = await prisma.trainer.findUnique({
        where: { email }
      });

      const companyUser = await prisma.companyUser.findUnique({
        where: { email },
        include: { company: true }
      });

      // If neither trainer nor company user found, return error
      if (!trainer && !companyUser) {
        return NextResponse.json(
          { message: 'Kein Konto mit dieser E-Mail gefunden.' },
          { status: 401 }
        );
      }

      const user = trainer || companyUser;
      const userType = trainer ? 'trainer' : 'companyUser';
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
          await prisma.companyUserLoginToken.create({
            data: {
              token: tokenString,
              userId: userId,
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
      
      // Find token in database (check trainer and company user tokens)
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

      let companyUserTokenData = null;
      if (!tokenData) {
        companyUserTokenData = await prisma.companyUserLoginToken.findUnique({
          where: { token },
          include: {
            user: {
              include: {
                company: true
              }
            }
          }
        });
      }

      const finalTokenData = tokenData || companyUserTokenData;

      if (!finalTokenData) {
        return NextResponse.json(
          { message: 'Ungültiger Token.' },
          { status: 401 }
        );
      }

      const user = tokenData ? finalTokenData.trainer : finalTokenData.user;
      const userType = tokenData ? 'trainer' : 'companyUser';
      
      // Check if token is expired
      if (new Date() > finalTokenData.expiresAt) {
        return NextResponse.json(
          { message: 'Dieser Login-Link ist abgelaufen. Bitte fordern Sie einen neuen an.' },
          { status: 401 }
        );
      }

      // Note: Tokens are now reusable within their expiration period
      
      // Update last used timestamp (don't mark as used for reusable tokens)
      try {
        if (userType === 'trainer') {
          await prisma.loginToken.update({
            where: { token },
            data: {
              usedAt: new Date() // Track when it was last used, but keep it reusable
            },
            select: { id: true } // Only select what we need
          });
        } else {
          await prisma.companyUserLoginToken.update({
            where: { token },
            data: {
              usedAt: new Date() // Track when it was last used, but keep it reusable
            },
            select: { id: true } // Only select what we need
          });
        }
      } catch (updateError) {
        console.warn('Token update failed:', updateError);
        // For reusable tokens, we don't need to check if already used
        // Just log the error and continue
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
        const userData = finalTokenData as { user: any }; // Type assertion for company user token
        userResponse = {
          id: userData.user.id,
          userType: 'TRAINING_COMPANY',
          companyId: userData.user.companyId,
          companyName: userData.user.company.companyName,
          firstName: userData.user.firstName,
          lastName: userData.user.lastName,
          email: userData.user.email,
          phone: userData.user.phone || userData.user.company.phone || '',
          status: userData.user.company.status,
          role: userData.user.role, // ADMIN, EDITOR, or VIEWER
          isActive: userData.user.isActive,
          bio: userData.user.company.bio || '',
          logo: userData.user.company.logo || '',
          website: userData.user.company.website || '',
          industry: userData.user.company.industry || '',
          employees: userData.user.company.employees || '',
          consultantName: userData.user.company.consultantName || '',
        };
      }

      // Set cookies for session management (7 days)
      const cookieStore = await cookies();
      const tokenValue = userType === 'trainer' ? 'trainer_' + user!.id : 'user_' + user!.id;
      cookieStore.set('mr_token', tokenValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      });

      // Set the appropriate cookie based on user type
      if (userType === 'trainer') {
        cookieStore.set('trainer_data', JSON.stringify(userResponse), {
          httpOnly: false, // Allow client-side access
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: '/'
        });
        // Clear company_data if it exists (user switched from company to trainer)
        cookieStore.delete('company_data');
      } else {
        cookieStore.set('company_data', JSON.stringify(userResponse), {
          httpOnly: false, // Allow client-side access
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: '/'
        });
        // Clear trainer_data if it exists (user switched from trainer to company)
        cookieStore.delete('trainer_data');
      }

      // Return success response with user data
      return NextResponse.json({
        message: 'Login erfolgreich!',
        user: userResponse, // Unified field for both types
        ...(userType === 'trainer' ? { trainer: userResponse } : { company: userResponse }),
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