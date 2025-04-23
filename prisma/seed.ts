import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const topics = [
    'Figma',
    'Photoshop',
    'Excel',
    'PowerPoint',
    'WordPress',
    'HTML & CSS',
    'JavaScript',
    'React.js',
    'Node.js',
    'Python',
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

  for (const topic of topics) {
    await prisma.topic.create({
      data: { name: topic },
    });
  }

  console.log('Seed data inserted');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
