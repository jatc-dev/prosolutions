export const getPrefixMatches = (
  options: string[],
  query: string,
  maxResults = 5
): string[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return options.slice(0, maxResults);
  }

  return options
    .filter((option) => {
      const normalizedOption = option.toLowerCase();
      return normalizedOption.startsWith(normalizedQuery) && normalizedOption !== normalizedQuery;
    })
    .slice(0, maxResults);
};