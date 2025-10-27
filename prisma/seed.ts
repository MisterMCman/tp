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
    
    // Skip empty lines if not in a multiline field
    if (!inMultilineField && line.trim() === '') continue;
    
    // Check if we're entering or leaving a multiline field
    const quoteCount = (line.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      inMultilineField = !inMultilineField;
    }
    
    currentLine += line + (inMultilineField ? '\n' : '');
    
    // Process the line if we're not in a multiline field
    if (!inMultilineField && currentLine.trim() !== '') {
      const values = currentLine.split(';');
      
      // Only process if we have enough fields
      if (values.length >= 3) {
        const topic: any = {};
        
        headers.forEach((header, index) => {
          let value = values[index]?.trim() || null;
          // Remove surrounding quotes if present
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
  console.log('🚀 Starting database seed...\n');

  // Clear existing data in correct order
  console.log('🗑️  Clearing existing data...');
  await prisma.inquiryMessage.deleteMany();
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

  // Create countries
  console.log('🌍 Creating countries...');
  const priorityCountries = [
    { name: 'Deutschland', code: 'DE', phoneCode: '+49' },
    { name: 'Österreich', code: 'AT', phoneCode: '+43' },
    { name: 'Schweiz', code: 'CH', phoneCode: '+41' }
  ];

  const otherCountries = [
    { name: 'Belgien', code: 'BE', phoneCode: '+32' },
    { name: 'Dänemark', code: 'DK', phoneCode: '+45' },
    { name: 'Finnland', code: 'FI', phoneCode: '+358' },
    { name: 'Frankreich', code: 'FR', phoneCode: '+33' },
    { name: 'Italien', code: 'IT', phoneCode: '+39' },
    { name: 'Niederlande', code: 'NL', phoneCode: '+31' },
    { name: 'Norwegen', code: 'NO', phoneCode: '+47' },
    { name: 'Polen', code: 'PL', phoneCode: '+48' },
    { name: 'Schweden', code: 'SE', phoneCode: '+46' },
    { name: 'Spanien', code: 'ES', phoneCode: '+34' },
    { name: 'Vereinigtes Königreich', code: 'GB', phoneCode: '+44' },
  ];

  const countries = [...priorityCountries, ...otherCountries];
  const createdCountries = await prisma.country.createMany({
    data: countries,
  });

  const germany = await prisma.country.findFirst({ where: { code: 'DE' } });

  // Load and create topics from CSV
  console.log('📚 Loading topics from CSV...');
  const csvPath = '/Users/surkemper/Downloads/topicss/topics.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const topicsData = parseCSV(csvContent);

  console.log(`Found ${topicsData.length} topics in CSV`);

  const createdTopics = [];
  for (const topicData of topicsData) {
    // Skip if state is offline or deleted
    if (topicData.state === 'offline' || topicData.deleted_at) continue;
    
    // Skip if no slug
    if (!topicData.slug) {
      console.log(`  ⚠️  Skipping topic without slug:`, topicData);
      continue;
    }

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
    } catch (error) {
      console.log(`  ⚠️  Error creating topic ${topicData.slug}:`, error.message);
    }
  }

  console.log(`✅ Created ${createdTopics.length} topics`);

  // Create 10 diverse trainers
  console.log('\n👥 Creating 10 diverse trainers...');

  const trainers = [
    {
      firstName: 'Lorenz',
      lastName: 'Surkemper',
      email: 'l.surkemper@googlemail.com',
      phone: '017670910870',
      street: 'Hermannstraße',
      houseNumber: '3',
      zipCode: '33602',
      city: 'Bielefeld',
      bio: 'Full-Stack Entwickler und Trainer mit über 10 Jahren Erfahrung in Web-Technologien, Python und modernen JavaScript-Frameworks.',
      dailyRate: 850.00,
      iban: 'DE89 3704 0044 0532 0130 00',
      taxId: 'DE123456789',
      topics: ['python', 'javascript', 'react', 'node-js', 'typescript', 'html', 'css']
    },
    {
      firstName: 'Anna',
      lastName: 'Schmidt',
      email: 'anna.schmidt@example.com',
      phone: '+49 30 12345678',
      street: 'Friedrichstraße',
      houseNumber: '45',
      zipCode: '10117',
      city: 'Berlin',
      bio: 'Adobe Creative Suite Expertin mit Schwerpunkt auf Photoshop, Illustrator und InDesign. 8 Jahre Erfahrung in Design-Schulungen.',
      dailyRate: 750.00,
      topics: ['adobe-photoshop', 'adobe-illustrator', 'adobe-indesign', 'figma', 'adobe-xd', 'canva']
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
      bio: 'Projektmanagement-Experte mit Scrum Master und PMP Zertifizierung. Fokus auf agile Transformation und Team-Coaching.',
      dailyRate: 950.00,
      topics: ['agiles-projektmanagement', 'scrum', 'kanban', 'microsoft-project', 'atlassian-jira']
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
      bio: 'Microsoft Office Spezialistin mit Fokus auf Excel, Power BI und Datenanalyse. Über 500 Schulungen durchgeführt.',
      dailyRate: 650.00,
      topics: ['microsoft-excel', 'microsoft-power-bi', 'microsoft-powerpoint', 'microsoft-word', 'microsoft-365']
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
      bio: 'Cloud-Architekt mit Expertise in AWS, Azure und DevOps. Certified Solutions Architect und Kubernetes Administrator.',
      dailyRate: 1100.00,
      topics: ['aws', 'microsoft-azure', 'docker', 'kubernetes', 'linux']
    },
    {
      firstName: 'Julia',
      lastName: 'Hoffmann',
      email: 'julia.hoffmann@example.com',
      phone: '+49 711 44455566',
      street: 'Königstraße',
      houseNumber: '28',
      zipCode: '70173',
      city: 'Stuttgart',
      bio: 'UX/UI Design Trainerin mit Background in Psychologie. Spezialisiert auf nutzerzentrisches Design und Design Thinking.',
      dailyRate: 800.00,
      topics: ['figma', 'adobe-xd', 'user-experience-design', 'design-thinking', 'web-usability']
    },
    {
      firstName: 'David',
      lastName: 'Becker',
      email: 'david.becker@example.com',
      phone: '+49 69 33344455',
      street: 'Zeil',
      houseNumber: '112',
      zipCode: '60313',
      city: 'Frankfurt',
      bio: 'Java Enterprise Entwickler und Architekt. Spring Framework Expert mit 12 Jahren Erfahrung in Enterprise-Anwendungen.',
      dailyRate: 1050.00,
      topics: ['java', 'spring', 'java-enterprise-edition', 'sql', 'postgresql']
    },
    {
      firstName: 'Lisa',
      lastName: 'Schneider',
      email: 'lisa.schneider@example.com',
      phone: '+49 351 22233344',
      street: 'Prager Straße',
      houseNumber: '15',
      zipCode: '01069',
      city: 'Dresden',
      bio: 'Digital Marketing Expertin mit Fokus auf SEO, Google Ads und Social Media Marketing. Google Certified Professional.',
      dailyRate: 700.00,
      topics: ['google-ads', 'google-analytics', 'Suchmaschinenoptimierung (SEO)', 'facebook', 'instagram', 'onlinemarketing']
    },
    {
      firstName: 'Marc',
      lastName: 'Wagner',
      email: 'marc.wagner@example.com',
      phone: '+49 511 66677788',
      street: 'Bahnhofstraße',
      houseNumber: '5',
      zipCode: '30159',
      city: 'Hannover',
      bio: 'Data Science und Machine Learning Trainer. Python Expert mit Fokus auf KI-Anwendungen und Deep Learning.',
      dailyRate: 1200.00,
      topics: ['python', 'machine-learning', 'kuenstliche-intelligenz', 'tensorflow', 'keras']
    },
    {
      firstName: 'Sophie',
      lastName: 'Richter',
      email: 'sophie.richter@example.com',
      phone: '+49 371 88899900',
      street: 'Straße der Nationen',
      houseNumber: '62',
      zipCode: '09111',
      city: 'Chemnitz',
      bio: 'WordPress und Web-Development Trainerin. Fullstack-Entwicklerin mit Passion für moderne CMS-Systeme.',
      dailyRate: 680.00,
      topics: ['wordpress', 'php', 'mysql', 'html', 'css', 'javascript']
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
        street: trainerData.street,
        houseNumber: trainerData.houseNumber,
        zipCode: trainerData.zipCode,
        city: trainerData.city,
        bio: trainerData.bio,
        dailyRate: trainerData.dailyRate,
        iban: trainerData.iban,
        taxId: trainerData.taxId,
        countryId: germany?.id,
        status: 'ACTIVE'
      }
    });

    // Assign topics to trainer
    for (const topicSlug of trainerData.topics) {
      const topic = createdTopics.find(t => t.slug === topicSlug);
      if (topic) {
        await prisma.trainerTopic.create({
          data: {
            trainerId: trainer.id,
            topicId: topic.id
          }
        });
      }
    }

    createdTrainers.push(trainer);
    console.log(`  ✓ ${trainer.firstName} ${trainer.lastName} - ${trainerData.topics.length} topics`);
  }

  // Create training companies
  console.log('\n🏢 Creating training companies...');

  const company1 = await prisma.trainingCompany.create({
    data: {
      companyName: 'PowerToWork GmbH',
      firstName: 'Sarah',
      lastName: 'Müller',
      contactName: 'Sarah Müller',
      email: 'sarah.mueller@powertowork.de',
      phone: '+49 30 12345678',
      street: 'Friedrichstraße',
      houseNumber: '123',
      zipCode: '10117',
      city: 'Berlin',
      domain: 'powertowork.de',
      bio: 'PowerToWork ist ein führendes Unternehmen für Personalentwicklung und Schulungen in der DACH-Region.',
      website: 'https://www.powertowork.de',
      industry: 'consulting',
      employees: '51-200',
      status: 'ACTIVE',
      countryId: germany?.id,
      onboardingStatus: 'Aktiv'
    }
  });

  const company2 = await prisma.trainingCompany.create({
    data: {
      companyName: 'TechAcademy Solutions',
      firstName: 'Klaus',
      lastName: 'Weber',
      contactName: 'Dr. Klaus Weber',
      email: 'klaus.weber@techacademy.de',
      phone: '+49 89 98765432',
      street: 'Maximilianstraße',
      houseNumber: '45',
      zipCode: '80539',
      city: 'München',
      domain: 'techacademy.de',
      bio: 'TechAcademy Solutions ist spezialisiert auf IT-Schulungen und digitale Transformation.',
      website: 'https://www.techacademy.de',
      industry: 'it',
      employees: '11-50',
      status: 'ACTIVE',
      countryId: germany?.id,
      onboardingStatus: 'Aktiv'
    }
  });

  console.log(`  ✓ ${company1.companyName}`);
  console.log(`  ✓ ${company2.companyName}`);

  // Create sample trainings
  console.log('\n📅 Creating sample trainings...');

  const pythonTopic = createdTopics.find(t => t.slug === 'python');
  const reactTopic = createdTopics.find(t => t.slug === 'react');
  const excelTopic = createdTopics.find(t => t.slug === 'microsoft-excel');

  if (pythonTopic) {
    await prisma.training.create({
      data: {
        title: 'Python Grundlagen Workshop',
        topicId: pythonTopic.id,
        companyId: company2.id,
        startDate: new Date('2025-02-15'),
        endDate: new Date('2025-02-15'),
        startTime: '09:00',
        endTime: '16:00',
        location: 'Online (Zoom)',
        participants: 12,
        dailyRate: 850,
        description: 'Umfassender Python-Workshop für Anfänger.',
        status: 'PUBLISHED'
      }
    });
  }

  if (reactTopic) {
    await prisma.training.create({
      data: {
        title: 'React für Fortgeschrittene',
        topicId: reactTopic.id,
        companyId: company1.id,
        startDate: new Date('2025-03-10'),
        endDate: new Date('2025-03-11'),
        startTime: '09:00',
        endTime: '17:00',
        location: 'Berlin, Friedrichstraße 123',
        participants: 15,
        dailyRate: 900,
        description: 'Zweitägiger Workshop zu fortgeschrittenen React-Konzepten.',
        status: 'PUBLISHED'
      }
    });
  }

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`  - ${createdTopics.length} topics created from CSV`);
  console.log(`  - ${createdTrainers.length} trainers created with diverse expertise`);
  console.log(`  - 2 training companies created`);
  console.log(`  - ${countries.length} countries created`);
  console.log('\n🎉 Database is ready for use!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
