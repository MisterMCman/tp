"use client";

import { format } from "date-fns";
import { de } from "date-fns/locale";
import { FileAttachment } from "@/lib/types";

interface MessageBubbleProps {
  message: string;
  attachments?: FileAttachment[];
  timestamp: string;
  isFromUser: boolean;
  senderName?: string;
  showSenderName?: boolean;
}

export default function MessageBubble({
  message,
  attachments = [],
  timestamp,
  isFromUser,
  senderName,
  showSenderName = true
}: MessageBubbleProps) {
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

  return (
    <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${
      isFromUser
        ? 'bg-white text-slate-800 border border-slate-200 shadow-sm ml-auto'
        : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg'
    } rounded-2xl px-4 py-3 relative`}>
      {showSenderName && !isFromUser && senderName && (
        <p className="text-xs font-semibold mb-2 text-slate-600">{senderName}</p>
      )}

      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isFromUser ? 'text-slate-800' : '!text-white'}`} style={!isFromUser ? { color: '#ffffff' } : undefined}>
        {message}
      </p>

      {/* File Attachments */}
      {attachments && attachments.length > 0 && (
        <div className="mt-3 space-y-2">
          {attachments.map((attachment: FileAttachment) => (
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
        {format(new Date(timestamp), "dd.MM.yyyy", { locale: de })} - {format(new Date(timestamp), "HH:mm", { locale: de })}
      </p>
    </div>
  );
}
