"use client";

import { useState, useEffect } from "react";
import { getUserData } from "@/lib/session";
import { TrainingRequestMessage } from "@/lib/types";
import ChatInterface, { Conversation } from "@/components/shared/ChatInterface";

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userData = getUserData();
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
      const response = await fetch(`/api/training-request-messages?userId=${userId}&userType=${userType}`);
      if (!response.ok) {
        throw new Error("Fehler beim Laden der Nachrichten");
      }

      const messages: TrainingRequestMessage[] = await response.json();

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
        
        // Extract training dates
        const trainingStartDate = message.trainingRequest?.training?.startDate 
          ? (typeof message.trainingRequest.training.startDate === 'string' 
              ? message.trainingRequest.training.startDate 
              : message.trainingRequest.training.startDate.toISOString())
          : undefined;
        const trainingEndDate = message.trainingRequest?.training?.endDate
          ? (typeof message.trainingRequest.training.endDate === 'string'
              ? message.trainingRequest.training.endDate
              : message.trainingRequest.training.endDate.toISOString())
          : undefined;

        if (!conversationMap.has(trainingRequestId)) {
          conversationMap.set(trainingRequestId, {
            trainingRequestId,
            trainingTitle,
            companyName,
            trainerName,
            trainingStartDate,
            trainingEndDate,
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

      // Sort conversations by last message date (newest first)
      const conversationsArray = Array.from(conversationMap.values()).sort((a, b) => {
        const dateA = new Date(a.lastMessage.createdAt).getTime();
        const dateB = new Date(b.lastMessage.createdAt).getTime();
        return dateB - dateA; // Descending order (newest first)
      });
      setConversations(conversationsArray);

      // Auto-select first conversation if none selected and conversations exist
      if (!selectedConversation && conversationsArray.length > 0) {
        setSelectedConversation(conversationsArray[0]);
      }
      
      // If no conversations, ensure selectedConversation is null
      if (conversationsArray.length === 0) {
        setSelectedConversation(null);
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
        await fetch(`/api/training-request-messages`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ messageId: message.id, isRead: true }),
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
    if (!userData || !userId || !userType) {
      throw new Error("Benutzerdaten nicht gefunden. Bitte melden Sie sich an.");
    }

    const formData = new FormData();
    formData.append('trainingRequestId', trainingRequestId.toString());
    formData.append('subject', `Re: ${selectedConversation?.trainingTitle || 'Training'}`);
    formData.append('message', message);
    formData.append('senderId', userId.toString());
    formData.append('senderType', userType);

    const response = await fetch('/api/training-request-messages', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Fehler beim Senden der Nachricht");
    }

    const sentMessage = await response.json();

    // Ensure createdAt is a string if it's a Date object
    const sentMessageWithDate = {
      ...sentMessage,
      createdAt: sentMessage.createdAt instanceof Date 
        ? sentMessage.createdAt.toISOString() 
        : sentMessage.createdAt
    };

    // Update conversations with new message and re-sort by last message date
    setConversations(prev => {
      const updated = prev.map(conv =>
        conv.trainingRequestId === trainingRequestId
          ? {
              ...conv,
              lastMessage: sentMessageWithDate,
              messages: [...conv.messages, sentMessageWithDate]
            }
          : { ...conv } // Create new object reference for all conversations
      );
      // Re-sort by last message date (newest first) - create new array to ensure React detects the change
      const sorted = [...updated].sort((a, b) => {
        const dateA = new Date(a.lastMessage.createdAt).getTime();
        const dateB = new Date(b.lastMessage.createdAt).getTime();
        return dateB - dateA; // Descending order (newest first)
      });
      return sorted;
    });

    // Update selectedConversation if it's the one we just sent to
    if (selectedConversation?.trainingRequestId === trainingRequestId) {
      setSelectedConversation(prev => {
        if (!prev || prev.trainingRequestId !== trainingRequestId) return prev;
        return {
          ...prev,
          lastMessage: sentMessageWithDate,
          messages: [...prev.messages, sentMessageWithDate]
        };
      });
    }

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