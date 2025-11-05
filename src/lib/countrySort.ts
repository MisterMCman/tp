/**
 * Sorts countries with German-speaking countries first (Deutschland, Österreich, Schweiz),
 * then the rest alphabetically by German name
 */
export function sortCountries<T extends { name: string }>(countries: T[]): T[] {
  return [...countries].sort((a, b) => {
    // Priority countries (German-speaking)
    const priority = ['Deutschland', 'Österreich', 'Schweiz'];
    const aIndex = priority.indexOf(a.name);
    const bIndex = priority.indexOf(b.name);
    
    // If both are priority countries, maintain their order
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // If only a is priority, it comes first
    if (aIndex !== -1) return -1;
    
    // If only b is priority, it comes first
    if (bIndex !== -1) return 1;
    
    // Both are non-priority, sort alphabetically by German name
    return a.name.localeCompare(b.name, 'de');
  });
}

