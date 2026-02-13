-- Add columns for WhatsApp-like message features: reply, edit, delete

-- Add reply_to_id for message tagging/replies
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- Add edited flag and timestamp
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;

-- Add deleted flags (delete for me, delete for everyone)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_for_sender BOOLEAN DEFAULT FALSE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_for_everyone BOOLEAN DEFAULT FALSE;

-- Create index for replies
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON public.messages(reply_to_id);

-- Policy for updating messages (edit, delete for sender)
DROP POLICY IF EXISTS "Users can update their messages" ON public.messages;
CREATE POLICY "Users can update their messages" ON public.messages
  FOR UPDATE USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- Policy for deleting messages (hard delete - optional)
DROP POLICY IF EXISTS "Users can delete their messages" ON public.messages;
CREATE POLICY "Users can delete their messages" ON public.messages
  FOR DELETE USING (auth.uid() = sender_id);
