export interface ItineraryFormData {
  destination: string;
  startDate: Date;
  endDate: Date;
  travelersCount: number;
  tripType: 'familia' | 'casal' | 'lua_de_mel' | 'sozinho' | 'corporativo';
  budgetLevel: 'economico' | 'conforto' | 'luxo';
}

export interface Activity {
  id?: string;
  period: 'manha' | 'tarde' | 'noite';
  title: string;
  description: string | null;
  location: string | null;
  estimatedDuration: string | null;
  estimatedCost: string | null;
  orderIndex: number;
  isApproved: boolean;
}

export interface ItineraryDay {
  id?: string;
  dayNumber: number;
  date: string;
  activities: Activity[];
}

export interface Itinerary {
  id: string;
  userId: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelersCount: number;
  tripType: string;
  budgetLevel: string;
  status: 'draft' | 'generating' | 'review' | 'approved' | 'published';
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
  days?: ItineraryDay[];
}

export interface AIGeneratedDay {
  dayNumber: number;
  date: string;
  activities: {
    period: 'manha' | 'tarde' | 'noite';
    title: string;
    description: string;
    location: string;
    estimatedDuration: string;
    estimatedCost: string;
  }[];
}

export interface AIGeneratedItinerary {
  days: AIGeneratedDay[];
}
