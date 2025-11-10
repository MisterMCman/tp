"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getUserData } from "@/lib/session";
import TrainingDetails, { TrainingData } from "@/components/shared/TrainingDetails";
import { buildBackUrl } from "@/lib/navigation";
import { initializeNavigation } from "@/lib/navigationStack";

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
  const pathname = `/dashboard/training/${trainingId}`;

  // Initialize navigation tracking for this page
  useEffect(() => {
    const queryParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });
    initializeNavigation(pathname, queryParams);
  }, [pathname, searchParams]);

  // Construct back URL using navigation stack
  const getBackUrl = () => {
    // buildBackUrl() already returns '/dashboard' if stack is empty
    return buildBackUrl();
  };

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
      backHref={getBackUrl()} // Pass the constructed back URL
    />
  );
}