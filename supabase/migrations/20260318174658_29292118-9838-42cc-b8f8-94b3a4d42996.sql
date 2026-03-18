
-- Support tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral',
  status TEXT NOT NULL DEFAULT 'aberto',
  tags TEXT[] DEFAULT '{}',
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Support ticket messages table
CREATE TABLE public.ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  attachment_urls TEXT[] DEFAULT '{}',
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for support_tickets
CREATE POLICY "Users can view own tickets" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create own tickets" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tickets" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- RLS policies for ticket_messages
CREATE POLICY "Users can view messages of their tickets" ON public.ticket_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t 
      WHERE t.id = ticket_id 
      AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can send messages to their tickets" ON public.ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.support_tickets t 
      WHERE t.id = ticket_id 
      AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- Update trigger for updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for ticket messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;

-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('ticket-attachments', 'ticket-attachments', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload ticket attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ticket-attachments');

CREATE POLICY "Anyone can view ticket attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'ticket-attachments');
