"use client";

import { useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import Link from "next/link";

export interface MessageItem {
  id: number;
  trainingRequestId: number;
  senderId: number;
  senderType: 'TRAINER' | 'TRAINING_COMPANY';
  recipientId: number;
  recipientType: 'TRAINER' | 'TRAINING_COMPANY';
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  trainingRequest: {
    id: number;
    training: {
      title: string;
      startDate: string;
      location: string;
      company: {
        companyName: string;
      };
    };
    trainer: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

interface MessagesInterfaceProps {
  messages: MessageItem[];
  onMarkAsRead: (messageId: number) => Promise<void>;
  onReply: (message: MessageItem) => void;
  loading?: boolean;
  error?: string | null;
}

export default function MessagesInterface({
  messages,
  onMarkAsRead,
  onReply,
  loading = false,
  error = null
}: MessagesInterfaceProps) {
  const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const filteredMessages = messages.filter(message => {
    if (filter === 'unread') return !message.isRead;
    if (filter === 'read') return message.isRead;
    return true;
  });

  const handleMessageClick = async (message: MessageItem) => {
    setSelectedMessage(message);
    if (!message.isRead) {
      await onMarkAsRead(message.id);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (error) {
    return <div className="text-center py-8 text-red-500">Fehler: {error}</div>;
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-slate-800">Nachrichten</h1>
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Alle ({messages.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filter === 'unread'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Ungelesen ({messages.filter(m => !m.isRead).length})
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filter === 'read'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Gelesen ({messages.filter(m => m.isRead).length})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-24 bg-slate-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📬</div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">
                {filter === 'unread' ? 'Keine ungelesenen Nachrichten' :
                 filter === 'read' ? 'Keine gelesenen Nachrichten' :
                 'Keine Nachrichten vorhanden'}
              </h3>
              <p className="text-slate-500">
                {filter === 'unread' ? 'Alle Nachrichten wurden gelesen.' :
                 filter === 'read' ? 'Es gibt keine gelesenen Nachrichten.' :
                 'Ihre Nachrichten werden hier angezeigt.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className={`bg-white border rounded-lg shadow-sm overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                    !message.isRead ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200'
                  }`}
                  onClick={() => handleMessageClick(message)}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-slate-800">{message.subject}</h3>
                          {!message.isRead && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Neu
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-1">
                          Von: {message.trainingRequest.trainer.firstName} {message.trainingRequest.trainer.lastName}
                          ({message.trainingRequest.trainer.email})
                        </p>
                        <p className="text-sm text-slate-500">
                          Training: {message.trainingRequest.training.title} • {message.trainingRequest.training.location}
                        </p>
                      </div>
                      <span className="text-sm text-slate-500 whitespace-nowrap">
                        {formatDateTime(message.createdAt)}
                      </span>
                    </div>
                    <p className="text-slate-700 line-clamp-2">{message.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Detail Modal */}
        {selectedMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{selectedMessage.subject}</h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Von: {selectedMessage.trainingRequest.trainer.firstName} {selectedMessage.trainingRequest.trainer.lastName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {format(new Date(selectedMessage.createdAt), "dd.MM.yyyy 'um' HH:mm", { locale: de })}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Training Info */}
                <div className="bg-slate-50 p-4 rounded-lg mb-6">
                  <h3 className="font-semibold text-slate-800 mb-2">Betreffendes Training</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Titel:</span>
                      <p className="font-medium">{selectedMessage.trainingRequest.training.title}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Datum:</span>
                      <p className="font-medium">
                        {format(new Date(selectedMessage.trainingRequest.training.startDate), "dd.MM.yyyy", { locale: de })}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Ort:</span>
                      <p className="font-medium">{selectedMessage.trainingRequest.training.location}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <Link
                      href={`/dashboard/training/${selectedMessage.trainingRequestId}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                    >
                      Zum Training wechseln →
                    </Link>
                  </div>
                </div>

                {/* Message Content */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-slate-800 mb-3">Nachricht</h4>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedMessage.message}</p>
                </div>

                {/* Trainer Info */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-800">Trainer-Details</h4>
                      <p className="text-lg font-medium text-slate-800 mt-1">
                        {selectedMessage.trainingRequest.trainer.firstName} {selectedMessage.trainingRequest.trainer.lastName}
                      </p>
                      <p className="text-sm text-slate-600">{selectedMessage.trainingRequest.trainer.email}</p>
                    </div>
                    <Link
                      href={`/dashboard/trainer/${selectedMessage.trainingRequest.trainer.id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Trainer ansehen
                    </Link>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                  >
                    Schließen
                  </button>
                  <button
                    onClick={() => {
                      onReply(selectedMessage);
                      setSelectedMessage(null);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Antworten
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
