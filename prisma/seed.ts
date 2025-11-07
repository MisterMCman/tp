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

  // Clear existing data in correct order (child tables first)
  console.log('🗑️  Clearing existing data...');
  await prisma.fileAttachment.deleteMany();
  await prisma.message.deleteMany();
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
  await prisma.$executeRaw`ALTER TABLE Course AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Training AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE TrainingRequest AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Message AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE LoginToken AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE TrainingCompanyLoginToken AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE TopicSuggestion AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Participant AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Invoice AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Availability AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE FileAttachment AUTO_INCREMENT = 1`;
  await prisma.$executeRaw`ALTER TABLE Message AUTO_INCREMENT = 1`;

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
      firstName: 'Sarah',
      lastName: 'Müller',
      email: 'sarah.mueller@powertowork.com',
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
      consultantName: 'Sarah Müller',
      status: 'ACTIVE',
      countryId: germany?.id,
      onboardingStatus: 'Aktiv'
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
      topics: [
        { slug: 'adobe-photoshop', level: 'EXPERTE' },
        { slug: 'adobe-illustrator', level: 'EXPERTE' },
        { slug: 'adobe-indesign', level: 'FORTGESCHRITTEN' },
        { slug: 'figma', level: 'FORTGESCHRITTEN' }
      ]
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
      topics: [
        { slug: 'agiles-projektmanagement', level: 'EXPERTE' },
        { slug: 'scrum', level: 'EXPERTE' },
        { slug: 'kanban', level: 'FORTGESCHRITTEN' }
      ]
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
      topics: [
        { slug: 'microsoft-excel', level: 'EXPERTE' },
        { slug: 'microsoft-power-bi', level: 'FORTGESCHRITTEN' },
        { slug: 'microsoft-powerpoint', level: 'GRUNDLAGE' }
      ]
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
      topics: [
        { slug: 'aws', level: 'EXPERTE' },
        { slug: 'microsoft-azure', level: 'EXPERTE' },
        { slug: 'docker', level: 'FORTGESCHRITTEN' },
        { slug: 'kubernetes', level: 'GRUNDLAGE' }
      ]
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

    // Assign topics with expertise levels
    for (const topicItem of trainerData.topics) {
      const topicSlug = typeof topicItem === 'string' ? topicItem : topicItem.slug;
      const expertiseLevel = typeof topicItem === 'string' ? 'GRUNDLAGE' : (topicItem.level || 'GRUNDLAGE');
      const topic = createdTopics.find(t => t.slug === topicSlug);
      if (topic) {
        await prisma.trainerTopic.create({
          data: { 
            trainerId: trainer.id, 
            topicId: topic.id,
            expertiseLevel: expertiseLevel as 'GRUNDLAGE' | 'FORTGESCHRITTEN' | 'EXPERTE'
          }
        });
      }
    }

    createdTrainers.push(trainer);
    console.log(`  ✓ ${trainer.firstName} ${trainer.lastName}`);
  }

  // Assign topics to Lorenz with mixed expertise levels
  const lorenzTopics = [
    { slug: 'python', level: 'EXPERTE' },
    { slug: 'javascript', level: 'EXPERTE' },
    { slug: 'react', level: 'EXPERTE' },
    { slug: 'node-js', level: 'FORTGESCHRITTEN' },
    { slug: 'typescript', level: 'FORTGESCHRITTEN' },
    { slug: 'html', level: 'GRUNDLAGE' },
    { slug: 'css', level: 'GRUNDLAGE' }
  ];
  for (const topicItem of lorenzTopics) {
    const topic = createdTopics.find(t => t.slug === topicItem.slug);
    if (topic) {
      await prisma.trainerTopic.create({
        data: { 
          trainerId: lorenz.id, 
          topicId: topic.id,
          expertiseLevel: topicItem.level as 'GRUNDLAGE' | 'FORTGESCHRITTEN' | 'EXPERTE'
        }
      });
    }
  }

  // Create Courses (Templates)
  console.log('\n📚 Creating courses (templates)...');

  // Get topics for all trainers
  const pythonTopic = createdTopics.find(t => t.slug === 'python');
  const reactTopic = createdTopics.find(t => t.slug === 'react');
  const javascriptTopic = createdTopics.find(t => t.slug === 'javascript');
  const typescriptTopic = createdTopics.find(t => t.slug === 'typescript');
  const photoshopTopic = createdTopics.find(t => t.slug === 'adobe-photoshop');
  const illustratorTopic = createdTopics.find(t => t.slug === 'adobe-illustrator');
  const indesignTopic = createdTopics.find(t => t.slug === 'adobe-indesign');
  const figmaTopic = createdTopics.find(t => t.slug === 'figma');
  const excelTopic = createdTopics.find(t => t.slug === 'microsoft-excel');
  const powerBITopic = createdTopics.find(t => t.slug === 'microsoft-power-bi');
  const powerpointTopic = createdTopics.find(t => t.slug === 'microsoft-powerpoint');
  const scrumTopic = createdTopics.find(t => t.slug === 'scrum');
  const agileTopic = createdTopics.find(t => t.slug === 'agiles-projektmanagement');
  const kanbanTopic = createdTopics.find(t => t.slug === 'kanban');
  const awsTopic = createdTopics.find(t => t.slug === 'aws');
  const azureTopic = createdTopics.find(t => t.slug === 'microsoft-azure');
  const dockerTopic = createdTopics.find(t => t.slug === 'docker');

  const courses = [];

  // Lorenz topics: python, javascript, react, typescript
  if (pythonTopic) {
    courses.push(await prisma.course.create({
      data: { title: 'Python Grundlagen', description: 'Einführung in Python-Programmierung', topicId: pythonTopic.id, state: 'ONLINE' }
    }));
  }
  if (javascriptTopic) {
    courses.push(await prisma.course.create({
      data: { title: 'JavaScript Modern', description: 'Moderne JavaScript-Features und Best Practices', topicId: javascriptTopic.id, state: 'ONLINE' }
    }));
  }
  if (reactTopic) {
    courses.push(await prisma.course.create({
      data: { title: 'React für Fortgeschrittene', description: 'Fortgeschrittene React-Konzepte', topicId: reactTopic.id, state: 'ONLINE' }
    }));
  }
  if (typescriptTopic) {
    courses.push(await prisma.course.create({
      data: { title: 'TypeScript Fundamentals', description: 'TypeScript Grundlagen und erweiterte Typen', topicId: typescriptTopic.id, state: 'ONLINE' }
    }));
  }

  // Anna topics: photoshop, illustrator, indesign, figma
  if (photoshopTopic) {
    courses.push(await prisma.course.create({
      data: { title: 'Adobe Photoshop Basics', description: 'Grundlagen der Bildbearbeitung', topicId: photoshopTopic.id, state: 'ONLINE' }
    }));
  }
  if (illustratorTopic) {
    courses.push(await prisma.course.create({
      data: { title: 'Adobe Illustrator Workshop', description: 'Vektorgrafiken und Illustrationen erstellen', topicId: illustratorTopic.id, state: 'ONLINE' }
    }));
  }
  if (indesignTopic) {
    courses.push(await prisma.course.create({
      data: { title: 'Adobe InDesign Layout', description: 'Professionelles Layout und Druckvorbereitung', topicId: indesignTopic.id, state: 'ONLINE' }
    }));
  }
  if (figmaTopic) {
    courses.push(await prisma.course.create({
      data: { title: 'Figma Design System', description: 'UI/UX Design mit Figma', topicId: figmaTopic.id, state: 'ONLINE' }
    }));
  }

  // Sarah topics: excel, power-bi, powerpoint
  if (excelTopic) {
    courses.push(await prisma.course.create({
      data: { title: 'Excel für Fortgeschrittene', description: 'Pivot-Tabellen, Formeln, Makros', topicId: excelTopic.id, state: 'ONLINE' }
    }));
  }
  if (powerBITopic) {
    courses.push(await prisma.course.create({
      data: { title: 'Power BI Datenanalyse', description: 'Datenvisualisierung und Business Intelligence', topicId: powerBITopic.id, state: 'ONLINE' }
    }));
  }
  if (powerpointTopic) {
    courses.push(await prisma.course.create({
      data: { title: 'PowerPoint Präsentationen', description: 'Professionelle Präsentationen erstellen', topicId: powerpointTopic.id, state: 'ONLINE' }
    }));
  }

  // Thomas topics: scrum, agile, kanban
  if (scrumTopic) {
    courses.push(await prisma.course.create({
      data: { title: 'Scrum Master Zertifizierung', description: 'Scrum Framework und Rollen', topicId: scrumTopic.id, state: 'ONLINE' }
    }));
  }
  if (agileTopic) {
    courses.push(await prisma.course.create({
      data: { title: 'Agiles Projektmanagement', description: 'Agile Methoden und Frameworks', topicId: agileTopic.id, state: 'ONLINE' }
    }));
  }
  if (kanbanTopic) {
    courses.push(await prisma.course.create({
      data: { title: 'Kanban Workshop', description: 'Kanban Board und Workflow-Optimierung', topicId: kanbanTopic.id, state: 'ONLINE' }
    }));
  }

  // Michael topics: aws, azure, docker
  if (awsTopic) {
    courses.push(await prisma.course.create({
      data: { title: 'AWS Cloud Fundamentals', description: 'Amazon Web Services Grundlagen', topicId: awsTopic.id, state: 'ONLINE' }
    }));
  }
  if (azureTopic) {
    courses.push(await prisma.course.create({
      data: { title: 'Microsoft Azure Administration', description: 'Azure Cloud Services und Management', topicId: azureTopic.id, state: 'ONLINE' }
    }));
  }
  if (dockerTopic) {
    courses.push(await prisma.course.create({
      data: { title: 'Docker Container', description: 'Containerisierung und Orchestrierung', topicId: dockerTopic.id, state: 'ONLINE' }
    }));
  }

  console.log(`  ✓ Created ${courses.length} courses`);

  // Create Trainings (Concrete instances of courses)
  console.log('\n📅 Creating trainings (concrete course instances)...');

  const allTrainings = [];
  
  // Define date ranges based on current date
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  
  // Completed trainings: 30-60 days ago (spread across this range)
  const completedTrainingsStartDaysAgo = 60;
  const completedTrainingsEndDaysAgo = 30;
  
  // Future trainings: 7-30 days from now (spread across this range)
  const futureTrainingsStartDaysFromNow = 7;
  const futureTrainingsEndDaysFromNow = 30;
  
  // All messages must be before today (historical)
  const maxMessageDate = new Date(today);
  maxMessageDate.setHours(23, 59, 59, 999);
  maxMessageDate.setDate(maxMessageDate.getDate() - 1); // Yesterday at end of day

  // Create trainings for each course - we need enough for 6 requests per trainer
  // We'll create 30 trainings (6 per trainer)
  // Structure: First 2 per trainer = COMPLETED (in the past), Last 4 = PUBLISHED (in the future)
  const trainingTemplates = [
    // Lorenz topics (python, javascript, react, typescript) - 6 trainings
    { course: courses.find(c => c.title === 'Python Grundlagen'), topic: pythonTopic, title: 'Python Grundlagen Workshop', dailyRate: 850 },
    { course: courses.find(c => c.title === 'Python Grundlagen'), topic: pythonTopic, title: 'Python Advanced Workshop', dailyRate: 900 },
    { course: courses.find(c => c.title === 'JavaScript Modern'), topic: javascriptTopic, title: 'JavaScript Modern Workshop', dailyRate: 850 },
    { course: courses.find(c => c.title === 'React für Fortgeschrittene'), topic: reactTopic, title: 'React Advanced Workshop', dailyRate: 900 },
    { course: courses.find(c => c.title === 'TypeScript Fundamentals'), topic: typescriptTopic, title: 'TypeScript Fundamentals', dailyRate: 850 },
    { course: courses.find(c => c.title === 'Python Grundlagen'), topic: pythonTopic, title: 'Python für Einsteiger', dailyRate: 800 },
    
    // Anna topics (photoshop, illustrator, indesign, figma) - 6 trainings
    { course: courses.find(c => c.title === 'Adobe Photoshop Basics'), topic: photoshopTopic, title: 'Photoshop Bildbearbeitung', dailyRate: 750 },
    { course: courses.find(c => c.title === 'Adobe Illustrator Workshop'), topic: illustratorTopic, title: 'Illustrator Vektorgrafiken', dailyRate: 750 },
    { course: courses.find(c => c.title === 'Adobe InDesign Layout'), topic: indesignTopic, title: 'InDesign Layout Design', dailyRate: 750 },
    { course: courses.find(c => c.title === 'Figma Design System'), topic: figmaTopic, title: 'Figma UI/UX Design', dailyRate: 700 },
    { course: courses.find(c => c.title === 'Adobe Photoshop Basics'), topic: photoshopTopic, title: 'Photoshop Retusche', dailyRate: 750 },
    { course: courses.find(c => c.title === 'Adobe Illustrator Workshop'), topic: illustratorTopic, title: 'Illustrator für Fortgeschrittene', dailyRate: 800 },
    
    // Sarah topics (excel, power-bi, powerpoint) - 6 trainings
    { course: courses.find(c => c.title === 'Excel für Fortgeschrittene'), topic: excelTopic, title: 'Excel für Fortgeschrittene', dailyRate: 650 },
    { course: courses.find(c => c.title === 'Power BI Datenanalyse'), topic: powerBITopic, title: 'Power BI Datenvisualisierung', dailyRate: 700 },
    { course: courses.find(c => c.title === 'PowerPoint Präsentationen'), topic: powerpointTopic, title: 'PowerPoint Professionell', dailyRate: 600 },
    { course: courses.find(c => c.title === 'Excel für Fortgeschrittene'), topic: excelTopic, title: 'Excel Pivot & Makros', dailyRate: 650 },
    { course: courses.find(c => c.title === 'Power BI Datenanalyse'), topic: powerBITopic, title: 'Power BI Advanced', dailyRate: 750 },
    { course: courses.find(c => c.title === 'Excel für Fortgeschrittene'), topic: excelTopic, title: 'Excel Datenanalyse', dailyRate: 650 },
    
    // Thomas topics (scrum, agile, kanban) - 6 trainings
    { course: courses.find(c => c.title === 'Scrum Master Zertifizierung'), topic: scrumTopic, title: 'Scrum Master Workshop', dailyRate: 950 },
    { course: courses.find(c => c.title === 'Agiles Projektmanagement'), topic: agileTopic, title: 'Agiles Projektmanagement', dailyRate: 950 },
    { course: courses.find(c => c.title === 'Kanban Workshop'), topic: kanbanTopic, title: 'Kanban Methodik', dailyRate: 900 },
    { course: courses.find(c => c.title === 'Scrum Master Zertifizierung'), topic: scrumTopic, title: 'Scrum für Teams', dailyRate: 950 },
    { course: courses.find(c => c.title === 'Agiles Projektmanagement'), topic: agileTopic, title: 'Agile Transformation', dailyRate: 1000 },
    { course: courses.find(c => c.title === 'Kanban Workshop'), topic: kanbanTopic, title: 'Kanban Board Setup', dailyRate: 900 },
    
    // Michael topics (aws, azure, docker) - 6 trainings
    { course: courses.find(c => c.title === 'AWS Cloud Fundamentals'), topic: awsTopic, title: 'AWS Cloud Fundamentals', dailyRate: 1100 },
    { course: courses.find(c => c.title === 'Microsoft Azure Administration'), topic: azureTopic, title: 'Azure Administration', dailyRate: 1100 },
    { course: courses.find(c => c.title === 'Docker Container'), topic: dockerTopic, title: 'Docker Container Workshop', dailyRate: 1000 },
    { course: courses.find(c => c.title === 'AWS Cloud Fundamentals'), topic: awsTopic, title: 'AWS Advanced', dailyRate: 1200 },
    { course: courses.find(c => c.title === 'Microsoft Azure Administration'), topic: azureTopic, title: 'Azure Cloud Services', dailyRate: 1100 },
    { course: courses.find(c => c.title === 'Docker Container'), topic: dockerTopic, title: 'Docker & Kubernetes', dailyRate: 1050 },
  ];

  // Create trainings with proper dates
  // Each trainer has 6 trainings: first 2 are COMPLETED (October 2025), last 4 are PUBLISHED (after 15.11.2025)
  for (let i = 0; i < trainingTemplates.length; i++) {
    const template = trainingTemplates[i];
    if (!template.course || !template.topic) continue;
    
    // Determine which trainer group this belongs to (0-5 = Lorenz, 6-11 = Anna, etc.)
    const trainerGroup = Math.floor(i / 6);
    const trainingIndexInGroup = i % 6;
    
    // First 2 per trainer = COMPLETED (in the past)
    // Last 4 per trainer = PUBLISHED (in the future)
    const isCompleted = trainingIndexInGroup < 2;
    const status = isCompleted ? 'COMPLETED' : 'PUBLISHED';
    
    // Set dates: completed in the past, others in the future
    let trainingDate: Date;
    if (isCompleted) {
      // Completed trainings: spread across 30-60 days ago
      const daysAgo = completedTrainingsEndDaysAgo + 
        ((completedTrainingsStartDaysAgo - completedTrainingsEndDaysAgo) / 10) * 
        (trainerGroup * 2 + trainingIndexInGroup);
      trainingDate = new Date(today);
      trainingDate.setDate(trainingDate.getDate() - Math.round(daysAgo));
    } else {
      // Future trainings: spread across 7-30 days from now
      const daysFromNow = futureTrainingsStartDaysFromNow + 
        ((futureTrainingsEndDaysFromNow - futureTrainingsStartDaysFromNow) / 20) * 
        (trainerGroup * 4 + (trainingIndexInGroup - 2));
      trainingDate = new Date(today);
      trainingDate.setDate(trainingDate.getDate() + Math.round(daysFromNow));
    }
    
    // Randomly assign start time (8:00 or 9:00) and end time (15:00 or 16:00)
    const startHour = (i % 2 === 0) ? '08' : '09';
    const endHour = (i % 2 === 0) ? '15' : '16';
    
    const training = await prisma.training.create({
      data: {
        courseId: template.course.id,
        title: template.title,
        topicId: template.topic.id,
        companyId: powerToWork.id,
        startDate: trainingDate,
        endDate: trainingDate,
        startTime: `${startHour}:00`,
        endTime: `${endHour}:00`,
        //todo locations should also be a table with name, address, city, country, etc.
        location: i % 3 === 0 ? 'Online (Zoom)' : i % 3 === 1 ? 'Berlin, Schulungsraum A' : 'München, TechHub',
        participantCount: 10 + (i % 5),
        dailyRate: template.dailyRate,
        description: `${template.title} - Professionelle Schulung`,
        status: status as 'PUBLISHED' | 'DRAFT' | 'COMPLETED' | 'IN_PROGRESS' | 'CANCELLED'
      }
    });
    allTrainings.push(training);
  }

  console.log(`  ✓ Created ${allTrainings.length} trainings (2 COMPLETED per trainer in the past, 4 PUBLISHED per trainer in the future)`);

  // Create Participants for trainings
  console.log('\n👥 Creating participants...');
  
  // Create participants for all trainings (especially important for completed ones)
  let participantCount = 0;
  for (let i = 0; i < allTrainings.length; i++) {
    const training = allTrainings[i];
    for (let j = 1; j <= training.participantCount; j++) {
      await prisma.participant.create({
        data: {
          trainingId: training.id,
          name: j <= 3 ? `Teilnehmer ${j}` : null,
          email: j <= 3 ? `teilnehmer${i}_${j}@example.com` : null
        }
      });
      participantCount++;
    }
  }

  console.log(`  ✓ Created ${participantCount} participants for all trainings`);

  // Create Training Requests (Trainer-Anfragen)
  console.log('\n📬 Creating training requests (6 per trainer: 2 PENDING, 2 DECLINED, 2 ACCEPTED)...');

  const annaTrainer = createdTrainers.find(t => t.firstName === 'Anna');
  const thomasTrainer = createdTrainers.find(t => t.firstName === 'Thomas');
  const sarahTrainer = createdTrainers.find(t => t.firstName === 'Sarah');
  const michaelTrainer = createdTrainers.find(t => t.firstName === 'Michael');

  // Helper function to get trainings for a trainer's topics
  const getTrainingsForTrainer = (trainerName: string) => {
    if (trainerName === 'Lorenz') {
      // Lorenz: python, javascript, react, typescript (first 6 trainings)
      return allTrainings.slice(0, 6);
    } else if (trainerName === 'Anna') {
      // Anna: photoshop, illustrator, indesign, figma (trainings 6-11)
      return allTrainings.slice(6, 12);
    } else if (trainerName === 'Sarah') {
      // Sarah: excel, power-bi, powerpoint (trainings 12-17)
      return allTrainings.slice(12, 18);
    } else if (trainerName === 'Thomas') {
      // Thomas: scrum, agile, kanban (trainings 18-23)
      return allTrainings.slice(18, 24);
    } else if (trainerName === 'Michael') {
      // Michael: aws, azure, docker (trainings 24-29)
      return allTrainings.slice(24, 30);
    }
    return [];
  };

  // Create 6 requests per trainer with distribution: 2 PENDING, 2 DECLINED, 2 ACCEPTED
  const trainerInfos = [
    { name: 'Lorenz', trainer: lorenz },
    { name: 'Anna', trainer: annaTrainer },
    { name: 'Sarah', trainer: sarahTrainer },
    { name: 'Thomas', trainer: thomasTrainer },
    { name: 'Michael', trainer: michaelTrainer }
  ];

  const allRequests = [];
  
  for (const trainerInfo of trainerInfos) {
    if (!trainerInfo.trainer) continue;
    
    const trainerTrainings = getTrainingsForTrainer(trainerInfo.name);
    if (trainerTrainings.length < 6) continue;
    
    // Create 6 requests: 2 ACCEPTED (for first 2 COMPLETED trainings), 2 PENDING, 2 DECLINED
    // First 2 trainings are COMPLETED -> should have ACCEPTED requests
    // Last 4 trainings are PUBLISHED -> should have PENDING and DECLINED requests
    const statuses = ['ACCEPTED', 'ACCEPTED', 'PENDING', 'PENDING', 'DECLINED', 'DECLINED'];
    
    for (let i = 0; i < 6; i++) {
      const training = trainerTrainings[i];
      const status = statuses[i] as 'PENDING' | 'DECLINED' | 'ACCEPTED';
      const counterPrice = status === 'ACCEPTED' ? training.dailyRate : (status === 'PENDING' && i === 1 ? training.dailyRate + 50 : null);
      
      const request = await prisma.trainingRequest.create({
        data: {
          trainingId: training.id,
          trainerId: trainerInfo.trainer.id,
          status: status,
          counterPrice: counterPrice
        }
      });
      allRequests.push(request);
    }
    
    console.log(`  ✓ Created 6 requests for ${trainerInfo.name} (2 PENDING, 2 DECLINED, 2 ACCEPTED)`);
  }

  console.log(`  ✓ Created ${allRequests.length} training requests total`);

  // Create Messages for training requests
  console.log('\n💬 Creating messages for training requests...');

  let messageCount = 0;
  
  // Create messages for different request statuses
  for (const request of allRequests) {
    const trainer = createdTrainers.find(t => t.id === request.trainerId);
    if (!trainer) continue;
    
    const training = allTrainings.find(t => t.id === request.trainingId);
    if (!training) continue;
    
    if (request.status === 'ACCEPTED') {
      // For accepted requests: create conversation thread
      // Messages should be in the past, relative to the training date (if training is completed) or relative to today
      const trainingDate = new Date(training.startDate);
      
      // Base date: if training is completed, use training date - 7 days, otherwise use today - 7 days
      const baseDaysBefore = training.status === 'COMPLETED' 
        ? Math.max(7, Math.floor((today.getTime() - trainingDate.getTime()) / (24 * 60 * 60 * 1000)) + 7)
        : 7;
      const baseDate = new Date(today);
      baseDate.setDate(baseDate.getDate() - baseDaysBefore);
      baseDate.setHours(10, 0, 0, 0);
      
      const messageDate1 = new Date(baseDate.getTime() + (request.id * 2 * 60 * 60 * 1000)); // First message: base + hours based on request ID
      const messageDate2 = new Date(messageDate1.getTime() + 2 * 60 * 60 * 1000); // Reply: 2 hours later
      const notificationDate = new Date(messageDate1.getTime() - 1 * 60 * 60 * 1000); // Notification: 1 hour before first message
      
      // Ensure all dates are before maxMessageDate (yesterday)
      const finalNotificationDate = notificationDate > maxMessageDate ? new Date(maxMessageDate.getTime() - 2 * 60 * 60 * 1000) : notificationDate;
      const finalMessageDate1 = messageDate1 > maxMessageDate ? new Date(maxMessageDate.getTime() - 1 * 60 * 60 * 1000) : messageDate1;
      const finalMessageDate2 = messageDate2 > maxMessageDate ? new Date(maxMessageDate.getTime()) : messageDate2;
      
      // Create notification message for acceptance (as if auto-created by system) - comes first chronologically
      await prisma.message.create({
        data: {
          trainingRequestId: request.id,
          senderId: powerToWork.id,
          senderType: 'TRAINING_COMPANY',
          recipientId: trainer.id,
          recipientType: 'TRAINER',
          subject: `Anfrage angenommen: ${training.title}`,
          message: `Herzlichen Glückwunsch! Ihre Anfrage für das Training "${training.title}" wurde angenommen. Sie können nun weitere Details im Dashboard einsehen.`,
          isRead: false,
          messageType: 'NOTIFICATION',
          createdAt: finalNotificationDate
        }
      });
      messageCount++;
      
      // Trainer sends initial acceptance message
      await prisma.message.create({
        data: {
          trainingRequestId: request.id,
          senderId: trainer.id,
          senderType: 'TRAINER',
          recipientId: powerToWork.id,
          recipientType: 'TRAINING_COMPANY',
          subject: `Zusage für ${training.title}`,
          message: `Hallo PowerToWork Team,\n\nich freue mich sehr, dass meine Bewerbung für "${training.title}" angenommen wurde!\n\nHaben Sie schon Materialien, oder soll ich eigene mitbringen?\n\nViele Grüße,\n${trainer.firstName} ${trainer.lastName}`,
          isRead: true,
          messageType: 'TRAINING_REQUEST',
          createdAt: finalMessageDate1
        }
      });
      messageCount++;
      
      // Company responds
      await prisma.message.create({
        data: {
          trainingRequestId: request.id,
          senderId: powerToWork.id,
          senderType: 'TRAINING_COMPANY',
          recipientId: trainer.id,
          recipientType: 'TRAINER',
          subject: `Re: Zusage für ${training.title}`,
          message: `Hallo ${trainer.firstName},\n\nwir freuen uns auch sehr!\n\nBitte bringen Sie gerne Ihre eigenen Materialien mit. Die Teilnehmer haben unterschiedliche Vorkenntnisse.\n\nBis bald!\nSarah Müller\nPowerToWork`,
          isRead: false,
          messageType: 'TRAINING_REQUEST',
          createdAt: finalMessageDate2
        }
      });
      messageCount++;
    } else if (request.status === 'PENDING') {
      // For pending requests: create initial inquiry from trainer or company
      // Sometimes trainer asks questions, sometimes company provides more info
      const shouldTrainerAsk = Math.random() > 0.5;
      
      // Messages should be in the past (before today), but recent (within last 14 days)
      const baseDaysBefore = 3 + (request.id % 11); // 3-13 days ago
      const baseDate = new Date(today);
      baseDate.setDate(baseDate.getDate() - baseDaysBefore);
      baseDate.setHours(14, 0, 0, 0);
      
      const messageDate1 = new Date(baseDate.getTime() + (request.id * 3 * 60 * 60 * 1000)); // First message: base + hours based on request ID
      const messageDate2 = new Date(messageDate1.getTime() + 3 * 60 * 60 * 1000); // Reply: 3 hours later
      
      // Ensure all dates are before maxMessageDate (yesterday)
      const finalMessageDate1 = messageDate1 > maxMessageDate ? new Date(maxMessageDate.getTime() - 3 * 60 * 60 * 1000) : messageDate1;
      const finalMessageDate2 = messageDate2 > maxMessageDate ? new Date(maxMessageDate.getTime()) : messageDate2;
      
      if (shouldTrainerAsk) {
        // Trainer asks a question about the training
        await prisma.message.create({
          data: {
            trainingRequestId: request.id,
            senderId: trainer.id,
            senderType: 'TRAINER',
            recipientId: powerToWork.id,
            recipientType: 'TRAINING_COMPANY',
            subject: `Rückfrage zu ${training.title}`,
            message: `Hallo PowerToWork Team,\n\nich habe eine Frage zu "${training.title}": Welche Vorkenntnisse haben die Teilnehmer? Soll ich bestimmte Materialien vorbereiten?\n\nViele Grüße,\n${trainer.firstName} ${trainer.lastName}`,
            isRead: true,
            messageType: 'TRAINING_REQUEST',
            createdAt: finalMessageDate1
          }
        });
        messageCount++;
        
        // Company responds
        await prisma.message.create({
          data: {
            trainingRequestId: request.id,
            senderId: powerToWork.id,
            senderType: 'TRAINING_COMPANY',
            recipientId: trainer.id,
            recipientType: 'TRAINER',
            subject: `Re: Rückfrage zu ${training.title}`,
            message: `Hallo ${trainer.firstName},\n\nvielen Dank für Ihre Rückfrage!\n\nDie Teilnehmer haben unterschiedliche Vorkenntnisse. Bitte bereiten Sie Materialien für Anfänger bis Fortgeschrittene vor.\n\nBeste Grüße\nSarah Müller\nPowerToWork`,
            isRead: false,
            messageType: 'TRAINING_REQUEST',
            createdAt: finalMessageDate2
          }
        });
        messageCount++;
      } else {
        // Company provides additional information
        await prisma.message.create({
          data: {
            trainingRequestId: request.id,
            senderId: powerToWork.id,
            senderType: 'TRAINING_COMPANY',
            recipientId: trainer.id,
            recipientType: 'TRAINER',
            subject: `Zusätzliche Informationen zu ${training.title}`,
            message: `Hallo ${trainer.firstName},\n\nwir möchten Ihnen noch einige wichtige Informationen zu "${training.title}" mitteilen:\n\n- Die Teilnehmer haben unterschiedliche Vorkenntnisse\n- Bitte bringen Sie Ihre eigenen Materialien mit\n- Der Raum ist mit Beamer und Whiteboard ausgestattet\n\nBei Fragen stehen wir gerne zur Verfügung.\n\nBeste Grüße\nSarah Müller\nPowerToWork`,
            isRead: false,
            messageType: 'TRAINING_REQUEST',
            createdAt: finalMessageDate1
          }
        });
        messageCount++;
      }
    } else if (request.status === 'DECLINED') {
      // For declined requests: create decline notification or message
      const shouldHaveNotification = Math.random() > 0.3; // 70% chance
      
      // Messages should be in the past (before today), spread across last 20 days
      const baseDaysBefore = 5 + (request.id % 15); // 5-19 days ago
      const baseDate = new Date(today);
      baseDate.setDate(baseDate.getDate() - baseDaysBefore);
      baseDate.setHours(16, 0, 0, 0);
      
      const messageDate = new Date(baseDate.getTime() + (request.id * 4 * 60 * 60 * 1000)); // Message date based on request ID
      
      // Ensure all dates are before maxMessageDate (yesterday)
      const finalMessageDate = messageDate > maxMessageDate ? new Date(maxMessageDate.getTime()) : messageDate;
      
      if (shouldHaveNotification) {
        // Create decline notification (as if auto-created when another trainer was accepted)
        await prisma.message.create({
          data: {
            trainingRequestId: request.id,
            senderId: powerToWork.id,
            senderType: 'TRAINING_COMPANY',
            recipientId: trainer.id,
            recipientType: 'TRAINER',
            subject: `Anfrage abgelehnt: ${training.title}`,
            message: `Ihre Anfrage für das Training "${training.title}" wurde abgelehnt, da ein anderer Trainer die Anfrage bereits angenommen hat.`,
            isRead: false,
            messageType: 'NOTIFICATION',
            createdAt: finalMessageDate
          }
        });
        messageCount++;
      } else {
        // Trainer declined themselves
        await prisma.message.create({
          data: {
            trainingRequestId: request.id,
            senderId: trainer.id,
            senderType: 'TRAINER',
            recipientId: powerToWork.id,
            recipientType: 'TRAINING_COMPANY',
            subject: `Absage für ${training.title}`,
            message: `Hallo PowerToWork Team,\n\nleider muss ich mich für "${training.title}" absagen, da ich zu diesem Zeitpunkt nicht verfügbar bin.\n\nIch hoffe, wir können in Zukunft zusammenarbeiten.\n\nViele Grüße\n${trainer.firstName} ${trainer.lastName}`,
            isRead: true,
            messageType: 'TRAINING_REQUEST',
            createdAt: finalMessageDate
          }
        });
        messageCount++;
      }
    }
  }

  console.log(`  ✓ Created ${messageCount} messages for training requests`);

  // Create Invoice for completed trainings (accepted requests that are COMPLETED)
  console.log('\n💰 Creating invoices...');

  let invoiceCount = 0;
  // Get all accepted requests for completed trainings (2 per trainer = 10 total)
  // The first 2 trainings per trainer are COMPLETED, and the last 2 requests per trainer are ACCEPTED
  for (const trainerInfo of trainerInfos) {
    if (!trainerInfo.trainer) continue;
    
    const trainerTrainings = getTrainingsForTrainer(trainerInfo.name);
    if (trainerTrainings.length < 6) continue;
    
    // Get the first 2 trainings (which are COMPLETED) and find their ACCEPTED requests
    const completedTrainings = trainerTrainings.slice(0, 2);
    
    for (let i = 0; i < completedTrainings.length; i++) {
      const training = completedTrainings[i];
      if (training.status !== 'COMPLETED') continue;
      
      // Find the ACCEPTED request for this training
      const acceptedRequest = allRequests.find(r => 
        r.trainingId === training.id && 
        r.trainerId === trainerInfo.trainer.id && 
        r.status === 'ACCEPTED'
      );
      
      if (!acceptedRequest) continue;
      
      await prisma.invoice.create({
        data: {
          trainerId: acceptedRequest.trainerId,
          trainingId: training.id,
          amount: training.dailyRate,
          invoiceNumber: `INV-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(invoiceCount + 1).padStart(3, '0')}`,
          invoiceDate: new Date(training.startDate.getTime() + 24 * 60 * 60 * 1000), // Day after training
          status: 'SUBMITTED',
          createdAt: new Date(training.startDate.getTime() + 24 * 60 * 60 * 1000)
        }
      });
      invoiceCount++;
    }
  }

  console.log(`  ✓ Created ${invoiceCount} invoices for completed trainings (2 per trainer)`);

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
  console.log(`  - ${courses.length} Courses (templates for recurring trainings)`);
  console.log(`  - ${allTrainings.length} Trainings (concrete course instances):`);
  console.log(`    • 2 COMPLETED per trainer in the past (30-60 days ago, with invoices)`);
  console.log(`    • 4 PUBLISHED per trainer in the future (7-30 days from now)`);
  console.log(`  - Participants created for all trainings`);
  console.log(`  - ${allRequests.length} Training Requests (6 per trainer):`);
  console.log(`    • Each trainer: 2 PENDING (future trainings), 2 DECLINED, 2 ACCEPTED (completed trainings)`);
  console.log(`  - ${messageCount} Messages (conversations and notifications for training requests)`);
  console.log(`  - ${invoiceCount} Invoices (for accepted trainings)`);
  console.log(`  - 5 Availability slots for Lorenz (Mon-Fri, 9-17)`);
  console.log('\n🎯 Demo Login Credentials:');
  console.log(`  Email: surkemper@powertowork.com`);
  console.log(`  (Works for both Company and Trainer login)`);
  console.log('\n📋 Test Scenarios:');
  console.log(`  ✓ View training requests (6 per trainer with proper distribution)`);
  console.log(`  ✓ Accept/Reject trainer requests (auto-decline others)`);
  console.log(`  ✓ See notifications when requests are accepted/declined`);
  console.log(`  ✓ Check trainer privacy (only see own assigned trainings)`);
  console.log(`  ✓ See accepted trainings with invoices`);
  console.log(`  ✓ View participants`);
  console.log('\n🎉 Database is ready for comprehensive demo!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

