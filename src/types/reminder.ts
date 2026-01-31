export interface TripReminder {
  id: string;
  trip_id: string;
  user_id: string;
  reminder_date: string;
  days_before: number;
  follow_up_note: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  trip?: {
    id: string;
    client_name: string;
    destination: string;
    start_date: string;
    end_date: string;
  };
}
