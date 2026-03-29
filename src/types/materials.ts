export interface Material {
  id: string;
  title: string;
  material_type: string;
  category: string;
  destination?: string | null;
  file_url?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  published_at: string;
  caption?: string | null;
  is_permanent?: boolean;
  supplier_id?: string | null;
  is_active: boolean;
  order_index?: number;
  canva_url?: string | null;
  trail_id?: string | null;
  tour_operators?: {
    id: string;
    name: string;
  } | null;
  learning_trails?: {
    id: string;
    name: string;
  } | null;
}

export interface MaterialGallery {
  id: string; // Generated unique ID for the gallery
  title: string;
  category: string;
  destination?: string | null;
  supplier_id?: string | null;
  tour_operators?: {
    id: string;
    name: string;
  } | null;
  materials: Material[];
  published_at: string; // Most recent publication date
  thumbnail_url?: string | null; // First available thumbnail
  fileCount: number;
  hasVideos: boolean;
  hasImages: boolean;
  hasPDFs: boolean;
  isCanvaTemplate: boolean;
  canva_url?: string | null;
}

export interface MaterialsByPeriod<T> {
  today: T[];
  thisWeek: T[];
  thisMonth: T[];
  older: T[];
}

export interface MaterialsByCategory<T> {
  [category: string]: T[];
}

export interface MaterialsBySupplier<T> {
  [supplierName: string]: T[];
}
