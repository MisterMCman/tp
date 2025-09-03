import React, { useState } from 'react';

interface TopicSelectorProps {
  topics: string[];
  topicSuggestions?: string[];
  onAddTopic: (topicName: string, isSuggestion?: boolean) => void;
  onRemoveTopic: (topicName: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  suggestions: { id: number; name: string; type?: 'existing' | 'suggestion'; status?: string }[];
}

export const TopicSelector: React.FC<TopicSelectorProps> = ({
  topics,
  topicSuggestions = [],
  onAddTopic,
  onRemoveTopic,
  searchTerm,
  onSearchChange,
  suggestions,
}) => {
  const [isAddingSuggestion, setIsAddingSuggestion] = useState(false);
  const [suggestionMessage, setSuggestionMessage] = useState<string | null>(null);

  const handleAddSuggestion = async () => {
    if (!searchTerm.trim()) return;

    setIsAddingSuggestion(true);

    try {
      const response = await fetch('/api/topic-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: searchTerm.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Add the suggested topic using the onAddTopic callback
        // This will be handled by the parent component to add it to topicSuggestions list
        onAddTopic(searchTerm.trim(), true);
        setSuggestionMessage('Vorschlag erfolgreich hinzugefügt!');
        setTimeout(() => setSuggestionMessage(null), 3000);
        onSearchChange(''); // Clear search
      } else {
        setSuggestionMessage(data.error || 'Fehler beim Erstellen des Vorschlags');
        setTimeout(() => setSuggestionMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error adding suggestion:', error);
      setSuggestionMessage('Netzwerkfehler beim Erstellen des Vorschlags');
      setTimeout(() => setSuggestionMessage(null), 3000);
    } finally {
      setIsAddingSuggestion(false);
    }
  };

  const hasExactMatch = suggestions && suggestions.length > 0 ? suggestions.some(s => s.name.toLowerCase() === searchTerm.toLowerCase()) : false;
  const showAddSuggestion = searchTerm.trim() && !hasExactMatch && (!suggestions || suggestions.length === 0);

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="text"
          id="topicSearch"
          placeholder="Python, Marketing, Projektmanagement..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="form-input pr-10"
        />
        <label htmlFor="topicSearch" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
          Kompetenzen/Themen
        </label>
        {searchTerm && (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
               className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        )}

        {suggestions && suggestions.length > 0 && (
          <ul className="suggestions-dropdown w-full">
            {suggestions.map((topic) => (
              <li
                key={`${topic.type}-${topic.id}`}
                onClick={() => onAddTopic(topic.name, topic.type === 'suggestion')}
                className="p-3 hover:bg-red-50 cursor-pointer border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center justify-between">
                  <span>{topic.name}</span>
                  {topic.type === 'suggestion' && (
                    <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                      Vorschlag ({topic.status})
                    </span>
                  )}
                  {topic.type === 'existing' && (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                      Verfügbar
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {showAddSuggestion && (
          <div className="suggestions-dropdown w-full">
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">
                  &quot;{searchTerm}&quot; nicht gefunden
                </span>
                <button
                  type="button"
                  onClick={handleAddSuggestion}
                  disabled={isAddingSuggestion}
                  className="text-sm bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded hover:from-red-600 hover:to-red-700 disabled:opacity-50"
                >
                  {isAddingSuggestion ? 'Wird hinzugefügt...' : 'Als Vorschlag einreichen'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {suggestionMessage && (
        <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
          {suggestionMessage}
        </div>
      )}

      {(topics.length > 0 || topicSuggestions.length > 0) && (
        <div className="space-y-2 mt-2">
          {topics.length > 0 && (
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Ausgewählte Themen:</label>
              <div className="flex flex-wrap gap-2">
                {topics.map((topic, index) => (
                  <span
                    key={`topic-${index}`}
                    className="selected-topic"
                  >
                    {topic}
                    <button
                      type="button"
                      onClick={() => onRemoveTopic(topic)}
                      className="ml-2 text-white opacity-70 hover:opacity-100"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {topicSuggestions.length > 0 && (
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Vorgeschlagene Themen:</label>
              <div className="flex flex-wrap gap-2">
                {topicSuggestions.map((topic, index) => (
                  <span
                    key={`suggestion-${index}`}
                    className="selected-topic bg-blue-100 text-blue-800 border-blue-300"
                  >
                    {topic}
                    <button
                      type="button"
                      onClick={() => onRemoveTopic(topic)}
                      className="ml-2 text-blue-800 opacity-70 hover:opacity-100"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
