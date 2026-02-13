export type UserRole = 'student' | 'faculty' | 'admin';

export type RecordStatus = 'pending' | 'approved' | 'rejected';

export type RecordCategory = 'academic' | 'sports' | 'cultural' | 'technical' | 'social' | 'other';

export type AssessmentType = 'assignment' | 'test1' | 'test2' | 'test3' | 'project' | 'seminar' | 'other';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatar?: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  student_id?: string;
  department?: string;
  year_of_study?: number;
  section?: string;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentRecord {
  id: string;
  student_id: string;
  title: string;
  description?: string;
  category: RecordCategory;
  activity_date: string;
  points: number;
  certificate_url?: string;
  status: RecordStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  subject_code: string;
  subject_name: string;
  total_classes: number;
  attended_classes: number;
  semester: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface InternalMark {
  id: string;
  student_id: string;
  subject_code: string;
  subject_name: string;
  assessment_type: AssessmentType;
  max_marks: number;
  obtained_marks: number;
  semester: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FacultyAssignment {
  id: string;
  student_id: string;
  faculty_id: string;
  created_at: string;
}

// Internship module types
export type InternshipStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'completed';
export type ApplicationStatus = 'applied' | 'under_review' | 'accepted' | 'rejected' | 'withdrawn';
export type DocumentType = 'offer_letter' | 'completion_certificate' | 'report' | 'other';
export type DocumentContext = 'application' | 'student_internship' | 'evaluation';

export interface Internship {
  id: string;
  created_by: string;
  title: string;
  company: string;
  role: string;
  duration?: string;
  eligibility?: string;
  description?: string;
  deadline?: string; // ISO date
  is_open: boolean;
  created_at: string;
  updated_at: string;
}

export interface InternshipApplication {
  id: string;
  internship_id: string;
  student_id: string;
  status: ApplicationStatus;
  applied_at: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  decision_reason?: string | null;
}

export interface StudentInternship {
  id: string;
  student_id: string;
  company: string;
  role: string;
  duration?: string;
  description?: string;
  start_date?: string | null; // ISO date
  end_date?: string | null; // ISO date
  external_url?: string | null;
  status: InternshipStatus;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InternshipDocument {
  id: string;
  context: DocumentContext;
  ref_id: string;
  doc_type: DocumentType;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
}

export interface Evaluation {
  id: string;
  internship_id?: string | null;
  student_internship_id?: string | null;
  student_id: string;
  evaluator_id: string;
  score?: number | null;
  grade?: string | null;
  feedback?: string | null;
  completion_status: boolean;
  created_at: string;
}

export interface ApprovalLog {
  id: string;
  actor_id: string;
  entity: 'internship_post' | 'application' | 'student_internship' | 'document' | 'evaluation';
  entity_id: string;
  action: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'closed' | 'completed' | 'posted' | 'applied' | 'verified' | 'evaluated' | 'uploaded';
  notes?: string | null;
  created_at: string;
}

// Messaging system types
export type MessageType = 'text' | 'image' | 'file';

export interface Conversation {
  id: string;
  faculty_id: string;
  student_id: string;
  faculty?: Profile;
  student?: Profile;
  last_message?: Message;
  unread_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  is_read: boolean;
  sender?: Profile;
  created_at: string;
  // WhatsApp-like features
  reply_to_id?: string;
  reply_to?: Message;
  is_edited?: boolean;
  edited_at?: string;
  deleted_for_sender?: boolean;
  deleted_for_everyone?: boolean;
}
