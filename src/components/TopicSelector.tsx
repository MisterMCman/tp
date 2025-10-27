import React, { useState } from 'react';

interface TopicSelectorProps {
  topics: string[];
  topicSuggestions?: string[];
  onAddTopic: (topicName: string, isSuggestion?: boolean) => void;
  onRemoveTopic: (topicName: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSearch?: (term: string) => void;
  suggestions: { id: number; name: string; displayName?: string; short_title?: string; type?: 'existing' | 'suggestion'; status?: string }[];
}

export const TopicSelector: React.FC<TopicSelectorProps> = ({
  topics,
  topicSuggestions = [],
  onAddTopic,
  onRemoveTopic,
  searchTerm,
  onSearchChange,
  onSearch,
  suggestions,
}) => {
  const [isAddingSuggestion, setIsAddingSuggestion] = useState(false);
  const [suggestionMessage, setSuggestionMessage] = useState<string | null>(null);
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);
  
  // Handle adding a topic with visual feedback and clearing search
  const handleAddTopicClick = (topicName: string, isSuggestion?: boolean) => {
    onAddTopic(topicName, isSuggestion);
    onSearchChange(''); // Clear search input
    if (onSearch) onSearch(''); // Clear suggestions
    
    // Show brief visual feedback
    setRecentlyAdded(topicName);
    setTimeout(() => setRecentlyAdded(null), 2000);
  };
  
  // Handle removing a topic with visual feedback
  const handleRemoveTopicClick = (topicName: string) => {
    onRemoveTopic(topicName);
    // Don't clear search - user might want to see other results
  };
  
  // Check if a topic is already selected
  const isTopicSelected = (topicName: string): boolean => {
    return topics.includes(topicName) || topicSuggestions.includes(topicName);
  };

  const handleAddSuggestion = async () => {
    if (!(searchTerm || '').trim()) return;

    setIsAddingSuggestion(true);

    try {
      const response = await fetch('/api/topic-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: (searchTerm || '').trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Add the suggested topic using the onAddTopic callback
        const addedTopicName = (searchTerm || '').trim();
        onAddTopic(addedTopicName, true);
        setSuggestionMessage('Vorschlag erfolgreich hinzugefügt!');
        setTimeout(() => setSuggestionMessage(null), 3000);
        onSearchChange(''); // Clear search
        if (onSearch) onSearch(''); // Clear suggestions
        
        // Show visual feedback
        setRecentlyAdded(addedTopicName);
        setTimeout(() => setRecentlyAdded(null), 2000);
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

  const hasExactMatch = suggestions && suggestions.length > 0 ? suggestions.some(s => s.name.toLowerCase() === (searchTerm || '').toLowerCase()) : false;
  const showAddSuggestion = (searchTerm || '').trim().length >= 3 && !hasExactMatch && (!suggestions || suggestions.length === 0);

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          id="topicSearch"
          placeholder="Mindestens 3 Zeichen eingeben..."
          value={searchTerm}
          onChange={(e) => {
            const newValue = e.target.value;
            onSearchChange(newValue);
            if (onSearch && newValue.length >= 3) {
              onSearch(newValue);
            } else if (onSearch && newValue.length < 3) {
              onSearch(''); // Clear suggestions for short terms
            }
          }}
          className="form-input pr-10"
          autoComplete="off"
        />
        {searchTerm && (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
               className="w-5 h-5 absolute right-3 top-3.5 text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        )}
        <label htmlFor="topicSearch" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
          Kompetenzen/Themen
        </label>
      </div>
      
      {/* Helpful tip */}
      {!recentlyAdded && (
        <p className="text-xs text-gray-500 ml-1 -mt-1">
          💡 <strong>Tipp:</strong> Klicken Sie auf <span className="text-green-600 font-medium">+ Verfügbar</span> zum Hinzufügen oder auf <span className="text-red-500 font-medium">− Ausgewählt</span> zum Entfernen
        </p>
      )}
      
      {/* Success feedback when topic is added */}
      {recentlyAdded && (
        <div className="text-sm text-green-700 bg-green-100 p-2 rounded border border-green-300 flex items-center gap-2 animate-fade-in -mt-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>&quot;{recentlyAdded}&quot; wurde hinzugefügt</span>
        </div>
      )}
      
      {/* Search results dropdown */}
      <div className="relative">
        
        {/* Show hint when search term is too short */}
        {searchTerm && searchTerm.length > 0 && searchTerm.length < 3 && (
          <div className="suggestions-dropdown w-full">
            <div className="p-3 text-sm text-gray-500 text-center">
              Bitte geben Sie mindestens 3 Zeichen ein ({3 - searchTerm.length} weitere)
            </div>
          </div>
        )}

        {suggestions && suggestions.length > 0 && searchTerm.length >= 3 && (
          <div className="suggestions-dropdown w-full">
            {/* Results counter header */}
            {(() => {
              const selectedCount = suggestions.filter(s => isTopicSelected(s.name)).length;
              return (
                <div className="sticky top-0 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-3 py-2 text-xs font-medium z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">
                      {suggestions.length} Ergebnisse gefunden
                    </span>
                    {selectedCount > 0 && (
                      <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded">
                        {selectedCount} bereits ausgewählt
                      </span>
                    )}
                  </div>
                  {suggestions.length > 10 && (
                    <div className="text-gray-500 mt-1">
                      ↓ Scrollen für mehr Ergebnisse
                    </div>
                  )}
                </div>
              );
            })()}
            <ul>
              {suggestions.map((topic) => {
                const isSelected = isTopicSelected(topic.name);
                return (
                  <li
                    key={`${topic.type}-${topic.id}`}
                    onClick={() => isSelected ? handleRemoveTopicClick(topic.name) : handleAddTopicClick(topic.name, topic.type === 'suggestion')}
                    title={isSelected ? 'Klicken zum Entfernen' : 'Klicken zum Hinzufügen'}
                    className={`group p-3 cursor-pointer border-b border-gray-100 last:border-0 transition-all duration-150 ${
                      isSelected 
                        ? 'bg-gradient-to-r from-green-50 to-green-100 hover:from-red-50 hover:to-red-100' 
                        : 'hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className={`font-medium truncate ${isSelected ? 'text-green-800' : ''}`}>
                          {topic.displayName || topic.name}
                        </span>
                        {topic.short_title && topic.short_title !== topic.name && (
                          <span className="text-xs text-gray-500 mt-0.5">
                            Auch bekannt als: {topic.short_title}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <span className="text-xs text-green-700 bg-green-200 px-2 py-1 rounded whitespace-nowrap font-medium">
                            ✓ Ausgewählt
                          </span>
                        ) : (
                          <>
                            {topic.type === 'suggestion' && (
                              <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded whitespace-nowrap">
                                Vorschlag ({topic.status})
                              </span>
                            )}
                            {topic.type === 'existing' && (
                              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded whitespace-nowrap">
                                Verfügbar
                              </span>
                            )}
                          </>
                        )}
                        {isSelected ? (
                          <svg className="w-6 h-6 text-red-500 group-hover:text-red-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-green-500 group-hover:text-green-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
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
        <div className="text-sm text-green-600 bg-green-50 p-2 rounded border border-green-200">
          {suggestionMessage}
        </div>
      )}

      {/* Selected Topics Display */}
      {(topics.length > 0 || topicSuggestions.length > 0) && (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 space-y-3 border border-gray-200">
          {topics.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Ausgewählte Themen ({topics.length})
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {topics.map((topic, index) => (
                  <span
                    key={`topic-${index}`}
                    className="selected-topic group"
                  >
                    {topic}
                    <button
                      type="button"
                      onClick={() => onRemoveTopic(topic)}
                      className="ml-2 text-white opacity-70 hover:opacity-100 transition-opacity"
                      title="Entfernen"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {topicSuggestions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Vorgeschlagene Themen ({topicSuggestions.length})
                </label>
                <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                  Warten auf Freigabe
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {topicSuggestions.map((topic, index) => (
                  <span
                    key={`suggestion-${index}`}
                    className="selected-topic bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-300"
                  >
                    {topic}
                    <button
                      type="button"
                      onClick={() => onRemoveTopic(topic)}
                      className="ml-2 text-white opacity-70 hover:opacity-100 transition-opacity"
                      title="Entfernen"
                    >
                      ×
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
