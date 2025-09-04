import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDatabase() {
  console.log('Starting database seeding...');

  // Clear existing data in correct order
  await prisma.trainingRequest.deleteMany();
  await prisma.training.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.event.deleteMany();
  await prisma.course.deleteMany();
  await prisma.trainerTopic.deleteMany();
  await prisma.loginToken.deleteMany();
  await prisma.trainingCompanyLoginToken.deleteMany();
  await prisma.topicSuggestion.deleteMany();
  await prisma.trainerProfileVersion.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.trainingCompany.deleteMany();
  await prisma.trainer.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.country.deleteMany();

  // Reset auto-increment counters
  await prisma.$executeRaw`ALTER TABLE Country AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Trainer AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Topic AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Course AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Event AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Inquiry AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE TrainerTopic AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE LoginToken AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE TrainingCompanyLoginToken AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE TopicSuggestion AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE TrainerProfileVersion AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Availability AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Invoice AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Participant AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE TrainingCompany AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Training AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE TrainingRequest AUTO_INCREMENT = 1`;

  // Create countries
  const germany = await prisma.country.create({
    data: { name: 'Deutschland', code: 'DE', phoneCode: '+49' }
  });

  // Create topics
  const topics = [
    'Python', 'JavaScript', 'React', 'Node.js', 'TypeScript', 'HTML/CSS',
    'UI/UX Design', 'Figma', 'Adobe XD', 'Projektmanagement', 'Scrum',
    'Kanban', 'Data Analysis', 'Machine Learning', 'SQL', 'MongoDB',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'DevOps', 'Git'
  ];

  const createdTopics = [];
  for (const topicName of topics) {
    const topic = await prisma.topic.create({
      data: { name: topicName }
    });
    createdTopics.push(topic);
  }

  // Create multiple trainers with different specializations
  const trainers = [
    {
      firstName: 'Lorenz',
      lastName: 'Meier',
      email: 'lorenz.meier@example.com',
      phone: '+49 89 12345678',
      address: 'Musterstraße 123\\n80331 München\\nDeutschland',
      bio: 'Experienced trainer with 10+ years in software development and training. Specializes in Python, data analysis, and machine learning.',
      dailyRate: 500,
      topics: ['Python', 'Data Analysis', 'Machine Learning', 'Projektmanagement'],
      countryId: germany.id,
    },
    {
      firstName: 'Anna',
      lastName: 'Schmidt',
      email: 'anna.schmidt@example.com',
      phone: '+49 30 87654321',
      address: 'Kurfürstendamm 45\\n10719 Berlin\\nDeutschland',
      bio: 'Frontend development expert with 8+ years experience. Passionate about React, JavaScript, and UI/UX design.',
      dailyRate: 450,
      topics: ['JavaScript', 'React', 'Figma', 'UI/UX Design'],
      countryId: germany.id,
    },
    {
      firstName: 'Michael',
      lastName: 'Wagner',
      email: 'michael.wagner@example.com',
      phone: '+49 69 55566677',
      address: 'Zeil 123\\n60313 Frankfurt am Main\\nDeutschland',
      bio: 'Full-stack developer and trainer specializing in modern web technologies and DevOps practices.',
      dailyRate: 550,
      topics: ['Node.js', 'Docker', 'Kubernetes', 'DevOps', 'Git'],
      countryId: germany.id,
    },
    {
      firstName: 'Julia',
      lastName: 'Becker',
      email: 'julia.becker@example.com',
      phone: '+49 221 98765432',
      address: 'Aachener Straße 567\\n50674 Köln\\nDeutschland',
      bio: 'Data science and analytics expert. Helps companies turn data into actionable insights.',
      dailyRate: 480,
      topics: ['Python', 'Data Analysis', 'Machine Learning', 'SQL'],
      countryId: germany.id,
    },
    {
      firstName: 'Thomas',
      lastName: 'Richter',
      email: 'thomas.richter@example.com',
      phone: '+49 211 44455566',
      address: 'Königsallee 123\\n40210 Düsseldorf\\nDeutschland',
      bio: 'Agile coach and project management consultant. Certified Scrum Master and Kanban expert.',
      dailyRate: 520,
      topics: ['Projektmanagement', 'Scrum', 'Kanban', 'Agile Methoden'],
      countryId: germany.id,
    }
  ];

  const createdTrainers = [];
  for (const trainerData of trainers) {
    const trainer = await prisma.trainer.create({
      data: {
        firstName: trainerData.firstName,
        lastName: trainerData.lastName,
        email: trainerData.email,
        phone: trainerData.phone,
        address: trainerData.address,
        bio: trainerData.bio,
        dailyRate: trainerData.dailyRate,
        status: 'ACTIVE',
        countryId: trainerData.countryId,
      }
    });
    createdTrainers.push({ trainer, topics: trainerData.topics });
  }

  // Get the first trainer as main trainer for reference
  const mainTrainer = createdTrainers[0].trainer;

  // Assign topics to each trainer
  console.log('📍 Assigning topics to trainers...');
  for (const { trainer, topics } of createdTrainers) {
    for (const topicName of topics) {
      const topic = createdTopics.find(t => t.name === topicName);
      if (topic) {
        await prisma.trainerTopic.create({
          data: {
            trainerId: trainer.id,
            topicId: topic.id
          }
        });
      }
    }
  }
  console.log('✅ Topics assigned to all trainers');

  // Create training companies
  const company1 = await prisma.trainingCompany.create({
    data: {
      companyName: 'PowerToWork GmbH',
      contactName: 'Sarah Müller',
      consultantName: 'Max Bauer',
      email: 'max.bauer@powertowork.de',
      phone: '+49 30 12345678',
      address: 'Friedrichstraße 123\\n10117 Berlin\\nDeutschland',
      bio: 'PowerToWork ist ein führendes Unternehmen für Personalentwicklung.',
      website: 'https://www.powertowork.de',
      industry: 'consulting',
      employees: '51-200',
      status: 'ACTIVE',
      countryId: germany.id,
    }
  });

  const company2 = await prisma.trainingCompany.create({
    data: {
      companyName: 'TechAcademy Solutions',
      contactName: 'Dr. Klaus Weber',
      consultantName: 'Lisa Schneider',
      email: 'lisa.schneider@techacademy.de',
      phone: '+49 89 98765432',
      address: 'Maximilianstraße 45\\n80539 München\\nDeutschland',
      bio: 'TechAcademy Solutions ist spezialisiert auf IT-Schulungen.',
      website: 'https://www.techacademy.de',
      industry: 'it',
      employees: '11-50',
      status: 'ACTIVE',
      countryId: germany.id,
    }
  });

  // Create sample trainings
  const pythonTopic = createdTopics.find(t => t.name === 'Python');
  const projectTopic = createdTopics.find(t => t.name === 'Projektmanagement');
  const reactTopic = createdTopics.find(t => t.name === 'React');
  const devOpsTopic = createdTopics.find(t => t.name === 'DevOps');

  const training1 = await prisma.training.create({
    data: {
      title: 'Python Grundlagen Workshop',
      topicId: pythonTopic?.id || 1,
      companyId: company2.id,
      startDate: new Date('2024-02-15'),
      endDate: new Date('2024-02-15'),
      startTime: '09:00',
      endTime: '16:00',
      location: 'Online (Zoom)',
      participants: 12,
      dailyRate: 450,
      description: 'Umfassender Python-Workshop für Anfänger. Wir behandeln Grundlagen der Programmierung, Datenstrukturen und erste praktische Projekte.',
      status: 'PUBLISHED'
    }
  });

  const training2 = await prisma.training.create({
    data: {
      title: 'Agile Projektmanagement mit Scrum',
      topicId: projectTopic?.id || 1,
      companyId: company1.id,
      startDate: new Date('2024-03-10'),
      endDate: new Date('2024-03-11'),
      startTime: '09:00',
      endTime: '17:00',
      location: 'Berlin, Friedrichstraße 123',
      participants: 15,
      dailyRate: 550,
      description: 'Zweitägiger Workshop zu modernem Projektmanagement mit Fokus auf Scrum und Kanban-Methoden.',
      status: 'PUBLISHED'
    }
  });

  const training3 = await prisma.training.create({
    data: {
      title: 'React Advanced Workshop',
      topicId: reactTopic?.id || 1,
      companyId: company1.id,
      startDate: new Date('2024-04-20'),
      endDate: new Date('2024-04-20'),
      startTime: '10:00',
      endTime: '16:00',
      location: 'Online (Microsoft Teams)',
      participants: 10,
      dailyRate: 500,
      description: 'Fortgeschrittener React-Workshop mit Hooks, Context und Performance-Optimierung.',
      status: 'DRAFT'
    }
  });

  // Create training requests with different trainers
  const pythonTrainer = createdTrainers.find(t => t.topics.includes('Python'))?.trainer;
  const projectTrainer = createdTrainers.find(t => t.topics.includes('Projektmanagement'))?.trainer;
  const reactTrainer = createdTrainers.find(t => t.topics.includes('React'))?.trainer;

  await prisma.trainingRequest.create({
    data: {
      trainingId: training1.id,
      trainerId: pythonTrainer?.id || mainTrainer.id,
      status: 'ACCEPTED',
      message: 'Interesse an diesem Python-Workshop. Ich habe bereits Erfahrung mit Python-Schulungen.'
    }
  });

  await prisma.trainingRequest.create({
    data: {
      trainingId: training2.id,
      trainerId: projectTrainer?.id || mainTrainer.id,
      status: 'PENDING',
      message: 'Ich würde mich freuen, diesen Workshop zu leiten.'
    }
  });

  await prisma.trainingRequest.create({
    data: {
      trainingId: training3.id,
      trainerId: reactTrainer?.id || mainTrainer.id,
      status: 'PENDING'
    }
  });

  return {
    topicsCreated: createdTopics.length,
    trainerCreated: createdTrainers.length,
    companiesCreated: 2,
    trainingsCreated: 3,
    requestsCreated: 3
  };
}

export async function POST() {
  try {
    const result = await seedDatabase();

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      stats: result
    });

  } catch (error) {
    console.error('Error seeding database:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to seed database',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST method to seed the database',
    usage: 'POST /api/seed'
  });
}
