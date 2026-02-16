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

export type AcademicYear = 1 | 2 | 3 | 4;

export type GraduationStatus = 'Active' | 'Graduated';

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
  join_date?: string;
  batch_year?: number;
  current_academic_year?: AcademicYear;
  graduation_status?: GraduationStatus;
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
  academic_year?: AcademicYear;
  // Fraud detection fields
  fraud_indicators?: FraudIndicators;
  fraud_score?: number;
  analysis_completed?: boolean;
  created_at: string;
  updated_at: string;
}

// Extended record type with student details
export interface StudentRecordWithDetails extends StudentRecord {
  student_name?: string;
  student_email?: string;
  student_department?: string;
  student_section?: string;
  student_batch_year?: number;
  student_current_academic_year?: AcademicYear;
}

// Year-wise statistics for a student
export interface YearWiseStats {
  academic_year: AcademicYear;
  total_submissions: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
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

// Certificate Validation System types
export type CertificateValidationStatus = 'valid' | 'fake' | 'tampered';
export type CertificateApprovalStatus = 'pending' | 'approved' | 'rejected';

// Fraud analysis types
export interface TextAnomaly {
  type: 'spacing' | 'font' | 'alignment' | 'case' | 'character' | 'editing_artifact';
  description: string;
  severity: 'low' | 'medium' | 'high';
  location?: string;
}

export interface FraudIndicators {
  creation_software?: string;
  modification_software?: string;
  creation_date?: string;
  modification_date?: string;
  has_digital_signature: boolean;
  signature_valid?: boolean;
  author?: string;
  producer?: string;
  suspicious_indicators: string[];
  metadata_stripped: boolean;
  multiple_modifications: boolean;
  pdf_version?: string;
  page_count?: number;
  is_scanned?: boolean;
  has_layers?: boolean;
  exif_data?: Record<string, any>;
  // Text analysis fields
  extracted_text?: string;
  text_confidence?: number;
  names_found?: string[];
  name_match_score?: number;
  name_verification_status?: 'verified' | 'suspicious' | 'mismatch' | 'not_found';
  text_anomalies?: TextAnomaly[];
  font_inconsistencies?: boolean;
  text_extraction_method?: 'pdf_native' | 'ocr' | 'hybrid';
  // Image edit detection fields
  image_edit_detected?: boolean;
  image_edit_confidence?: number;
  image_suspicious_regions?: string[];
}

export interface CertificateSubmission {
  id: string;
  student_id: string;
  certificate_code: string;
  title: string;
  description?: string;
  issuing_organization: string;
  issue_date: string;
  file_url: string;
  file_path?: string; // Alias for file_url used in storage access
  file_hash: string;
  validation_status: CertificateValidationStatus;
  approval_status: CertificateApprovalStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  submitted_at: string; // Alias for created_at
  created_at: string;
  updated_at: string;
  // Fraud analysis fields
  fraud_indicators?: FraudIndicators;
  fraud_score?: number;
  analysis_completed?: boolean;
  // Extended fields from joins
  student?: Profile;
  reviewer?: Profile;
}

export interface VerifiedCertificate {
  id: string;
  certificate_code: string;
  issuing_organization: string;
  file_hash: string;
  metadata?: Record<string, any>;
  added_by?: string;
  created_at: string;
}

export interface CertificateValidationLog {
  id: string;
  submission_id?: string;
  certificate_code: string;
  uploaded_file_hash?: string;
  validation_status: CertificateValidationStatus;
  validated_by?: string;
  user_agent?: string;
  created_at: string;
}

export interface CertificateStats {
  total_submissions: number;
  pending_submissions: number;
  approved_submissions: number;
  rejected_submissions: number;
  valid_certificates: number;
  fake_certificates: number;
  tampered_certificates: number;
  recent_submissions: number;
}

export interface FraudulentCertificateReport {
  id: string;
  submission_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  student_roll_number: string;
  certificate_code: string;
  title: string;
  issuing_organization: string;
  issue_date: string;
  validation_status: CertificateValidationStatus;
  approval_status: CertificateApprovalStatus;
  rejection_reason?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  file_url: string;
  file_path: string;
  file_hash: string;
  fraud_indicators?: FraudIndicators;
  fraud_score?: number;
  submitted_at: string;
}

// For public certificate verification portal
export interface CertificateValidationResult {
  status: CertificateValidationStatus;
  certificate?: {
    certificate_code: string;
    title?: string;
    issuing_organization: string;
    issue_date?: string;
    student_name?: string;
  };
  message: string;
  verified_at: string;
}
