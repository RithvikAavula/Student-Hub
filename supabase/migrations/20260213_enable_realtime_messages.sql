-- Enable Realtime for messages table to get instant updates (blue ticks, new messages)
-- This ensures INSERT and UPDATE events are broadcast in real-time

-- Set replica identity to full so we get all columns on UPDATE events
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Add messages table to the supabase_realtime publication
-- This enables real-time subscriptions for INSERT, UPDATE, DELETE events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- Also enable for conversations table
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
END $$;
