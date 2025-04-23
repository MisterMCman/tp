import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Auth-Optionen konfigurieren
export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "E-Mail", type: "text", placeholder: "E-Mail" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        // Überprüfen, ob credentials vorhanden ist
        if (!credentials) {
          return null; // Rückgabe null, falls keine Credentials vorhanden sind
        }

        const { email, password } = credentials;

        // Beispielhafte Überprüfung (Hier kannst du deine Datenbankabfrage hinzufügen)
        if (email === "admin@example.com" && password === "password123") {
          // Rückgabe eines User-Objekts, das den NextAuth.js-Typen entspricht
          return {
            id: "1", // id muss als string zurückgegeben werden, nicht als number
            name: "Admin",
            email: "admin@example.com",
          };
        }

        // Rückgabe null, falls keine Übereinstimmung gefunden wurde
        return null;
      },
    }),
  ],
  pages: {
    signIn: '/login',  // Optionale benutzerdefinierte Login-Seite
  },
  secret: process.env.NEXTAUTH_SECRET,  // Ein geheimes Token für die Verschlüsselung
};
