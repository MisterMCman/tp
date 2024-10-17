// src/app/layout.tsx
import './globals.css';

export const metadata = {
  title: 'Trainerverwaltung',
  description: 'Registrierung und Verwaltung von Trainern',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
  