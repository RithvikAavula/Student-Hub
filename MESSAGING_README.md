# WhatsApp-like Messaging System

## Overview
A real-time messaging system has been implemented for student-faculty communication, similar to WhatsApp's interface and functionality.

## Features
- **Real-time messaging** between assigned students and faculty
- **WhatsApp-like interface** with message bubbles and timestamps
- **File sharing** support (images, documents, PDFs)
- **Unread message indicators** with badge counts
- **Conversation list** with last message preview
- **Automatic conversation creation** when faculty assigns students
- **Message read receipts**

## Database Schema
The messaging system uses the following tables:

### conversations
- Tracks chat sessions between faculty and students
- One conversation per faculty-student pair
- Includes timestamps for last activity

### messages
- Stores individual messages
- Supports text, image, and file messages
- Includes read status and sender information

## How It Works

### For Students
1. Students can access the "Messages" tab in their dashboard
2. They can chat with their assigned faculty member
3. Messages are sent and received in real-time
4. File sharing is supported

### For Faculty
1. Faculty can access the "Messages" tab in their dashboard
2. They can chat with all their assigned students
3. Messages are sent and received in real-time
4. File sharing is supported

## Database Migration
To enable the messaging system, run the following SQL in your Supabase SQL editor:

```sql
-- Create messaging tables for student-faculty communication
-- Created on 2026-01-30

BEGIN;

-- Conversations table to track chat sessions between faculty and students
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one conversation per faculty-student pair
  UNIQUE(faculty_id, student_id)
);

-- Messages table for individual messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_faculty_id ON public.conversations(faculty_id);
CREATE INDEX IF NOT EXISTS idx_conversations_student_id ON public.conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
-- Faculty can see conversations where they are the faculty
CREATE POLICY "Faculty can view their conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = faculty_id);

-- Students can see conversations where they are the student
CREATE POLICY "Students can view their conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = student_id);

-- Only faculty can create conversations (when assigning students)
CREATE POLICY "Faculty can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = faculty_id);

-- Faculty and students can update their conversation timestamps
CREATE POLICY "Users can update conversation timestamps" ON public.conversations
  FOR UPDATE USING (auth.uid() = faculty_id OR auth.uid() = student_id);

-- RLS Policies for messages
-- Users can view messages in conversations they participate in
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND (c.faculty_id = auth.uid() OR c.student_id = auth.uid())
    )
  );

-- Users can insert messages in conversations they participate in
CREATE POLICY "Users can send messages in their conversations" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND (c.faculty_id = auth.uid() OR c.student_id = auth.uid())
    )
    AND auth.uid() = sender_id
  );

-- Users can update message read status in conversations they participate in
CREATE POLICY "Users can update message read status" ON public.messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND (c.faculty_id = auth.uid() OR c.student_id = auth.uid())
    )
  );

-- Function to automatically create conversation when faculty assigns student
CREATE OR REPLACE FUNCTION create_conversation_on_assignment()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.conversations (faculty_id, student_id)
  VALUES (NEW.faculty_id, NEW.student_id)
  ON CONFLICT (faculty_id, student_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create conversation when faculty assignment is created
CREATE TRIGGER trigger_create_conversation
  AFTER INSERT ON public.faculty_assignments
  FOR EACH ROW
  EXECUTE FUNCTION create_conversation_on_assignment();

-- Function to update conversation updated_at when new message is sent
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp on new message
CREATE TRIGGER trigger_update_conversation_timestamp
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

COMMIT;
```

## File Structure
- `src/components/features/MessagesTab.tsx` - Main messaging component
- `src/types/index.ts` - Updated with messaging types
- `src/pages/student/StudentDashboard.tsx` - Added Messages tab
- `src/pages/faculty/FacultyDashboard.tsx` - Added Messages tab

## Usage
1. Run the database migration SQL in Supabase
2. The messaging system will be automatically available in both student and faculty dashboards
3. Conversations are created automatically when faculty assign students
4. Real-time messaging works immediately after migration