export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  is_favorite: boolean;
  client_id: string | null;
  opportunity_id: string | null;
  event_id: string | null;
  created_at: string;
  updated_at: string;
}

export type NoteSortOption = 'updated_at' | 'created_at' | 'title';

export interface NoteFilters {
  search: string;
  sortBy: NoteSortOption;
  sortOrder: 'asc' | 'desc';
}
