"use client";

import { FileAttachment as FileAttachmentType } from "@/lib/types";

interface FileAttachmentProps {
  attachment: FileAttachmentType;
  showDownload?: boolean;
  className?: string;
}

export default function FileAttachment({
  attachment,
  showDownload = true,
  className = ""
}: FileAttachmentProps) {
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

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `/api/files/${attachment.storedFilename}`;
    link.download = attachment.filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`flex items-center space-x-3 p-3 rounded-lg bg-slate-50 border border-slate-200 ${className}`}>
      <span className="text-xl flex-shrink-0">
        {getFileIcon(attachment.mimeType)}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-slate-800 truncate">
            {attachment.filename}
          </span>
          {showDownload && (
            <button
              onClick={handleDownload}
              className="text-blue-600 hover:text-blue-800 text-sm hover:underline flex-shrink-0"
              title="Download"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {formatFileSize(attachment.fileSize)}
        </p>
      </div>
    </div>
  );
}
