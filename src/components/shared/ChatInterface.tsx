"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrainingRequestMessage, FileAttachment } from "@/lib/types";

export type Conversation = {
  trainingRequestId: number;
  trainingTitle: string;
  companyName: string;
  trainerName?: string;
  trainingStartDate?: string;
  trainingEndDate?: string;
  lastMessage: TrainingRequestMessage;
  unreadCount: number;
  messages: TrainingRequestMessage[];
};

interface ChatInterfaceProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  onSendMessage: (message: string, trainingRequestId: number) => Promise<void>;
  userType: 'TRAINER' | 'TRAINING_COMPANY';
  userId: number;
  loading?: boolean;
  error?: string | null;
}

export default function ChatInterface({
  conversations,
  selectedConversation,
  onSelectConversation,
  onSendMessage,
  userType,
  userId,
  loading = false,
  error = null
}: ChatInterfaceProps) {
  const pathname = usePathname();
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (force = false) => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    // Check if user is near bottom (within 100px) or force scroll
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    if (force || isNearBottom) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: force ? 'smooth' : 'auto'
      });
    }
  };

  useEffect(() => {
    // Scroll when conversation changes (force scroll)
    scrollToBottom(true);
  }, [selectedConversation?.trainingRequestId]);

  useEffect(() => {
    // Scroll when messages change (respect user scroll position)
    scrollToBottom(false);
  }, [selectedConversation?.messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;

    setSendingMessage(true);
    try {
      await onSendMessage(newMessage, selectedConversation.trainingRequestId);
      setNewMessage("");
      // Scroll immediately after sending (user expects to see their message)
      setTimeout(() => scrollToBottom(true), 100);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (error) {
    return <div className="text-center py-8 text-red-500">Fehler: {error}</div>;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Conversations List */}
      <div className="w-1/3 bg-white border-r border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg flex-shrink-0">
          <h1 className="text-xl font-bold tracking-tight">
            {userType === 'TRAINER' ? 'Nachrichten' : 'Unterhaltungen'}
          </h1>
          <p className="text-blue-100 text-sm mt-1 opacity-90">
            {conversations.length} Unterhaltung{conversations.length !== 1 ? 'en' : ''}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-slate-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <div className="text-6xl mb-4">💬</div>
              <p className="font-medium text-slate-700 mb-2">Keine Nachrichten vorhanden</p>
              <p className="text-sm text-slate-500">Ihre Unterhaltungen werden hier angezeigt</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.trainingRequestId}
                className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-all duration-200 ${
                  selectedConversation?.trainingRequestId === conversation.trainingRequestId
                    ? 'bg-blue-50 border-l-4 border-l-blue-500 shadow-sm'
                    : 'hover:shadow-sm'
                }`}
                onClick={() => onSelectConversation(conversation)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-slate-800 truncate flex-1 leading-tight">
                    {conversation.trainingTitle}
                  </h3>
                  {conversation.unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full ml-2 font-medium shadow-sm">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center mb-2 gap-2">
                  <p className="text-sm text-slate-600 truncate font-medium flex-1">
                    {userType === 'TRAINER'
                      ? conversation.companyName
                      : conversation.trainerName || 'Trainer'
                    }
                  </p>
                  <span className="text-xs text-slate-400 whitespace-nowrap font-medium flex-shrink-0">
                    {format(new Date(conversation.lastMessage.createdAt), "dd.MM.yyyy", { locale: de })} - {format(new Date(conversation.lastMessage.createdAt), "HH:mm", { locale: de })}
                  </span>
                </div>

                <p className="text-sm text-slate-500 truncate leading-relaxed">
                  {conversation.lastMessage.message}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedConversation ? (
          <>
            {/* Chat Header - Sticky */}
            <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex items-center sticky top-0 z-10 flex-shrink-0">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <Link
                      href={userType === 'TRAINER' ? '/dashboard/trainings' : '/dashboard/requests'}
                      className="inline-flex items-center space-x-2 hover:bg-slate-100 px-3 py-2 rounded-lg transition-colors text-slate-600 hover:text-slate-800"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      <span className="text-sm font-medium">Zurück</span>
                    </Link>
                  </div>
                  <div className="flex-1 text-center">
                    <Link
                      href={`/dashboard/training/${selectedConversation.trainingRequestId}?from=${encodeURIComponent(pathname)}`}
                      className="block hover:bg-slate-100 px-4 py-3 rounded-lg transition-colors group"
                    >
                      <h2 className="font-bold text-slate-800 group-hover:text-slate-900 leading-tight">
                        {selectedConversation.trainingTitle}
                      </h2>
                      {selectedConversation.trainingStartDate && selectedConversation.trainingEndDate && (
                        <p className="text-xs text-slate-500 mt-1">
                          {format(new Date(selectedConversation.trainingStartDate), "dd.MM.yyyy", { locale: de })}
                          {selectedConversation.trainingStartDate !== selectedConversation.trainingEndDate && (
                            <> - {format(new Date(selectedConversation.trainingEndDate), "dd.MM.yyyy", { locale: de })}</>
                          )}
                        </p>
                      )}
                      <p className="text-sm text-slate-600 mt-1">
                        {userType === 'TRAINER'
                          ? selectedConversation.companyName
                          : selectedConversation.trainerName || 'Trainer'
                        }
                      </p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center justify-center space-x-1">
                        <span>Klicken für Details</span>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </p>
                    </Link>
                  </div>
                  <div className="flex-shrink-0 w-20"></div>
                </div>
              </div>
            </div>

            {/* Messages - Scrollable */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-slate-50 to-white min-h-0">
              {selectedConversation.messages
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                .map((message) => {
                  const isFromUser = message.senderId === userId && message.senderType === userType;
                  const senderName = isFromUser
                    ? "Sie"
                    : userType === 'TRAINER'
                      ? message.trainingRequest?.training.company.companyName
                      : message.trainingRequest?.trainer.firstName + " " + message.trainingRequest?.trainer.lastName;

                  return (
                    <div key={message.id} className={`flex mb-4 ${isFromUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${
                        isFromUser
                          ? 'bg-white text-slate-800 border border-slate-200 shadow-sm'
                          : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg'
                      } rounded-2xl px-4 py-3 relative`}>
                        {!isFromUser && (
                          <p className="text-xs font-semibold mb-2 !text-white" style={{ color: '#ffffff' }}>{senderName}</p>
                        )}

                        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isFromUser ? 'text-slate-800' : '!text-white'}`} style={!isFromUser ? { color: '#ffffff' } : undefined}>
                          {message.message}
                        </p>

                        {/* File Attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {message.attachments.map((attachment: FileAttachment) => (
                              <div key={attachment.id} className={`flex items-center space-x-3 p-3 rounded-lg ${
                                isFromUser ? 'bg-slate-50 border border-slate-200' : 'bg-blue-600/50'
                              }`}>
                                <span className={`text-xl flex-shrink-0 ${isFromUser ? 'text-slate-600' : 'text-white'}`}>
                                  {getFileIcon(attachment.mimeType)}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <a
                                    href={`/api/files/${attachment.storedFilename}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`text-sm font-medium truncate block hover:underline ${
                                      isFromUser ? 'text-blue-600' : 'text-white'
                                    }`}
                                  >
                                    {attachment.filename}
                                  </a>
                                  <p className={`text-xs mt-1 ${
                                    isFromUser ? 'text-slate-500' : 'text-blue-100'
                                  }`}>
                                    {formatFileSize(attachment.fileSize)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <p className={`text-xs mt-2 font-medium ${
                          isFromUser ? 'text-slate-500' : 'text-blue-100'
                        }`}>
                          {format(new Date(message.createdAt), "dd.MM.yyyy", { locale: de })} - {format(new Date(message.createdAt), "HH:mm", { locale: de })}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Message Input - Fixed at bottom */}
            <div className="bg-white p-6 border-t border-slate-200 shadow-lg flex-shrink-0">
              <div className="flex items-end space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <textarea
                      value={newMessage}
                      onChange={handleTextareaChange}
                      onKeyPress={handleKeyPress}
                      placeholder="Schreiben Sie Ihre Nachricht..."
                      className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none shadow-sm transition-all duration-200"
                      rows={1}
                      style={{ minHeight: '48px', maxHeight: '120px' }}
                      disabled={sendingMessage}
                    />
                    {newMessage.length > 0 && (
                      <div className="absolute bottom-2 right-3 text-xs text-slate-400 font-medium">
                        {newMessage.length}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1 rounded-full">
                      💡 Enter zum Senden • Shift+Enter für neue Zeile
                    </div>
                    <div className="text-xs text-slate-400">
                      {newMessage.length > 0 && `${newMessage.length} Zeichen`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed flex items-center space-x-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {sendingMessage ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="font-medium">Wird gesendet...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      <span className="font-medium">Senden</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
            <div className="text-center max-w-md mx-auto px-6">
              <div className="text-8xl mb-6">💬</div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">
                Wählen Sie eine Unterhaltung aus
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Klicken Sie auf eine Unterhaltung links, um die Nachrichten anzuzeigen und zu beginnen
              </p>
              <div className="mt-6 p-4 bg-white rounded-xl shadow-sm border border-slate-200">
                <p className="text-sm text-slate-500">
                  💡 <strong>Tipp:</strong> Verwenden Sie die Suchfunktion, um schnell bestimmte Unterhaltungen zu finden
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
