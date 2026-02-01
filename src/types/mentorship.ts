export interface Mentorship {
  id: string;
  name: string;
  mentor_name: string;
  mentor_photo_url: string | null;
  specialty: string;
  short_description: string | null;
  full_description: string | null;
  target_audience: string | null;
  objectives: string | null;
  is_active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface MentorshipMeeting {
  id: string;
  mentorship_id: string;
  title: string;
  description: string | null;
  meeting_date: string;
  meeting_url: string | null;
  recording_url: string | null;
  is_past: boolean;
  created_at: string;
  updated_at: string;
}

export interface MentorshipVideo {
  id: string;
  mentorship_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_minutes: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface MentorshipModule {
  id: string;
  mentorship_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface MentorshipLesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface MentorshipMaterial {
  id: string;
  mentorship_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  created_at: string;
  updated_at: string;
}
