import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Helper function to parse CSV with proper handling of multiline fields
function parseCSV(csvContent: string) {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(';');
  const topics = [];

  let currentLine = '';
  let inMultilineField = false;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    if (!inMultilineField && line.trim() === '') continue;
    
    const quoteCount = (line.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      inMultilineField = !inMultilineField;
    }
    
    currentLine += line + (inMultilineField ? '\n' : '');
    
    if (!inMultilineField && currentLine.trim() !== '') {
      const values = currentLine.split(';');
      
      if (values.length >= 3) {
        const topic: any = {};
        
        headers.forEach((header, index) => {
          let value = values[index]?.trim() || null;
          if (value && value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          topic[header] = value === '' ? null : value;
        });
        
        topics.push(topic);
      }
      currentLine = '';
    }
  }
  
  return topics;
}

async function main() {
  console.log('🚀 Starting PowerToWork Demo Database Seed...\n');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.fileAttachment.deleteMany();
  await prisma.inquiryMessage.deleteMany();
  await prisma.trainingRequest.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.training.deleteMany();
  await prisma.course.deleteMany();
  await prisma.trainerTopic.deleteMany();
  await prisma.loginToken.deleteMany();
  await prisma.trainingCompanyLoginToken.deleteMany();
  await prisma.topicSuggestion.deleteMany();
  await prisma.trainerProfileVersion.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.trainingCompany.deleteMany();
  await prisma.trainer.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.country.deleteMany();

  // Reset AUTO_INCREMENT counters
  console.log('🔄 Resetting AUTO_INCREMENT counters...');
  await prisma.$executeRaw`ALTER TABLE Country AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Trainer AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE TrainingCompany AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Topic AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE TrainerTopic AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Training AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE TrainingRequest AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE InquiryMessage AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE LoginToken AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE TrainingCompanyLoginToken AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE TopicSuggestion AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Course AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Participant AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Invoice AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Availability AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE FileAttachment AUTO_INCREMENT = 1`;

  // Create countries
  console.log('🌍 Creating countries...');
  const priorityCountries = [
    { name: 'Deutschland', code: 'DE', phoneCode: '+49' },
    { name: 'Österreich', code: 'AT', phoneCode: '+43' },
    { name: 'Schweiz', code: 'CH', phoneCode: '+41' }
  ];

  const otherCountries = [
    { name: 'Belgien', code: 'BE', phoneCode: '+32' },
    { name: 'Frankreich', code: 'FR', phoneCode: '+33' },
    { name: 'Italien', code: 'IT', phoneCode: '+39' },
    { name: 'Niederlande', code: 'NL', phoneCode: '+31' },
    { name: 'Spanien', code: 'ES', phoneCode: '+34' },
    { name: 'Vereinigtes Königreich', code: 'GB', phoneCode: '+44' },
  ];

  const countries = [...priorityCountries, ...otherCountries];
  await prisma.country.createMany({ data: countries });

  const germany = await prisma.country.findFirst({ where: { code: 'DE' } });

  // Load and create topics from CSV
  console.log('📚 Loading topics from CSV...');
  const csvPath = path.join(__dirname, 'topics.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const topicsData = parseCSV(csvContent);

  console.log(`Found ${topicsData.length} topics in CSV`);

  const createdTopics = [];
  for (const topicData of topicsData) {
    if (topicData.state === 'offline' || topicData.deleted_at) continue;
    if (!topicData.slug) continue;

    try {
      const topic = await prisma.topic.create({
        data: {
          slug: topicData.slug,
          name: topicData.title || topicData.slug,
          short_title: topicData.short_title || null,
          icon: topicData.icon || null,
          state: topicData.state || 'online',
          novelty_order: topicData.novelty_order ? parseInt(topicData.novelty_order) : null,
          featured_order: topicData.featured_order ? parseInt(topicData.featured_order) : null,
          teaser_title: topicData.teaser_title || null,
          teaser_text: topicData.teaser_text || null,
          detail_title: topicData.detail_title || null,
          detail_text: topicData.detail_text || null,
          seo_text: topicData.seo_text || null,
          order: topicData.order ? parseInt(topicData.order) : null,
        },
      });
      createdTopics.push(topic);
    } catch (error: any) {
      console.log(`  ⚠️  Error creating topic ${topicData.slug}:`, error.message);
    }
  }

  console.log(`✅ Created ${createdTopics.length} topics`);

  // Create PowerToWork GmbH as THE demo company
  console.log('\n🏢 Creating PowerToWork GmbH (Demo Company)...');

  const powerToWork = await prisma.trainingCompany.create({
    data: {
      companyName: 'PowerToWork GmbH',
      phone: '+49 521 12345678',
      street: 'Hermannstraße',
      houseNumber: '3',
      zipCode: '33602',
      city: 'Bielefeld',
      domain: 'powertowork.com',
      bio: 'PowerToWork ist ein führendes Unternehmen für Personalentwicklung und Schulungen in der DACH-Region. Wir vermitteln qualifizierte Trainer für Ihre individuellen Schulungsbedürfnisse.',
      website: 'https://www.powertowork.com',
      industry: 'consulting',
      employees: '51-200',
      companyType: 'GMBH',
      status: 'ACTIVE',
      countryId: germany?.id,
      onboardingStatus: 'Aktiv',
      // Create the first CompanyUser (ADMIN) along with the company
      users: {
        create: {
          email: 'sarah.mueller@powertowork.com',
          firstName: 'Sarah',
          lastName: 'Müller',
          phone: '+49 521 12345678',
          role: 'ADMIN',
          isActive: true
        }
      }
    }
  });

  console.log(`  ✓ ${powerToWork.companyName}`);

  // Create Lorenz Surkemper as MAIN DEMO TRAINER for PowerToWork
  console.log('\n👤 Creating Lorenz Surkemper (Main Demo Trainer)...');

  const lorenz = await prisma.trainer.create({
    data: {
      firstName: 'Lorenz',
      lastName: 'Surkemper',
      email: 'surkemper@powertowork.com',
      phone: '017670910870',
      street: 'Hermannstraße',
      houseNumber: '3',
      zipCode: '33602',
      city: 'Bielefeld',
      bio: 'Full-Stack Entwickler und Trainer mit über 10 Jahren Erfahrung in Web-Technologien, Python und modernen JavaScript-Frameworks. Spezialisiert auf praxisnahe Schulungen mit nachhaltigem Lernerfolg.',
      dailyRate: 850.00,
      iban: 'DE89 3704 0044 0532 0130 00',
      taxId: 'DE123456789',
      countryId: germany?.id,
      status: 'ACTIVE'
    }
  });

  console.log(`  ✓ Lorenz Surkemper (ID: ${lorenz.id})`);

  // Create additional trainers
  console.log('\n👥 Creating additional trainers...');

  const trainers = [
    {
      firstName: 'Anna',
      lastName: 'Schmidt',
      email: 'anna.schmidt@example.com',
      phone: '+49 30 12345678',
      street: 'Friedrichstraße',
      houseNumber: '45',
      zipCode: '10117',
      city: 'Berlin',
      bio: 'Adobe Creative Suite Expertin mit Schwerpunkt auf Photoshop, Illustrator und InDesign.',
      dailyRate: 750.00,
      topics: ['adobe-photoshop', 'adobe-illustrator', 'adobe-indesign', 'figma']
    },
    {
      firstName: 'Thomas',
      lastName: 'Müller',
      email: 'thomas.mueller@example.com',
      phone: '+49 89 98765432',
      street: 'Maximilianstraße',
      houseNumber: '12',
      zipCode: '80539',
      city: 'München',
      bio: 'Projektmanagement-Experte mit Scrum Master und PMP Zertifizierung.',
      dailyRate: 950.00,
      topics: ['agiles-projektmanagement', 'scrum', 'kanban']
    },
    {
      firstName: 'Sarah',
      lastName: 'Weber',
      email: 'sarah.weber@example.com',
      phone: '+49 40 55512345',
      street: 'Mönckebergstraße',
      houseNumber: '7',
      zipCode: '20095',
      city: 'Hamburg',
      bio: 'Microsoft Office Spezialistin mit Fokus auf Excel, Power BI und Datenanalyse.',
      dailyRate: 650.00,
      topics: ['microsoft-excel', 'microsoft-power-bi', 'microsoft-powerpoint']
    },
    {
      firstName: 'Michael',
      lastName: 'Fischer',
      email: 'michael.fischer@example.com',
      phone: '+49 221 77788899',
      street: 'Hohe Straße',
      houseNumber: '89',
      zipCode: '50667',
      city: 'Köln',
      bio: 'Cloud-Architekt mit Expertise in AWS, Azure und DevOps.',
      dailyRate: 1100.00,
      topics: ['aws', 'microsoft-azure', 'docker', 'kubernetes']
    },
  ];

  const createdTrainers = [lorenz];
  for (const trainerData of trainers) {
    const trainer = await prisma.trainer.create({
      data: {
        firstName: trainerData.firstName,
        lastName: trainerData.lastName,
        email: trainerData.email,
        phone: trainerData.phone,
        street: trainerData.street,
        houseNumber: trainerData.houseNumber,
        zipCode: trainerData.zipCode,
        city: trainerData.city,
        bio: trainerData.bio,
        dailyRate: trainerData.dailyRate,
        countryId: germany?.id,
        status: 'ACTIVE'
      }
    });

    // Assign topics
    for (const topicSlug of trainerData.topics) {
      const topic = createdTopics.find(t => t.slug === topicSlug);
      if (topic) {
        await prisma.trainerTopic.create({
          data: { trainerId: trainer.id, topicId: topic.id }
        });
      }
    }

    createdTrainers.push(trainer);
    console.log(`  ✓ ${trainer.firstName} ${trainer.lastName}`);
  }

  // Assign topics to Lorenz
  const lorenzTopics = ['python', 'javascript', 'react', 'node-js', 'typescript', 'html', 'css'];
  for (const topicSlug of lorenzTopics) {
    const topic = createdTopics.find(t => t.slug === topicSlug);
    if (topic) {
      await prisma.trainerTopic.create({
        data: { trainerId: lorenz.id, topicId: topic.id }
      });
    }
  }

  // Create Courses (Templates)
  console.log('\n📚 Creating courses (templates)...');

  const pythonTopic = createdTopics.find(t => t.slug === 'python');
  const reactTopic = createdTopics.find(t => t.slug === 'react');
  const photoshopTopic = createdTopics.find(t => t.slug === 'adobe-photoshop');
  const excelTopic = createdTopics.find(t => t.slug === 'microsoft-excel');
  const dockerTopic = createdTopics.find(t => t.slug === 'docker');

  const pythonCourse = await prisma.course.create({
    data: {
      title: 'Python Grundlagen',
      description: 'Einführung in Python-Programmierung: Syntax, Datenstrukturen, grundlegende Konzepte',
      topicId: pythonTopic?.id,
      state: 'ONLINE'
    }
  });

  const reactCourse = await prisma.course.create({
    data: {
      title: 'React für Fortgeschrittene',
      description: 'Fortgeschrittene React-Konzepte: Hooks, Context API, Performance-Optimierung',
      topicId: reactTopic?.id,
      state: 'ONLINE'
    }
  });

  const photoshopCourse = await prisma.course.create({
    data: {
      title: 'Adobe Photoshop Basics',
      description: 'Grundlagen der Bildbearbeitung mit Adobe Photoshop',
      topicId: photoshopTopic?.id,
      state: 'ONLINE'
    }
  });

  const excelCourse = await prisma.course.create({
    data: {
      title: 'Excel für Fortgeschrittene',
      description: 'Pivot-Tabellen, Formeln, Makros und Datenanalyse',
      topicId: excelTopic?.id,
      state: 'ONLINE'
    }
  });

  console.log(`  ✓ Created 4 courses`);

  // Create Trainings (Concrete instances of courses)
  console.log('\n📅 Creating trainings (concrete course instances)...');

  // Training 1: Python - COMPLETED (past, with invoice)
  const training1 = await prisma.training.create({
    data: {
      courseId: pythonCourse.id,
      title: 'Python Grundlagen Workshop',
      topicId: pythonTopic?.id || 1,
      companyId: powerToWork.id,
      trainerId: lorenz.id, // Lorenz is assigned
      startDate: new Date('2024-10-15'),
      endDate: new Date('2024-10-15'),
      startTime: '09:00',
      endTime: '16:00',
      location: 'Bielefeld, PowerToWork Office',
      participantCount: 12,
      dailyRate: 850,
      description: 'Python Workshop für Einsteiger - erfolgreich abgeschlossen',
      status: 'COMPLETED'
    }
  });

  // Training 2: React - IN_PROGRESS (ongoing)
  const training2 = await prisma.training.create({
    data: {
      courseId: reactCourse.id,
      title: 'React Advanced Workshop',
      topicId: reactTopic?.id || 1,
      companyId: powerToWork.id,
      trainerId: lorenz.id,
      startDate: new Date('2024-10-28'),
      endDate: new Date('2024-10-29'),
      startTime: '09:00',
      endTime: '17:00',
      location: 'Online (Zoom)',
      participantCount: 15,
      dailyRate: 900,
      description: 'Zweitägiger Workshop zu fortgeschrittenen React-Konzepten',
      status: 'IN_PROGRESS'
    }
  });

  // Training 3: Photoshop - PUBLISHED (upcoming, has requests)
  const training3 = await prisma.training.create({
    data: {
      courseId: photoshopCourse.id,
      title: 'Photoshop Bildbearbeitung',
      topicId: photoshopTopic?.id || 1,
      companyId: powerToWork.id,
      trainerId: null, // Not yet assigned - waiting for trainer acceptance
      startDate: new Date('2025-11-15'),
      endDate: new Date('2025-11-15'),
      startTime: '10:00',
      endTime: '16:00',
      location: 'Berlin, Schulungsraum A',
      participantCount: 10,
      dailyRate: 750,
      description: 'Grundlagen der Bildbearbeitung mit Adobe Photoshop',
      status: 'PUBLISHED'
    }
  });

  // Training 4: Excel - PUBLISHED (upcoming, has requests)
  const training4 = await prisma.training.create({
    data: {
      courseId: excelCourse.id,
      title: 'Excel für Fortgeschrittene',
      topicId: excelTopic?.id || 1,
      companyId: powerToWork.id,
      trainerId: null,
      startDate: new Date('2025-12-01'),
      endDate: new Date('2025-12-01'),
      startTime: '09:00',
      endTime: '15:00',
      location: 'München, TechHub',
      participantCount: 8,
      dailyRate: 650,
      description: 'Pivot-Tabellen, Formeln, Makros',
      status: 'PUBLISHED'
    }
  });

  // Training 5: Python Advanced - DRAFT (being planned)
  const training5 = await prisma.training.create({
    data: {
      courseId: pythonCourse.id,
      title: 'Python für Fortgeschrittene',
      topicId: pythonTopic?.id || 1,
      companyId: powerToWork.id,
      trainerId: null,
      startDate: new Date('2026-01-20'),
      endDate: new Date('2026-01-20'),
      startTime: '09:00',
      endTime: '16:00',
      location: 'Online (Microsoft Teams)',
      participantCount: 10,
      dailyRate: 900,
      description: 'Fortgeschrittene Python-Themen: OOP, Testing, Best Practices',
      status: 'DRAFT'
    }
  });

  console.log(`  ✓ Created 5 trainings`);

  // Create Participants for trainings
  console.log('\n👥 Creating participants...');

  // Training 1 participants (COMPLETED)
  for (let i = 1; i <= training1.participantCount; i++) {
    await prisma.participant.create({
      data: {
        trainingId: training1.id,
        name: i <= 3 ? `Teilnehmer ${i}` : null, // First 3 have names
        email: i <= 3 ? `teilnehmer${i}@example.com` : null
      }
    });
  }

  // Training 2 participants (IN_PROGRESS)
  for (let i = 1; i <= training2.participantCount; i++) {
    await prisma.participant.create({
      data: {
        trainingId: training2.id,
        name: i <= 5 ? `Teilnehmer React ${i}` : null,
        email: i <= 5 ? `react${i}@example.com` : null
      }
    });
  }

  console.log(`  ✓ Created ${training1.participantCount + training2.participantCount} participants`);

  // Create Training Requests
  console.log('\n📬 Creating training requests...');

  const annaTrainer = createdTrainers.find(t => t.firstName === 'Anna');
  const sarahTrainer = createdTrainers.find(t => t.firstName === 'Sarah');

  // Request 1: Photoshop - Anna (ACCEPTED)
  const request1 = await prisma.trainingRequest.create({
    data: {
      trainingId: training3.id,
      trainerId: annaTrainer?.id || 2,
      status: 'ACCEPTED',
      message: 'Ich habe bereits viele Photoshop-Workshops gegeben und würde mich freuen!'
    }
  });

  // Request 2: Photoshop - Lorenz (PENDING)
  const request2 = await prisma.trainingRequest.create({
    data: {
      trainingId: training3.id,
      trainerId: lorenz.id,
      status: 'PENDING',
      message: 'Ich kenne mich auch mit Photoshop aus und wäre verfügbar.'
    }
  });

  // Request 3: Excel - Sarah (PENDING)
  const request3 = await prisma.trainingRequest.create({
    data: {
      trainingId: training4.id,
      trainerId: sarahTrainer?.id || 3,
      status: 'PENDING',
      message: 'Excel ist mein Spezialgebiet! Würde mich sehr freuen.'
    }
  });

  // Request 4: Excel - Lorenz (DECLINED)
  const request4 = await prisma.trainingRequest.create({
    data: {
      trainingId: training4.id,
      trainerId: lorenz.id,
      status: 'DECLINED',
      message: 'Leider bin ich zu diesem Zeitpunkt nicht verfügbar.'
    }
  });

  console.log(`  ✓ Created 4 training requests (1 ACCEPTED, 2 PENDING, 1 DECLINED)`);

  // Create Inquiry Messages
  console.log('\n💬 Creating inquiry messages...');

  // Conversation for Photoshop (request1 - ACCEPTED)
  await prisma.inquiryMessage.create({
    data: {
      trainingRequestId: request1.id,
      senderId: annaTrainer?.id || 2,
      senderType: 'TRAINER',
      recipientId: powerToWork.id,
      recipientType: 'TRAINING_COMPANY',
      subject: 'Zusage für Photoshop Workshop',
      message: 'Hallo PowerToWork Team,\n\nich freue mich sehr, dass meine Bewerbung angenommen wurde!\n\nHaben Sie schon Materialien, oder soll ich eigene mitbringen?\n\nViele Grüße,\nAnna Schmidt',
      isRead: true,
      createdAt: new Date('2024-10-20T10:00:00')
    }
  });

  await prisma.inquiryMessage.create({
    data: {
      trainingRequestId: request1.id,
      senderId: powerToWork.id,
      senderType: 'TRAINING_COMPANY',
      recipientId: annaTrainer?.id || 2,
      recipientType: 'TRAINER',
      subject: 'Re: Zusage für Photoshop Workshop',
      message: 'Hallo Anna,\n\nwir freuen uns auch sehr!\n\nBitte bringen Sie gerne Ihre eigenen Materialien mit. Die Teilnehmer haben unterschiedliche Vorkenntnisse.\n\nBis bald!\nSarah Müller',
      isRead: false,
      createdAt: new Date('2024-10-20T14:30:00')
    }
  });

  // Conversation for Excel (request3 - PENDING)
  await prisma.inquiryMessage.create({
    data: {
      trainingRequestId: request3.id,
      senderId: sarahTrainer?.id || 3,
      senderType: 'TRAINER',
      recipientId: powerToWork.id,
      recipientType: 'TRAINING_COMPANY',
      subject: 'Bewerbung Excel Workshop',
      message: 'Sehr geehrtes PowerToWork Team,\n\nich habe über 500 Excel-Schulungen durchgeführt.\n\nKönnen Sie mir mehr über die Zielgruppe sagen?\n\nMit freundlichen Grüßen,\nSarah Weber',
      isRead: true,
      createdAt: new Date('2024-10-25T09:00:00')
    }
  });

  console.log(`  ✓ Created 3 inquiry messages`);

  // Create Invoice for completed training
  console.log('\n💰 Creating invoices...');

  const invoice1 = await prisma.invoice.create({
    data: {
      trainerId: lorenz.id,
      trainingId: training1.id,
      amount: training1.dailyRate * 1, // 1 day
      invoiceNumber: 'INV-2024-10-001',
      invoiceDate: new Date('2024-10-16'),
      status: 'SUBMITTED',
      createdAt: new Date('2024-10-16')
    }
  });

  const invoice2 = await prisma.invoice.create({
    data: {
      trainerId: lorenz.id,
      trainingId: training2.id,
      amount: training2.dailyRate * 2, // 2 days
      invoiceNumber: 'INV-2024-10-002',
      invoiceDate: new Date('2024-10-30'),
      status: 'SUBMITTED',
      createdAt: new Date('2024-10-30')
    }
  });

  console.log(`  ✓ Created 2 invoices for Lorenz`);

  // Create Availability for Lorenz
  console.log('\n📅 Creating trainer availability...');

  // Lorenz is available Monday-Friday, 9-17
  for (let day = 1; day <= 5; day++) {
    await prisma.availability.create({
      data: {
        trainerId: lorenz.id,
        dayOfWeek: day, // 1=Monday, 5=Friday
        startTime: '09:00',
        endTime: '17:00',
        isActive: true
      }
    });
  }

  console.log(`  ✓ Created weekly availability for Lorenz`);

  console.log('\n✅ PowerToWork Demo Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`  - ${createdTopics.length} topics from CSV`);
  console.log(`  - 1 Training Company: PowerToWork GmbH`);
  console.log(`  - 5 Trainers (Lorenz Surkemper + 4 others)`);
  console.log(`  - 4 Courses (templates)`);
  console.log(`  - 5 Trainings:`);
  console.log(`    • 1 COMPLETED (mit Invoice)`);
  console.log(`    • 1 IN_PROGRESS`);
  console.log(`    • 2 PUBLISHED (mit Training Requests)`);
  console.log(`    • 1 DRAFT`);
  console.log(`  - ${training1.participantCount + training2.participantCount} Participants`);
  console.log(`  - 4 Training Requests`);
  console.log(`  - 3 Inquiry Messages`);
  console.log(`  - 2 Invoices for Lorenz`);
  console.log(`  - 5 Availability slots for Lorenz`);
  console.log('\n🎯 Demo Login:');
  console.log(`  Company: surkemper@powertowork.com`);
  console.log(`  Trainer: surkemper@powertowork.com`);
  console.log('\n🎉 Database is ready for demo!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

