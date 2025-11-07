"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect /dashboard/chat to /dashboard/messages for consistency
export default function ChatPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/messages');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-pulse">Weiterleitung...</div>
    </div>
  );
}
