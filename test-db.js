const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  try {
    // Check if attachments exist
    const attachments = await prisma.fileAttachment.findMany();
    console.log('File Attachments:', attachments.length);
    console.log('Sample attachment:', attachments[0]);

    // Check if inquiry messages exist
    const messages = await prisma.inquiryMessage.findMany({
      include: {
        attachments: true
      }
    });
    console.log('Inquiry Messages:', messages.length);
    console.log('Messages with attachments:', messages.filter(m => m.attachments.length > 0).length);

    // Check messages for user ID 1 (TRAINER)
    const userMessages = await prisma.inquiryMessage.findMany({
      where: {
        OR: [
          { senderId: 1, senderType: 'TRAINER' },
          { recipientId: 1, recipientType: 'TRAINER' }
        ]
      },
      include: {
        attachments: true
      }
    });
    console.log('User 1 (TRAINER) messages:', userMessages.length);
    console.log('User 1 messages with attachments:', userMessages.filter(m => m.attachments.length > 0).length);
    console.log('User 1 message details:', userMessages.map(m => ({ id: m.id, senderId: m.senderId, recipientId: m.recipientId, attachments: m.attachments.length })));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
