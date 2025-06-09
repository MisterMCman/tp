import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.inquiry.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.event.deleteMany();
  await prisma.course.deleteMany();
  await prisma.trainerTopic.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.loginToken.deleteMany();
  await prisma.trainer.deleteMany();

  // Reset auto-increment counters to start from 1
  await prisma.$executeRaw`ALTER TABLE Trainer AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Topic AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Course AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Event AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Inquiry AUTO_INCREMENT = 1`;

  // Create topics
  const topics = [
    'Python',
    'JavaScript',
    'Projektmanagement',
    'Excel',
    'Figma',
    'Photoshop',
    'PowerPoint',
    'WordPress',
    'HTML & CSS',
    'React.js',
    'Vue.js',
    'Node.js',
    'Data Analysis',
    'Machine Learning',
    'SEO Basics',
    'Google Ads',
    'Facebook Marketing',
    'Email Marketing',
    'Public Speaking',
    'Leadership Training',
    'Time Management',
    'Agile Project Management',
  ];

  const createdTopics = [];
  for (const topicName of topics) {
    const topic = await prisma.topic.create({
      data: { name: topicName },
    });
    createdTopics.push(topic);
  }

  // Create main trainer (Lorenz Surkemper) - will get ID 1
  const mainTrainer = await prisma.trainer.create({
    data: {
      firstName: 'Lorenz',
      lastName: 'Surkemper',
      email: 'l.surkemper@googlemail.com',
      phone: '017670910870',
      bio: 'Vielseitiger Trainer mit Expertise in Programming, Design und Projektmanagement.',
      status: 'ACTIVE'
    }
  });

  // Create additional sample trainers for variety
  const trainer2 = await prisma.trainer.create({
    data: {
      firstName: 'Anna',
      lastName: 'Schmidt',
      email: 'anna.schmidt@example.com',
      phone: '+49 987 654321',
      bio: 'Spezialistin für Digital Marketing und Content Creation.',
      status: 'ACTIVE'
    }
  });

  const trainer3 = await prisma.trainer.create({
    data: {
      firstName: 'Thomas',
      lastName: 'Weber',
      email: 'thomas.weber@example.com',
      phone: '+49 555 123456',
      bio: 'Projektmanagement-Experte mit Fokus auf agile Methoden.',
      status: 'ACTIVE'
    }
  });

  // Get topic references
  const pythonTopic = createdTopics.find(t => t.name === 'Python');
  const jsTopic = createdTopics.find(t => t.name === 'JavaScript');
  const projectTopic = createdTopics.find(t => t.name === 'Projektmanagement');
  const excelTopic = createdTopics.find(t => t.name === 'Excel');
  const reactTopic = createdTopics.find(t => t.name === 'React.js');
  const figmaTopic = createdTopics.find(t => t.name === 'Figma');
  const marketingTopic = createdTopics.find(t => t.name === 'Google Ads');

  // Assign topics to main trainer (Lorenz) - give him all relevant topics
  if (pythonTopic) {
    await prisma.trainerTopic.create({
      data: { trainerId: mainTrainer.id, topicId: pythonTopic.id }
    });
  }
  if (jsTopic) {
    await prisma.trainerTopic.create({
      data: { trainerId: mainTrainer.id, topicId: jsTopic.id }
    });
  }
  if (reactTopic) {
    await prisma.trainerTopic.create({
      data: { trainerId: mainTrainer.id, topicId: reactTopic.id }
    });
  }
  if (figmaTopic) {
    await prisma.trainerTopic.create({
      data: { trainerId: mainTrainer.id, topicId: figmaTopic.id }
    });
  }
  if (projectTopic) {
    await prisma.trainerTopic.create({
      data: { trainerId: mainTrainer.id, topicId: projectTopic.id }
    });
  }
  if (excelTopic) {
    await prisma.trainerTopic.create({
      data: { trainerId: mainTrainer.id, topicId: excelTopic.id }
    });
  }

  // Assign topics to other trainers as well
  // Trainer 2: Marketing/Design focus
  if (figmaTopic) {
    await prisma.trainerTopic.create({
      data: { trainerId: trainer2.id, topicId: figmaTopic.id }
    });
  }
  if (marketingTopic) {
    await prisma.trainerTopic.create({
      data: { trainerId: trainer2.id, topicId: marketingTopic.id }
    });
  }

  // Trainer 3: Project Management focus
  if (projectTopic) {
    await prisma.trainerTopic.create({
      data: { trainerId: trainer3.id, topicId: projectTopic.id }
    });
  }
  if (excelTopic) {
    await prisma.trainerTopic.create({
      data: { trainerId: trainer3.id, topicId: excelTopic.id }
    });
  }

  // Create courses for different trainers
  const pythonCourse = await prisma.course.create({
    data: {
      title: 'Python für Einsteiger',
      description: 'Grundlegende Python-Syntax und einfache Anwendungen',
      topicId: pythonTopic?.id,
      state: 'ONLINE'
    }
  });

  const jsCourse = await prisma.course.create({
    data: {
      title: 'JavaScript Fortgeschrittene',
      description: 'Workshop für Entwickler mit JavaScript-Grundkenntnissen. Fokus auf modernen ES6+ Features und asynchroner Programmierung.',
      topicId: jsTopic?.id,
      state: 'ONLINE'
    }
  });

  const reactCourse = await prisma.course.create({
    data: {
      title: 'React Workshop',
      description: 'Eine Einführung in React mit praktischen Übungen.',
      topicId: reactTopic?.id,
      state: 'ONLINE'
    }
  });

  const figmaCourse = await prisma.course.create({
    data: {
      title: 'Figma – Grundlagen & Aufbau',
      description: 'UI/UX Design mit Figma von den Grundlagen bis zu fortgeschrittenen Techniken.',
      topicId: figmaTopic?.id,
      state: 'ONLINE'
    }
  });

  const projectCourse = await prisma.course.create({
    data: {
      title: 'Projektmanagement in agilen Teams',
      description: 'Agiles Projektmanagement mit Scrum und Kanban',
      topicId: projectTopic?.id,
      state: 'ONLINE'
    }
  });

  const excelCourse = await prisma.course.create({
    data: {
      title: 'Excel für Fortgeschrittene',
      description: 'Schwerpunkt auf Pivot-Tabellen und Makros.',
      topicId: excelTopic?.id,
      state: 'ONLINE'
    }
  });

  // Create events for each course
  const pythonEvent = await prisma.event.create({
    data: {
      courseId: pythonCourse.id,
      title: pythonCourse.title,
      date: new Date('2025-12-10T09:00:00'),
      endTime: new Date('2025-12-10T17:00:00'),
      location: 'Online',
      participants: 15
    }
  });

  const jsEvent = await prisma.event.create({
    data: {
      courseId: jsCourse.id,
      title: jsCourse.title,
      date: new Date('2025-12-15T13:30:00'),
      endTime: new Date('2025-12-15T18:00:00'),
      location: 'Berlin, Hauptstr. 17',
      participants: 10
    }
  });

  const reactEvent = await prisma.event.create({
    data: {
      courseId: reactCourse.id,
      title: reactCourse.title,
      date: new Date('2025-02-15T09:30:00'),
      endTime: new Date('2025-02-15T16:30:00'),
      location: 'Online',
      participants: 8
    }
  });

  const figmaEvent = await prisma.event.create({
    data: {
      courseId: figmaCourse.id,
      title: figmaCourse.title,
      date: new Date('2025-11-20T10:00:00'),
      endTime: new Date('2025-11-20T16:00:00'),
      location: 'Hamburg, Speicherstadt 15',
      participants: 12
    }
  });

  const projectEvent = await prisma.event.create({
    data: {
      courseId: projectCourse.id,
      title: projectCourse.title,
      date: new Date('2025-07-05T10:00:00'),
      endTime: new Date('2025-07-05T16:00:00'),
      location: 'München, Bahnhofplatz 3',
      participants: 12
    }
  });

  const excelEvent = await prisma.event.create({
    data: {
      courseId: excelCourse.id,
      title: excelCourse.title,
      date: new Date('2025-01-20T10:00:00'),
      endTime: new Date('2025-01-20T15:00:00'),
      location: 'Hamburg, Neuer Wall 50',
      participants: 6
    }
  });

  // Create ALL training requests for Lorenz Surkemper (mainTrainer) - he'll see all requests
  await prisma.inquiry.create({
    data: {
      trainerId: mainTrainer.id,
      eventId: pythonEvent.id,
      status: 'PENDING',
      originalPrice: 800,
      proposedPrice: 800,
      message: 'Wir suchen einen erfahrenen Python-Trainer für unseren Einsteigerkurs. Inhalt sollte grundlegende Python-Syntax und einfache Anwendungen umfassen.',
      createdAt: new Date('2025-01-08T10:30:00'),
      updatedAt: new Date('2025-01-08T10:30:00')
    }
  });

  await prisma.inquiry.create({
    data: {
      trainerId: mainTrainer.id,
      eventId: jsEvent.id,
      status: 'PENDING',
      originalPrice: 950,
      proposedPrice: 950,
      counterPrice: 1100,
      message: 'Workshop für Entwickler mit JavaScript-Grundkenntnissen. Fokus auf modernen ES6+ Features und asynchroner Programmierung.',
      createdAt: new Date('2025-01-07T14:15:00'),
      updatedAt: new Date('2025-01-09T09:45:00')
    }
  });

  await prisma.inquiry.create({
    data: {
      trainerId: mainTrainer.id,
      eventId: reactEvent.id,
      status: 'ACCEPTED',
      originalPrice: 850,
      proposedPrice: 850,
      message: 'Eine Einführung in React mit praktischen Übungen.',
      createdAt: new Date('2025-01-05T11:00:00'),
      updatedAt: new Date('2025-01-08T15:30:00')
    }
  });

  await prisma.inquiry.create({
    data: {
      trainerId: mainTrainer.id,
      eventId: figmaEvent.id,
      status: 'PENDING',
      originalPrice: 750,
      proposedPrice: 750,
      message: 'Suchen einen erfahrenen Figma-Trainer für UI/UX Design Workshop.',
      createdAt: new Date('2025-01-06T09:15:00'),
      updatedAt: new Date('2025-01-06T09:15:00')
    }
  });

  await prisma.inquiry.create({
    data: {
      trainerId: mainTrainer.id,
      eventId: figmaEvent.id,
      status: 'REJECTED',
      originalPrice: 600,
      proposedPrice: 600,
      message: 'Design Workshop für Anfänger. Budget ist leider begrenzt.',
      createdAt: new Date('2025-01-04T16:30:00'),
      updatedAt: new Date('2025-01-05T10:20:00')
    }
  });

  await prisma.inquiry.create({
    data: {
      trainerId: mainTrainer.id,
      eventId: projectEvent.id,
      status: 'PENDING',
      originalPrice: 1200,
      proposedPrice: 1200,
      message: 'Benötigen einen Projektmanagement-Experten für agile Methoden.',
      createdAt: new Date('2025-01-06T16:20:00'),
      updatedAt: new Date('2025-01-06T16:20:00')
    }
  });

  await prisma.inquiry.create({
    data: {
      trainerId: mainTrainer.id,
      eventId: excelEvent.id,
      status: 'ABGESAGT',
      originalPrice: 600,
      proposedPrice: 600,
      message: 'Schwerpunkt auf Pivot-Tabellen und Makros.',
      createdAt: new Date('2025-01-03T12:00:00'),
      updatedAt: new Date('2025-01-09T14:20:00')
    }
  });

  await prisma.inquiry.create({
    data: {
      trainerId: mainTrainer.id,
      eventId: projectEvent.id,
      status: 'ACCEPTED',
      originalPrice: 1100,
      proposedPrice: 1100,
      counterPrice: 1250,
      message: 'Projektmanagement für mittelständische Unternehmen.',
      createdAt: new Date('2025-01-02T14:45:00'),
      updatedAt: new Date('2025-01-07T11:30:00')
    }
  });

  console.log('Seed data inserted successfully:');
  console.log('- Topics created');
  console.log('- 3 Trainers created:');
  console.log(`  - Main Trainer (ID: ${mainTrainer.id}): Lorenz Surkemper - All requests assigned to him`);
  console.log(`  - Trainer 2 (ID: ${trainer2.id}): Anna Schmidt - Design/Marketing`);
  console.log(`  - Trainer 3 (ID: ${trainer3.id}): Thomas Weber - Project Management`);
  console.log('- Courses created');
  console.log('- Events created');
  console.log('- Training requests (inquiries) created - ALL assigned to Lorenz Surkemper');
  console.log('- Each request has different statuses (pending, accepted, rejected, abgesagt)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
