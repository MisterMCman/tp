import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data in correct order (delete child records before parent records)
  await prisma.inquiry.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.event.deleteMany();
  await prisma.course.deleteMany();
  await prisma.trainerTopic.deleteMany();
  await prisma.loginToken.deleteMany();
  await prisma.topicSuggestion.deleteMany();
  await prisma.trainerProfileVersion.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.trainer.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.country.deleteMany();

  // Reset auto-increment counters to start from 1
  await prisma.$executeRaw`ALTER TABLE Country AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Trainer AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Topic AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Course AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Event AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Inquiry AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE TrainerTopic AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE LoginToken AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE TopicSuggestion AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE TrainerProfileVersion AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Availability AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Invoice AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Participant AUTO_INCREMENT = 1`;

  // Create countries (prioritize German-speaking countries first, then alphabetical)
  const priorityCountries = [
    { name: 'Deutschland', code: 'DE', phoneCode: '+49' },
    { name: 'Österreich', code: 'AT', phoneCode: '+43' },
    { name: 'Schweiz', code: 'CH', phoneCode: '+41' }
  ];

  const otherCountries = [
    { name: 'Afghanistan', code: 'AF', phoneCode: '+93' },
    { name: 'Albanien', code: 'AL', phoneCode: '+355' },
    { name: 'Algerien', code: 'DZ', phoneCode: '+213' },
    { name: 'Argentinien', code: 'AR', phoneCode: '+54' },
    { name: 'Australien', code: 'AU', phoneCode: '+61' },
    { name: 'Belgien', code: 'BE', phoneCode: '+32' },
    { name: 'Brasilien', code: 'BR', phoneCode: '+55' },
    { name: 'Bulgarien', code: 'BG', phoneCode: '+359' },
    { name: 'Chile', code: 'CL', phoneCode: '+56' },
    { name: 'China', code: 'CN', phoneCode: '+86' },
    { name: 'Dänemark', code: 'DK', phoneCode: '+45' },
    { name: 'Estland', code: 'EE', phoneCode: '+372' },
    { name: 'Finnland', code: 'FI', phoneCode: '+358' },
    { name: 'Frankreich', code: 'FR', phoneCode: '+33' },
    { name: 'Griechenland', code: 'GR', phoneCode: '+30' },
    { name: 'Indien', code: 'IN', phoneCode: '+91' },
    { name: 'Indonesien', code: 'ID', phoneCode: '+62' },
    { name: 'Irland', code: 'IE', phoneCode: '+353' },
    { name: 'Island', code: 'IS', phoneCode: '+354' },
    { name: 'Israel', code: 'IL', phoneCode: '+972' },
    { name: 'Italien', code: 'IT', phoneCode: '+39' },
    { name: 'Japan', code: 'JP', phoneCode: '+81' },
    { name: 'Kanada', code: 'CA', phoneCode: '+1' },
    { name: 'Kolumbien', code: 'CO', phoneCode: '+57' },
    { name: 'Kroatien', code: 'HR', phoneCode: '+385' },
    { name: 'Lettland', code: 'LV', phoneCode: '+371' },
    { name: 'Litauen', code: 'LT', phoneCode: '+370' },
    { name: 'Luxemburg', code: 'LU', phoneCode: '+352' },
    { name: 'Malaysia', code: 'MY', phoneCode: '+60' },
    { name: 'Mexiko', code: 'MX', phoneCode: '+52' },
    { name: 'Niederlande', code: 'NL', phoneCode: '+31' },
    { name: 'Norwegen', code: 'NO', phoneCode: '+47' },
    { name: 'Neuseeland', code: 'NZ', phoneCode: '+64' },
    { name: 'Peru', code: 'PE', phoneCode: '+51' },
    { name: 'Philippinen', code: 'PH', phoneCode: '+63' },
    { name: 'Polen', code: 'PL', phoneCode: '+48' },
    { name: 'Portugal', code: 'PT', phoneCode: '+351' },
    { name: 'Rumänien', code: 'RO', phoneCode: '+40' },
    { name: 'Russland', code: 'RU', phoneCode: '+7' },
    { name: 'Saudi-Arabien', code: 'SA', phoneCode: '+966' },
    { name: 'Schweden', code: 'SE', phoneCode: '+46' },
    { name: 'Singapur', code: 'SG', phoneCode: '+65' },
    { name: 'Slowakei', code: 'SK', phoneCode: '+421' },
    { name: 'Slowenien', code: 'SI', phoneCode: '+386' },
    { name: 'Spanien', code: 'ES', phoneCode: '+34' },
    { name: 'Südafrika', code: 'ZA', phoneCode: '+27' },
    { name: 'Südkorea', code: 'KR', phoneCode: '+82' },
    { name: 'Thailand', code: 'TH', phoneCode: '+66' },
    { name: 'Tschechien', code: 'CZ', phoneCode: '+420' },
    { name: 'Türkei', code: 'TR', phoneCode: '+90' },
    { name: 'Ukraine', code: 'UA', phoneCode: '+380' },
    { name: 'Ungarn', code: 'HU', phoneCode: '+36' },
    { name: 'Vereinigte Arabische Emirate', code: 'AE', phoneCode: '+971' },
    { name: 'Vereinigtes Königreich', code: 'GB', phoneCode: '+44' },
    { name: 'Vereinigte Staaten', code: 'US', phoneCode: '+1' }
  ].sort((a, b) => a.name.localeCompare(b.name, 'de'));

  const countries = [...priorityCountries, ...otherCountries];

  const createdCountries = [];
  for (const countryData of countries) {
    const country = await prisma.country.create({
      data: countryData,
    });
    createdCountries.push(country);
  }

  // Get Germany reference for default selection
  const germany = createdCountries.find(c => c.code === 'DE');

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
      address: 'Hermannstraße 3\n33602 Bielefeld\nDeutschland',
      bio: 'Vielseitiger Trainer mit Expertise in Programming, Design und Projektmanagement.',
      bankDetails: JSON.stringify({
        accountHolder: 'Lorenz Surkemper',
        iban: 'DE89 3704 0044 0532 0130 00',
        bic: 'COBADEFFXXX',
        bankName: 'Commerzbank AG'
      }),
      taxId: 'DE123456789',
      countryId: germany?.id,
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
      countryId: germany?.id,
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
      countryId: germany?.id,
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
  const dataAnalysisTopic = createdTopics.find(t => t.name === 'Data Analysis');
  const machineLearningTopic = createdTopics.find(t => t.name === 'Machine Learning');

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
  if (dataAnalysisTopic) {
    await prisma.trainerTopic.create({
      data: { trainerId: mainTrainer.id, topicId: dataAnalysisTopic.id }
    });
  }
  if (machineLearningTopic) {
    await prisma.trainerTopic.create({
      data: { trainerId: mainTrainer.id, topicId: machineLearningTopic.id }
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

  // ADD MORE COMPREHENSIVE TRAINING DATA TO REPLACE REMOVED MOCK DATA
  
  // === UPCOMING TRAININGS (ACCEPTED) - For Dashboard and Trainings page ===
  
  // Create additional upcoming events that match the removed mock data
  const upcomingPythonEvent = await prisma.event.create({
    data: {
      courseId: pythonCourse.id,
      title: 'Einführung in Python',
      date: new Date('2025-10-15T09:00:00'),
      endTime: new Date('2025-10-15T17:00:00'),
      location: 'Online',
      participants: 12
    }
  });

  await prisma.inquiry.create({
    data: {
      trainerId: mainTrainer.id,
      eventId: upcomingPythonEvent.id,
      status: 'ACCEPTED',
      originalPrice: 800,
      proposedPrice: 800,
      message: 'Ein umfassender Einführungskurs in Python für Anfänger. Grundlegende Konzepte, Syntax und erste Anwendungen werden behandelt. Teilnehmer haben unterschiedliche Vorkenntnisse. Einige haben bereits Programmiererfahrung in anderen Sprachen.',
      createdAt: new Date('2025-01-01T09:00:00'),
      updatedAt: new Date('2025-01-02T14:00:00')
    }
  });

  const upcomingJsEvent = await prisma.event.create({
    data: {
      courseId: jsCourse.id,
      title: 'Advanced JavaScript Workshop',
      date: new Date('2025-10-22T13:30:00'),
      endTime: new Date('2025-10-22T18:00:00'),
      location: 'Berlin, Hauptstr. 17',
      participants: 8
    }
  });

  await prisma.inquiry.create({
    data: {
      trainerId: mainTrainer.id,
      eventId: upcomingJsEvent.id,
      status: 'ACCEPTED',
      originalPrice: 950,
      proposedPrice: 950,
      message: 'Workshop für fortgeschrittene JavaScript-Entwickler. ES6+, Promises, async/await und moderne JavaScript-Patterns werden behandelt. Alle Teilnehmer haben Grundkenntnisse in JavaScript. Fokus auf praktische Übungen legen.',
      createdAt: new Date('2025-01-01T10:00:00'),
      updatedAt: new Date('2025-01-02T15:00:00')
    }
  });

  const upcomingProjectEvent = await prisma.event.create({
    data: {
      courseId: projectCourse.id,
      title: 'Projektmanagement Grundlagen',
      date: new Date('2025-11-05T10:00:00'),
      endTime: new Date('2025-11-05T16:00:00'),
      location: 'München, Bahnhofplatz 3',
      participants: 15
    }
  });

  await prisma.inquiry.create({
    data: {
      trainerId: mainTrainer.id,
      eventId: upcomingProjectEvent.id,
      status: 'ACCEPTED',
      originalPrice: 1200,
      proposedPrice: 1200,
      message: 'Grundlagen des Projektmanagements mit Fokus auf agile Methoden und Teamführung. Teilnehmer kommen aus verschiedenen Branchen. Viele mit ersten Erfahrungen im Projektmanagement.',
      createdAt: new Date('2025-01-01T11:00:00'),
      updatedAt: new Date('2025-01-02T16:00:00')
    }
  });

  // === PAST TRAININGS (COMPLETED) - For Trainings history ===
  
  // Create additional courses for more variety
  const dataAnalysisCourse = await prisma.course.create({
    data: {
      title: 'Datenanalyse mit Python',
      description: 'Fortgeschrittene Datenanalyse mit Python, Pandas und NumPy',
      topicId: pythonTopic?.id,
      state: 'ONLINE'
    }
  });

  const reactAdvancedCourse = await prisma.course.create({
    data: {
      title: 'React für Fortgeschrittene',
      description: 'Fortgeschrittene Konzepte in React: Context API, Hooks, State Management und Performance-Optimierung',
      topicId: reactTopic?.id,
      state: 'ONLINE'
    }
  });

  // Past training events (using actual past dates)
  const pastDataAnalysisEvent = await prisma.event.create({
    data: {
      courseId: dataAnalysisCourse.id,
      title: 'Datenanalyse mit Python',
      date: new Date('2024-05-05T09:00:00'),
      endTime: new Date('2024-05-05T16:00:00'),
      location: 'Frankfurt, Mainzer Landstr. 50',
      participants: 10
    }
  });

  await prisma.inquiry.create({
    data: {
      trainerId: mainTrainer.id,
      eventId: pastDataAnalysisEvent.id,
      status: 'COMPLETED',
      originalPrice: 850,
      proposedPrice: 850,
      message: 'Fortgeschrittene Datenanalyse mit Python, Pandas und NumPy. Sehr interessierte Gruppe, viele Fragen zu praktischen Anwendungsfällen.',
      createdAt: new Date('2024-04-20T10:00:00'),
      updatedAt: new Date('2024-05-06T18:00:00')
    }
  });

  const pastReactEvent = await prisma.event.create({
    data: {
      courseId: reactAdvancedCourse.id,
      title: 'React für Fortgeschrittene',
      date: new Date('2024-06-12T10:00:00'),
      endTime: new Date('2024-06-12T17:00:00'),
      location: 'Online',
      participants: 14
    }
  });

  await prisma.inquiry.create({
    data: {
      trainerId: mainTrainer.id,
      eventId: pastReactEvent.id,
      status: 'COMPLETED',
      originalPrice: 900,
      proposedPrice: 900,
      message: 'Fortgeschrittene Konzepte in React: Context API, Hooks, State Management und Performance-Optimierung. Gutes technisches Niveau bei allen Teilnehmern. Viel Interesse an Redux und Zustand.',
      createdAt: new Date('2024-05-25T14:00:00'),
      updatedAt: new Date('2024-06-13T16:00:00')
    }
  });

  // Add some COMPLETED trainings for Lorenz to generate invoices (older dates for invoice history)
  const pythonCompletedEvent = await prisma.event.create({
    data: {
      courseId: pythonCourse.id,
      title: 'Python Grundlagen Workshop',
      date: new Date('2024-12-15T09:00:00'),
      endTime: new Date('2024-12-15T17:00:00'),
      location: 'München, TechCenter',
      participants: 12
    }
  });

  await prisma.inquiry.create({
    data: {
      trainerId: mainTrainer.id,
      eventId: pythonCompletedEvent.id,
      status: 'COMPLETED',
      originalPrice: 800,
      proposedPrice: 800,
      message: 'Python Grundlagen für Einsteiger - erfolgreich abgeschlossen.',
      createdAt: new Date('2024-12-01T10:00:00'),
      updatedAt: new Date('2024-12-16T18:00:00')
    }
  });

  const jsCompletedEvent = await prisma.event.create({
    data: {
      courseId: jsCourse.id,
      title: 'JavaScript Advanced Workshop',
      date: new Date('2024-11-20T13:30:00'),
      endTime: new Date('2024-11-20T18:00:00'),
      location: 'Berlin, Startup Hub',
      participants: 8
    }
  });

  await prisma.inquiry.create({
    data: {
      trainerId: mainTrainer.id,
      eventId: jsCompletedEvent.id,
      status: 'COMPLETED',
      originalPrice: 950,
      proposedPrice: 950,
      counterPrice: 1100,
      message: 'JavaScript Advanced - Workshop erfolgreich durchgeführt.',
      createdAt: new Date('2024-11-05T14:00:00'),
      updatedAt: new Date('2024-11-21T16:30:00')
    }
  });

  console.log('Seed data inserted successfully:');
  console.log('- Topics created:', topics.length);
  console.log('- 3 Trainers created:');
  console.log(`  - Main Trainer (ID: ${mainTrainer.id}): Lorenz Surkemper - All requests assigned to him`);
  console.log(`    - Address: Hermannstraße 3, 33602 Bielefeld, Deutschland`);
  console.log(`    - Bank: Commerzbank AG (DE89 3704 0044 0532 0130 00)`);
  console.log(`    - Tax ID: DE123456789`);
  console.log(`  - Trainer 2 (ID: ${trainer2.id}): Anna Schmidt - Design/Marketing`);
  console.log(`  - Trainer 3 (ID: ${trainer3.id}): Thomas Weber - Project Management`);
  console.log('- Courses created: 8 courses with variety of topics');
  console.log('- Events created: Multiple events spanning past, present, and future');
  console.log('- Training requests (inquiries) created - ALL assigned to Lorenz Surkemper:');
  console.log('  ✓ 3 PENDING requests (for dashboard pending count)');
  console.log('  ✓ 3 ACCEPTED upcoming trainings (for dashboard and trainings page)');
  console.log('  ✓ 4 COMPLETED past trainings (for training history and invoices)');
  console.log('  ✓ 1 REJECTED request (for complete status coverage)');
  console.log('  ✓ 1 ABGESAGT request (for German cancellation status)');
  console.log('- Mock data from frontend has been moved to comprehensive seed data');
  console.log('- Database now supports all dashboard and training page functionality');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
