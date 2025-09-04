import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Keep the mock data as fallback
const mockTopics = [
  { id: 1, name: "Python" },
  { id: 2, name: "JavaScript" },
  { id: 3, name: "React" },
  { id: 4, name: "Node.js" },
  { id: 5, name: "Machine Learning" },
  { id: 6, name: "Datenanalyse" },
  { id: 7, name: "Web Development" },
  { id: 8, name: "Marketing" },
  { id: 9, name: "Project Management" },
  { id: 10, name: "Projektmanagement" },
  { id: 11, name: "Digital Marketing" },
  { id: 12, name: "Social Media" },
  { id: 13, name: "SEO" },
  { id: 14, name: "Graphic Design" },
  { id: 15, name: "UI/UX Design" },
  { id: 16, name: "Business Analysis" },
  { id: 17, name: "Data Science" },
  { id: 18, name: "Artificial Intelligence" },
  { id: 19, name: "Leadership" },
  { id: 20, name: "Coaching" }
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || "";

  if (!query || query.trim() === '') {
    // Return all topics if no query is provided
    try {
      const topics = await prisma.topic.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: 'asc'
        }
      });
      console.log(`API returning all topics from database:`, topics.length);
      return NextResponse.json(topics);
    } catch (dbError) {
      console.warn("Database error, falling back to mock data:", dbError);
      return NextResponse.json(mockTopics);
    }
  }

  try {
    console.log(`API received query: "${query}"`); // Log incoming query

    try {
      // Try to use the real database first
      const topics = await prisma.topic.findMany({
        where: {
          name: {
            contains: query.toLowerCase(),
          },
        },
        select: {
          id: true,
          name: true,
        },
        take: 10, // Limit results
      });
      
      console.log(`API returning topics from database:`, topics);
      return NextResponse.json(topics);
    } catch (dbError) {
      console.warn("Database error, falling back to mock data:", dbError);
      
      // Fallback to mock data if database connection fails
      const filteredTopics = mockTopics.filter(topic => 
        topic.name.toLowerCase().includes(query.toLowerCase())
      );
      
      console.log(`API returning topics from mock:`, filteredTopics);
      return NextResponse.json(filteredTopics);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error in /api/topics:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "An unknown error occurred" }, { status: 500 });
  }
}
