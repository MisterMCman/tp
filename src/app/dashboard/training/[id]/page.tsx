"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getUserData } from "@/lib/session";
import TrainingDetails, { TrainingData } from "@/components/shared/TrainingDetails";

interface User {
  userType: 'TRAINER' | 'TRAINING_COMPANY';
  id: number;
}

export default function TrainingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [training, setTraining] = useState<TrainingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const trainingId = params.id as string;
  const from = searchParams.get('from'); // Get the referrer URL

  useEffect(() => {
    const currentUser = getUserData();
    setUser(currentUser as User | null);

    const fetchTrainingDetails = async () => {
      try {
        if (!trainingId) {
          setError("Training ID nicht gefunden");
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/trainings/${trainingId}`);
        if (!response.ok) {
          throw new Error("Training konnte nicht geladen werden");
        }

        const trainingData = await response.json();
        setTraining(trainingData);
      } catch (err) {
        console.error("Error fetching training details:", err);
        setError("Fehler beim Laden der Training-Details");
      } finally {
        setLoading(false);
      }
    };

    fetchTrainingDetails();
  }, [trainingId]);

  const handleInquiry = () => {
    // Navigate to chat with this training
    router.push(`/dashboard/chat?trainingId=${trainingId}`);
  };

  if (!training) {
    return null;
  }

  return (
    <TrainingDetails
      training={training}
      userType={user?.userType || 'TRAINER'}
      onInquiry={handleInquiry}
      loading={loading}
      error={error}
      backHref={from || undefined} // Pass the referrer URL if available
    />
  );
}