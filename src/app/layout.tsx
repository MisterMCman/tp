import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <title>Trainer Portal</title>
        <meta name="description" content="Trainer management platform" />
      </head>
      <body className="bg-primary-50">
        {children}
      </body>
    </html>
  );
}
