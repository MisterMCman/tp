import React, { useState } from 'react';

export type ExpertiseLevel = 'GRUNDLAGE' | 'FORTGESCHRITTEN' | 'EXPERTE';

export interface TopicWithLevel {
  name: string;
  level: ExpertiseLevel;
}

interface TopicSelectorProps {
  topics: TopicWithLevel[];
  topicSuggestions?: string[];
  onAddTopic: (topicName: string, level: ExpertiseLevel, isSuggestion?: boolean) => void;
  onRemoveTopic: (topicName: string, isSuggestion?: boolean) => void;
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
  const [levelSelectorTopic, setLevelSelectorTopic] = useState<{ name: string; isSuggestion?: boolean } | null>(null);
  
  // Handle adding a topic with visual feedback and clearing search
  const handleAddTopicClick = (topicName: string, isSuggestion?: boolean) => {
    // Check if already selected to avoid duplicates
    if (isTopicSelected(topicName)) {
      return;
    }
    
    // Show level selector modal instead of directly adding
    setLevelSelectorTopic({ name: topicName, isSuggestion });
  };

  // Handle level selection
  const handleLevelSelect = (level: ExpertiseLevel) => {
    if (levelSelectorTopic) {
      onAddTopic(levelSelectorTopic.name, level, levelSelectorTopic.isSuggestion);
      onSearchChange(''); // Clear search input
      if (onSearch) onSearch(''); // Clear suggestions
      
      // Show brief visual feedback
      setRecentlyAdded(levelSelectorTopic.name);
      setTimeout(() => setRecentlyAdded(null), 2000);
      
      // Close modal
      setLevelSelectorTopic(null);
    }
  };
  
  // Handle removing a topic with visual feedback
  const handleRemoveTopicClick = (topicName: string) => {
    onRemoveTopic(topicName);
    // Don't clear search - user might want to see other results
  };
  
  // Check if a topic is already selected
  const isTopicSelected = (topicName: string): boolean => {
    return topics.some(t => t.name === topicName) || topicSuggestions.includes(topicName);
  };

  // Get expertise level label
  const getLevelLabel = (level: ExpertiseLevel): string => {
    switch (level) {
      case 'GRUNDLAGE': return 'Grundlage';
      case 'FORTGESCHRITTEN': return 'Fortgeschritten';
      case 'EXPERTE': return 'Experte';
      default: return level;
    }
  };

  // Get expertise level color
  const getLevelColor = (level: ExpertiseLevel): string => {
    switch (level) {
      case 'GRUNDLAGE': return 'bg-[#E0E0E0] text-gray-800 border-gray-300';
      case 'FORTGESCHRITTEN': return 'bg-[#2196F3] text-white border-blue-500';
      case 'EXPERTE': return 'bg-[#212121] text-white border-gray-700';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleAddSuggestion = () => {
    if (!(searchTerm || '').trim()) return;

    setIsAddingSuggestion(true);

    // Add the suggested topic locally (will be sent to API on form submit)
    const addedTopicName = (searchTerm || '').trim();
    
    // Check if already exists in suggestions
    if (topicSuggestions.includes(addedTopicName)) {
      setSuggestionMessage('Dieser Vorschlag wurde bereits hinzugefügt');
      setTimeout(() => setSuggestionMessage(null), 3000);
      setIsAddingSuggestion(false);
      return;
    }
    
    // Add to suggestions list with default level (will be GRUNDLAGE)
    onAddTopic(addedTopicName, 'GRUNDLAGE', true); // true = isSuggestion
    
    // Clear search and overlays
    onSearchChange(''); 
    if (onSearch) onSearch('');
    
    // Show success message
    setSuggestionMessage(`✓ "${addedTopicName}" wurde als Vorschlag hinzugefügt (erscheint in Blau)!`);
    setTimeout(() => setSuggestionMessage(null), 3000);
    
    setIsAddingSuggestion(false);
  };

  const hasExactMatch = suggestions && suggestions.length > 0 ? suggestions.some(s => s.name.toLowerCase() === (searchTerm || '').toLowerCase()) : false;
  const isAlreadySuggested = topicSuggestions.some(s => s.toLowerCase() === (searchTerm || '').trim().toLowerCase());
  const showAddSuggestion = (searchTerm || '').trim().length >= 3 && !hasExactMatch && !isAlreadySuggested && (!suggestions || suggestions.length === 0);

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
          💡 <strong>Tipp:</strong> Klicken Sie auf <span className="text-green-600 font-medium">+ Verfügbar</span> zum Hinzufügen, 
          <span className="text-blue-600 font-medium"> Vorschlag einreichen</span> für neue Themen, 
          oder <span className="text-gray-600 font-medium">− Ausgewählt</span> zum Entfernen
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
                <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-3 py-2 text-xs font-medium z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">
                      {suggestions.length} Ergebnisse gefunden
                    </span>
                    {selectedCount > 0 && (
                      <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
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
                    className={`group p-3 cursor-pointer border-b border-gray-100 last:border-0 transition-all duration-200 ${
                      isSelected 
                        ? 'bg-green-50 hover:bg-gray-100' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className={`font-medium truncate transition-colors ${isSelected ? 'text-green-800 group-hover:text-gray-800' : 'text-gray-900 group-hover:text-gray-700'}`}>
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
                          <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded whitespace-nowrap font-medium border border-green-200">
                            ✓ Ausgewählt
                          </span>
                        ) : (
                          <>
                            {topic.type === 'suggestion' && (
                              <span className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded whitespace-nowrap border border-blue-200">
                                Vorschlag ({topic.status})
                              </span>
                            )}
                            {topic.type === 'existing' && (
                              <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded whitespace-nowrap border border-green-200">
                                Verfügbar
                              </span>
                            )}
                          </>
                        )}
                        {isSelected ? (
                          <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 font-medium">
                    &quot;{searchTerm}&quot; nicht gefunden
                  </span>
                  <button
                    type="button"
                    onClick={handleAddSuggestion}
                    disabled={isAddingSuggestion}
                    className="text-sm bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-all shadow-sm"
                  >
                    {isAddingSuggestion ? 'Wird eingereicht...' : 'Als Vorschlag einreichen'}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Ihr Vorschlag wird zur Prüfung eingereicht und erscheint in Blau bei Ihren ausgewählten Themen
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {suggestionMessage && (
        <div className="text-sm text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-200 flex items-center gap-2 animate-fade-in">
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{suggestionMessage}</span>
        </div>
      )}

      {/* Level Selector Modal */}
      {levelSelectorTopic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setLevelSelectorTopic(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Expertise-Level wählen
              </h3>
              <p className="text-sm text-gray-600">
                Für &quot;{levelSelectorTopic.name}&quot;
              </p>
            </div>
            
            <div className="space-y-3 mb-6">
              <button
                type="button"
                onClick={() => handleLevelSelect('GRUNDLAGE')}
                className="w-full px-4 py-3 bg-[#E0E0E0] border-2 border-gray-300 rounded-lg hover:bg-gray-200 hover:border-gray-400 transition-all text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800">Grundlage</span>
                  <span className="text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded">Basiskenntnisse</span>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => handleLevelSelect('FORTGESCHRITTEN')}
                className="w-full px-4 py-3 bg-[#2196F3] border-2 border-blue-500 rounded-lg hover:bg-blue-600 hover:border-blue-600 transition-all text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">Fortgeschritten</span>
                  <span className="text-xs text-white bg-blue-600 px-2 py-1 rounded">Erweiterte Kenntnisse</span>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => handleLevelSelect('EXPERTE')}
                className="w-full px-4 py-3 bg-[#212121] border-2 border-gray-700 rounded-lg hover:bg-gray-800 hover:border-gray-800 transition-all text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">Experte</span>
                  <span className="text-xs text-white bg-gray-800 px-2 py-1 rounded">Höchste Expertise</span>
                </div>
              </button>
            </div>
            
            <button
              type="button"
              onClick={() => setLevelSelectorTopic(null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Selected Topics Display */}
      {(topics.length > 0 || topicSuggestions.length > 0) && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
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
                    className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all hover:shadow-sm"
                    style={{ 
                      background: topic.level === 'GRUNDLAGE' ? '#E0E0E0' : topic.level === 'FORTGESCHRITTEN' ? '#2196F3' : '#212121',
                      borderColor: topic.level === 'GRUNDLAGE' ? '#9CA3AF' : topic.level === 'FORTGESCHRITTEN' ? '#1E40AF' : '#374151',
                      color: topic.level === 'GRUNDLAGE' ? '#1F2937' : '#FFFFFF'
                    }}
                  >
                    <span className="text-sm font-medium">{topic.name}</span>
                    <span className="text-xs opacity-75">({getLevelLabel(topic.level)})</span>
                    <button
                      type="button"
                      onClick={() => onRemoveTopic(topic.name, false)}
                      className="ml-1 opacity-70 hover:opacity-100 transition-opacity"
                      style={{ color: topic.level === 'GRUNDLAGE' ? '#1F2937' : '#FFFFFF' }}
                      title="Entfernen"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {topicSuggestions.length > 0 && (
            <div className="pt-3 border-t border-gray-300">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Vorgeschlagene Themen ({topicSuggestions.length})
                </label>
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded font-medium">
                  Warten auf Freigabe
                </span>
              </div>
              <p className="text-xs text-blue-600 mb-2">
                Diese Themen wurden von Ihnen vorgeschlagen und werden geprüft
              </p>
              <div className="flex flex-wrap gap-2">
                {topicSuggestions.map((topic, index) => (
                  <span
                    key={`suggestion-${index}`}
                    className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-blue-50 text-blue-700 border-blue-300 transition-all hover:shadow-sm"
                  >
                    <span className="text-sm font-medium">{topic}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveTopic(topic, true)}
                      className="opacity-70 hover:opacity-100 transition-opacity text-blue-700"
                      title="Entfernen"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
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
