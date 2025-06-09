"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to register page immediately
    router.push("/register");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Trainerportal</h1>
        <p className="text-gray-600">Weiterleitung zur Anmeldung...</p>
      </div>
    </div>
  );
}
