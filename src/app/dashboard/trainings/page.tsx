"use client";

import { useState, useEffect } from "react";

interface Training {
  id: number;
  title: string;
  topicName: string;
  date: string;
  endTime: string;
  location: string;
  participants: number;
  status: string;
}

export default function TrainingsPage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real application, you would fetch from your API
    // For now, let's mock the data
    const fetchTrainings = async () => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockTrainings: Training[] = [
        {
          id: 1,
          title: "Einführung in Python",
          topicName: "Python",
          date: "2023-10-15T09:00:00",
          endTime: "2023-10-15T17:00:00",
          location: "Online",
          participants: 12,
          status: "confirmed"
        },
        {
          id: 2,
          title: "Advanced JavaScript Workshop",
          topicName: "JavaScript",
          date: "2023-10-22T13:30:00",
          endTime: "2023-10-22T18:00:00",
          location: "Berlin, Hauptstr. 17",
          participants: 8,
          status: "confirmed"
        },
        {
          id: 3,
          title: "Projektmanagement Grundlagen",
          topicName: "Projektmanagement",
          date: "2023-11-05T10:00:00",
          endTime: "2023-11-05T16:00:00",
          location: "München, Bahnhofplatz 3",
          participants: 15,
          status: "confirmed"
        }
      ];
      
      setTrainings(mockTrainings);
      setLoading(false);
    };
    
    fetchTrainings();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Meine Trainings</h1>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Anstehende Trainings</h2>
        </div>
        
        {loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : trainings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Training
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Datum
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zeit
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ort
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teilnehmer
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trainings.map((training) => (
                  <tr key={training.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{training.title}</div>
                          <div className="text-sm text-primary-600">{training.topicName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(training.date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatTime(training.date)} - {formatTime(training.endTime)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{training.location}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{training.participants}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-primary-600 hover:text-primary-900 mr-3">
                        Details
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        Kalender
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Keine anstehenden Trainings gefunden.</p>
          </div>
        )}
      </div>
      
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Trainingshistorie</h2>
        
        <div className="text-center py-6">
          <p className="text-gray-500 mb-4">Hier werden Ihre abgeschlossenen Trainings angezeigt.</p>
          <button className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
            Trainingshistorie anzeigen
          </button>
        </div>
      </div>
    </div>
  );
} 