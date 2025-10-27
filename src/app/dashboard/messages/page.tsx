"use client";

import { useState, useEffect } from "react";
import { getTrainerData, getCompanyData } from "@/lib/session";
import MessagesInterface, { MessageItem } from "@/components/shared/MessagesInterface";

export default function MessagesPage() {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const trainerData = getTrainerData();
  const companyData = getCompanyData();
  const userData = trainerData || companyData;

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      if (!userData) {
        setError("Benutzerdaten nicht gefunden");
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/inquiry-messages?userId=${userData.id}&userType=${userData.userType}`);
      if (response.ok) {
        const messagesData = await response.json();
        setMessages(messagesData);
      } else {
        setError("Fehler beim Laden der Nachrichten");
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError("Fehler beim Laden der Nachrichten");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: number) => {
    try {
      const response = await fetch(`/api/inquiry-messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isRead: true }),
      });

      if (response.ok) {
        setMessages(prev =>
          prev.map(msg => msg.id === messageId ? { ...msg, isRead: true } : msg)
        );
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const handleReply = async (message: MessageItem) => {
    // Navigate to chat with this training request
    window.location.href = `/dashboard/chat?trainingId=${message.trainingRequestId}`;
  };

  return (
    <MessagesInterface
      messages={messages}
      onMarkAsRead={markAsRead}
      onReply={handleReply}
      loading={loading}
      error={error}
    />
  );
}