"use client";

import { useState, useEffect } from "react";
import { getTrainerData, getCompanyData } from "@/lib/session";
import { InquiryMessage } from "@/lib/types";
import ChatInterface, { Conversation } from "@/components/shared/ChatInterface";

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const trainerData = getTrainerData();
  const companyData = getCompanyData();

  const userData = trainerData || companyData;
  const userId = userData?.id;
  const userType = userData?.userType;

  const fetchMessages = async () => {
    if (!userId || !userType) {
      setError("Benutzerdaten nicht gefunden. Bitte melden Sie sich an.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/inquiry-messages?userId=${userId}&userType=${userType}`);
      if (!response.ok) {
        throw new Error("Fehler beim Laden der Nachrichten");
      }

      const messages: InquiryMessage[] = await response.json();

      // Group messages by training request
      const conversationMap = new Map<number, Conversation>();

      messages.forEach((message) => {
        const trainingRequestId = message.trainingRequestId;
        const trainingTitle = message.trainingRequest?.training?.title || "Unbekanntes Training";
        const companyName = userType === 'TRAINER'
          ? message.trainingRequest?.training?.company?.companyName || "Unbekannte Firma"
          : message.trainingRequest?.trainer?.firstName + " " + message.trainingRequest?.trainer?.lastName || "Unbekannter Trainer";
        const trainerName = userType === 'TRAINING_COMPANY'
          ? message.trainingRequest?.trainer?.firstName + " " + message.trainingRequest?.trainer?.lastName || "Unbekannter Trainer"
          : undefined;

        if (!conversationMap.has(trainingRequestId)) {
          conversationMap.set(trainingRequestId, {
            trainingRequestId,
            trainingTitle,
            companyName,
            trainerName,
            lastMessage: message,
            unreadCount: 0,
            messages: []
          });
        }

        const conversation = conversationMap.get(trainingRequestId)!;
        conversation.messages.push(message);

        // Update last message if this is newer
        if (new Date(message.createdAt) > new Date(conversation.lastMessage.createdAt)) {
          conversation.lastMessage = message;
        }

        // Count unread messages (messages not from current user)
        if (message.senderId !== userId && !message.isRead) {
          conversation.unreadCount++;
        }
      });

      const conversationsArray = Array.from(conversationMap.values());
      setConversations(conversationsArray);

      // Auto-select first conversation if none selected
      if (!selectedConversation && conversationsArray.length > 0) {
        setSelectedConversation(conversationsArray[0]);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      setError("Fehler beim Laden der Nachrichten");
    } finally {
      setLoading(false);
    }
  };

  const markConversationAsRead = async (conversation: Conversation) => {
    try {
      const unreadMessages = conversation.messages.filter(
        msg => msg.senderId !== userId && !msg.isRead
      );

      for (const message of unreadMessages) {
        await fetch(`/api/inquiry-messages/${message.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isRead: true }),
        });
      }

      // Update local state
      setConversations(prev =>
        prev.map(conv =>
          conv.trainingRequestId === conversation.trainingRequestId
            ? { ...conv, unreadCount: 0, messages: conv.messages.map(msg => ({ ...msg, isRead: true })) }
            : conv
        )
      );
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const sendMessage = async (message: string, trainingRequestId: number) => {
    const formData = new FormData();
    formData.append('trainingRequestId', trainingRequestId.toString());
    formData.append('subject', `Re: ${selectedConversation?.trainingTitle || 'Training'}`);
    formData.append('message', message);

    const response = await fetch('/api/inquiry-messages', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Fehler beim Senden der Nachricht");
    }

    const sentMessage = await response.json();

    // Update conversations with new message
    setConversations(prev =>
      prev.map(conv =>
        conv.trainingRequestId === trainingRequestId
          ? {
              ...conv,
              lastMessage: sentMessage,
              messages: [...conv.messages, sentMessage]
            }
          : conv
      )
    );

    return sentMessage;
  };

  useEffect(() => {
    fetchMessages();
  }, [userId, userType]);

  useEffect(() => {
    if (selectedConversation) {
      markConversationAsRead(selectedConversation);
    }
  }, [selectedConversation]);

  return (
    <ChatInterface
      conversations={conversations}
      selectedConversation={selectedConversation}
      onSelectConversation={setSelectedConversation}
      onSendMessage={sendMessage}
      userType={userType as 'TRAINER' | 'TRAINING_COMPANY'}
      userId={userId || 0}
      loading={loading}
      error={error}
    />
  );
}