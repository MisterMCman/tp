"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUserData } from "@/lib/session";

interface Topic {
  id: number;
  name: string;
  short_title?: string;
  slug: string;
  state: string;
  trainings?: { id: number }[];
  trainers?: { id: number }[];
  trainersCount?: number;
  completedTrainingsCount?: number;
  futureTrainingsCount?: number;
}

type SortColumn = 'name' | 'state' | 'trainersCount' | 'completedTrainingsCount' | 'futureTrainingsCount';
type SortDirection = 'asc' | 'desc';

export default function TopicsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [allTopics, setAllTopics] = useState<Topic[]>([]); // Store all topics for filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showModal, setShowModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    short_title: '',
    state: 'online'
  });

  useEffect(() => {
    const currentUser = getUserData();
    if (!currentUser || currentUser.userType !== 'TRAINING_COMPANY') {
      router.push('/dashboard');
      return;
    }

    setUser(currentUser);
    loadTopics();
    setLoading(false);
  }, [router]);

  const loadTopics = async () => {
    try {
      const response = await fetch('/api/topics?manage=true');
      if (response.ok) {
        const data = await response.json();
        setAllTopics(data.topics || []);
        setTopics(data.topics || []);
      }
    } catch (error) {
      console.error('Error loading topics:', error);
    }
  };

  // Filter and sort topics
  useEffect(() => {
    let filtered = [...allTopics];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(topic => 
        topic.name.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'state':
          aValue = a.state;
          bValue = b.state;
          break;
        case 'trainersCount':
          aValue = a.trainersCount ?? a.trainers?.length ?? 0;
          bValue = b.trainersCount ?? b.trainers?.length ?? 0;
          break;
        case 'completedTrainingsCount':
          aValue = a.completedTrainingsCount ?? 0;
          bValue = b.completedTrainingsCount ?? 0;
          break;
        case 'futureTrainingsCount':
          aValue = a.futureTrainingsCount ?? 0;
          bValue = b.futureTrainingsCount ?? 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setTopics(filtered);
  }, [allTopics, searchTerm, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return (
        <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    if (sortDirection === 'asc') {
      return (
        <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenModal = (topic?: Topic) => {
    if (topic) {
      setEditingTopic(topic);
      setFormData({
        name: topic.name,
        short_title: topic.short_title || '',
        state: topic.state
      });
    } else {
      setEditingTopic(null);
      setFormData({
        name: '',
        short_title: '',
        state: 'online'
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTopic(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingTopic 
        ? `/api/topics/${editingTopic.id}`
        : '/api/topics';
      
      const method = editingTopic ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadTopics();
        handleCloseModal();
      } else {
        const error = await response.json();
        alert(`Fehler: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving topic:', error);
      alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    }
  };

  const handleDelete = async (topic: Topic) => {
    if (!confirm(`Möchten Sie das Thema "${topic.name}" wirklich löschen?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/topics/${topic.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadTopics();
      } else {
        const error = await response.json();
        alert(`Fehler: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting topic:', error);
      alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Laden...</div>;
  }

  return (
    <>
      <div className="fixed top-0 z-40 bg-white border-b border-gray-200 pl-[var(--content-left-padding)] pr-6 py-4 flex justify-between items-start" style={{ left: 'var(--sidebar-width, 256px)', right: 0, paddingLeft: '40px', paddingRight: '40px' }}>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Themen verwalten</h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie Themen und Kategorien für Trainings
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="ptw-button-primary"
        >
          + Neues Thema
        </button>
      </div>
      <div className="pl-[var(--content-left-padding)] pr-6 pt-32 pb-6">
        <div className="flex flex-col h-[calc(100vh-8rem)]">
          {/* Search Bar - Sticky */}
          <div className="sticky top-0 z-30 bg-white pb-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Themen durchsuchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  style={{ borderColor: 'var(--ptw-border-primary)' }}
                />
                <svg
                  className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
                  style={{ borderColor: 'var(--ptw-border-primary)' }}
                >
                  Zurücksetzen
                </button>
              )}
            </div>
          </div>

          {/* Table Container - Scrollable */}
          <div className="flex-1 overflow-auto">
            {allTopics.length === 0 ? (
              <div className="text-center py-12">
                <p style={{ color: 'var(--ptw-text-secondary)' }}>
                  Noch keine Themen erstellt. Erstellen Sie ein neues Thema, um es in Trainings zu verwenden.
                </p>
              </div>
            ) : topics.length === 0 ? (
              <div className="text-center py-12">
                <p style={{ color: 'var(--ptw-text-secondary)' }}>
                  Keine Themen gefunden, die Ihrer Suche entsprechen.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--ptw-border-primary)' }}>
                <table className="w-full">
                  <thead className="sticky top-0 z-20" style={{ background: 'var(--ptw-bg-secondary)' }}>
                    <tr>
                      <th 
                        className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100 select-none"
                        style={{ color: 'var(--ptw-text-primary)' }}
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center">
                          Name
                          {getSortIcon('name')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100 select-none"
                        style={{ color: 'var(--ptw-text-primary)' }}
                        onClick={() => handleSort('state')}
                      >
                        <div className="flex items-center">
                          Status
                          {getSortIcon('state')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100 select-none"
                        style={{ color: 'var(--ptw-text-primary)' }}
                        onClick={() => handleSort('trainersCount')}
                      >
                        <div className="flex items-center">
                          Trainer
                          {getSortIcon('trainersCount')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100 select-none"
                        style={{ color: 'var(--ptw-text-primary)' }}
                        onClick={() => handleSort('completedTrainingsCount')}
                      >
                        <div className="flex items-center">
                          Abgeschlossene Trainings
                          {getSortIcon('completedTrainingsCount')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100 select-none"
                        style={{ color: 'var(--ptw-text-primary)' }}
                        onClick={() => handleSort('futureTrainingsCount')}
                      >
                        <div className="flex items-center">
                          Zukünftige Trainings
                          {getSortIcon('futureTrainingsCount')}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--ptw-text-primary)' }}>
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topics.map((topic, index) => (
                      <tr
                        key={topic.id}
                        className="border-t"
                        style={{
                          borderColor: 'var(--ptw-border-primary)',
                          background: index % 2 === 0 ? 'var(--ptw-bg-primary)' : 'var(--ptw-bg-secondary)'
                        }}
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium" style={{ color: 'var(--ptw-text-primary)' }}>
                            {topic.name}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded ${
                            topic.state === 'online' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {topic.state === 'online' ? 'Online' : 'Offline'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm" style={{ color: 'var(--ptw-text-primary)' }}>
                            {topic.trainersCount ?? topic.trainers?.length ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm" style={{ color: 'var(--ptw-text-primary)' }}>
                            {topic.completedTrainingsCount ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm" style={{ color: 'var(--ptw-text-primary)' }}>
                            {topic.futureTrainingsCount ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenModal(topic)}
                              className="text-sm px-3 py-1 rounded border hover:bg-gray-50"
                              style={{ borderColor: 'var(--ptw-border-primary)' }}
                              title="Bearbeiten"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(topic)}
                              className="text-sm px-3 py-1 rounded border hover:bg-red-50 text-red-600"
                              style={{ borderColor: 'var(--ptw-border-primary)' }}
                              disabled={topic.trainings && topic.trainings.length > 0}
                              title={topic.trainings && topic.trainings.length > 0 ? 'Kann nicht gelöscht werden (wird verwendet)' : 'Löschen'}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">
                  {editingTopic ? 'Thema bearbeiten' : 'Neues Thema'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="z.B. JavaScript, Python, Projektmanagement"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kurztitel (optional)
                </label>
                <input
                  type="text"
                  name="short_title"
                  value={formData.short_title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="z.B. JS, Py, PM"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ein kürzerer Titel für Anzeigezwecke
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Offline-Themen werden nicht in Suchvorgängen angezeigt
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="ptw-button-primary"
                >
                  {editingTopic ? 'Aktualisieren' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

