import { supabase } from './supabase';
import type {
  Internship,
  InternshipApplication,
  StudentInternship,
  InternshipDocument,
  Evaluation,
  DocumentType,
  DocumentContext,
  ApplicationStatus,
  InternshipStatus,
} from '@/types';

// Faculty: create/edit/close internship postings
export async function createInternship(post: Omit<Internship, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'is_open'> & { deadline?: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  // Ensure the actor is faculty or admin to avoid opaque RLS errors
  const { data: profile, error: profErr } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profErr) throw profErr;
  if (profile?.role !== 'faculty' && profile?.role !== 'admin') {
    throw new Error('Only faculty or admin can create internship postings');
  }
  const payload = {
    title: post.title,
    company: post.company,
    role: post.role,
    duration: post.duration ?? null,
    eligibility: post.eligibility ?? null,
    description: post.description ?? null,
    deadline: post.deadline ?? null,
    created_by: user.id,
    is_open: true,
  };
  const { data, error } = await supabase.from('internships').insert(payload).select('*').single();
  if (error) {
    // Forward supabase error for richer context
    throw error;
  }
  return data as Internship;
}

export async function listInternships(openOnly = true) {
  const query = supabase.from('internships').select('*').order('created_at', { ascending: false });
  if (openOnly) query.eq('is_open', true);
  const { data, error } = await query;
  if (error) throw error;
  return data as Internship[];
}

export async function updateInternship(id: string, patch: Partial<Internship>) {
  const { data, error } = await supabase.from('internships').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Internship;
}

// Student: apply to faculty-posted internships
export async function applyToInternship(internshipId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const payload = { internship_id: internshipId, student_id: user.id };
  const { data, error } = await supabase.from('internship_applications').insert(payload).select('*').single();
  if (error) throw error;
  return data as InternshipApplication;
}

export async function listMyApplications() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase.from('internship_applications').select('*').eq('student_id', user.id).order('applied_at', { ascending: false });
  if (error) throw error;
  return data as InternshipApplication[];
}

export async function reviewApplication(id: string, status: ApplicationStatus, decision_reason?: string) {
  const patch: Partial<InternshipApplication> = { status, decision_reason: decision_reason ?? null, reviewed_at: new Date().toISOString() };
  const { data, error } = await supabase.from('internship_applications').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data as InternshipApplication;
}

// Student self-uploaded internships
export async function uploadStudentInternship(payload: Omit<StudentInternship, 'id' | 'status' | 'verified_by' | 'verified_at' | 'created_at' | 'updated_at' | 'student_id'> & { status?: InternshipStatus }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const insertPayload = { ...payload, student_id: user.id, status: payload.status ?? 'submitted' };
  const { data, error } = await supabase.from('student_internships').insert(insertPayload).select('*').single();
  if (error) throw error;
  return data as StudentInternship;
}

export async function listMyStudentInternships() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase.from('student_internships').select('*').eq('student_id', user.id).order('created_at', { ascending: false });
  if (error) throw error;
  return data as StudentInternship[];
}

export async function verifyStudentInternship(id: string, status: InternshipStatus) {
  const patch: Partial<StudentInternship> = { status, verified_at: new Date().toISOString() };
  const { data, error } = await supabase.from('student_internships').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data as StudentInternship;
}

// Documents
export async function addInternshipDocument(context: DocumentContext, ref_id: string, file: File, doc_type: DocumentType) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const filePath = `${user.id}/${crypto.randomUUID()}_${file.name}`;
  const { data: uploadRes, error: uploadErr } = await supabase.storage.from('internship_docs').upload(filePath, file, { upsert: false });
  if (uploadErr) throw uploadErr;
  const { data, error } = await supabase.from('internship_documents').insert({ context, ref_id, doc_type, storage_path: uploadRes.path, uploaded_by: user.id }).select('*').single();
  if (error) throw error;
  return data as InternshipDocument;
}

export async function listDocuments(context: DocumentContext, ref_id: string) {
  const { data, error } = await supabase.from('internship_documents').select('*').eq('context', context).eq('ref_id', ref_id).order('created_at', { ascending: false });
  if (error) throw error;
  return data as InternshipDocument[];
}

// Evaluations
export async function evaluateInternship(payload: Omit<Evaluation, 'id' | 'created_at' | 'evaluator_id'> & { internship_id?: string | null, student_internship_id?: string | null }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const insertPayload = { ...payload, evaluator_id: user.id };
  const { data, error } = await supabase.from('evaluations').insert(insertPayload).select('*').single();
  if (error) throw error;
  return data as Evaluation;
}

export async function listEvaluationsForStudent(studentId: string) {
  const { data, error } = await supabase.from('evaluations').select('*').eq('student_id', studentId).order('created_at', { ascending: false });
  if (error) throw error;
  return data as Evaluation[];
}

// Reporting Views
export async function getStudentParticipationSummary() {
  const { data, error } = await supabase.from('v_student_internship_participation').select('*');
  if (error) throw error;
  return data as any[];
}

export async function getYearwiseParticipation() {
  const { data, error } = await supabase.from('v_yearwise_internship_participation').select('*');
  if (error) throw error;
  return data as any[];
}

export async function getEvaluationDistributions() {
  const { data, error } = await supabase.from('v_evaluation_distributions').select('*');
  if (error) throw error;
  return data as any[];
}
