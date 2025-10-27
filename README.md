# Trainer Portal (TP)

A comprehensive platform for managing trainers, courses, events, and invoices. This application connects trainers with courses and manages the entire workflow from inquiry to payment.

## Project Overview

This application is a training management system built with:
- Next.js 14 for the frontend
- Prisma ORM for database interactions
- MySQL as the database
- NextAuth for authentication
- TypeScript for type safety
- Tailwind CSS for styling

## Features

- Trainer registration and profile management
- Course and event creation and management
- Inquiry system for connecting trainers with events
- Participant tracking
- Invoice generation and management
- Authentication and authorization

## Database Structure

The application uses a relational database with the following main entities:
- Trainers: Professionals who can teach different topics
- Topics: Subject areas that trainers specialize in
- Courses: Training programs offered
- Events: Specific instances of courses on particular dates
- Inquiries: Requests for trainers to lead specific events
- Participants: People attending events
- Invoices: Payment records for trainers

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- MySQL running locally or a remote MySQL database
- npm or yarn package manager

### Environment Setup

1. Clone this repository
2. Set up your .env file with the necessary environment variables:
   ```
   DATABASE_URL="mysql://username:password@localhost:3306/tp"
   ```

### Installation

```bash
# Install dependencies in the root directory
npm install

# Install dependencies in the Next.js application
cd tp
npm install

# Set up the database
npx prisma migrate dev
npx prisma db seed
```

### Running the Application

```bash
# Start the Next.js development server
cd tp
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Development

### Database Management

- Generate Prisma client: `npx prisma generate`
- Update database schema: `npx prisma migrate dev`
- Seed database with initial data: `npx prisma db seed`
- Explore your database with Prisma Studio: `npx prisma studio`
- start db: sudo /usr/local/opt/mariadb/bin/mariadbd --user=_mysql --basedir=/usr/local/opt/mariadb --datadir=/usr/local/var/mysql --socket=/usr/local/var/mysql/mysql.sock

### Project Structure

- `/prisma`: Database schema and migrations
- `/tp/src/app`: Next.js application routes and components
- `/tp/src/app/api`: API routes for data manipulation
- `/tp/src/lib`: Utility functions and shared code

## Deployment

This Next.js application can be deployed on Vercel or any other hosting platform that supports Next.js.

```bash
# Run application for development with live changes
npm run dev

# Build the application
npm run build

# Start the production server
npm start
```

## License

This project is proprietary and confidential.
