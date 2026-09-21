/**
 * Offset paging helper for load-more lists.
 *
 * Returns the offset of the page AFTER the most recently loaded one, derived
 * from the server-echoed offset rather than by incrementing local state.
 * FlatList/SectionList can fire onEndReached several times before React
 * processes the first setState, so an incremental `prev => prev + size`
 * would jump pages (0 → 60, skipping 30). Deriving from the loaded page
 * makes repeated calls idempotent: until the next page's data arrives,
 * every call yields the same next offset.
 */
export function nextPageOffset(loadedOffset: number, pageSize: number): number {
  return loadedOffset + pageSize;
}
