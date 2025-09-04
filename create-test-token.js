const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function createTestToken() {
  try {
    // Create a test training company
    const company = await prisma.trainingCompany.create({
      data: {
        companyName: 'Test Company GmbH',
        contactName: 'Max Mustermann',
        email: 'test@company.com',
        phone: '+49123456789',
        bio: 'A test training company for development',
        logo: null,
        website: 'https://testcompany.com',
        industry: 'IT Training',
        employees: '50-100',
        consultantName: 'Anna Schmidt',
        status: 'ACTIVE'
      }
    });

    console.log('Created test company:', company.companyName);

    // Generate a login token
    const tokenString = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Create the login token
    const token = await prisma.trainingCompanyLoginToken.create({
      data: {
        token: tokenString,
        trainingCompanyId: company.id,
        expiresAt: expiresAt,
        used: false
      }
    });

    console.log('Created login token:', tokenString);
    console.log('Token expires at:', expiresAt);

    // Generate the login link
    const loginLink = `http://localhost:3000/dashboard?token=${tokenString}`;
    console.log('\n=== LOGIN LINK ===');
    console.log(loginLink);
    console.log('==================\n');

    return loginLink;
  } catch (error) {
    console.error('Error creating test token:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestToken();

