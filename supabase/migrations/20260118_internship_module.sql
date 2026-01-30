-- Internship Management and Evaluation System
-- Created on 2026-01-18
BEGIN;

-- ENUM types
CREATE TYPE public.internship_status AS ENUM ('submitted','under_review','approved','rejected','completed');
CREATE TYPE public.application_status AS ENUM ('applied','under_review','accepted','rejected','withdrawn');
CREATE TYPE public.document_type AS ENUM ('offer_letter','completion_certificate','report','other');
CREATE TYPE public.document_context AS ENUM ('application','student_internship','evaluation');

-- Core tables
CREATE TABLE public.internships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title text NOT NULL,
  company text NOT NULL,
  role text NOT NULL,
  duration text,
  eligibility text,
  description text,
  deadline date,
  is_open boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.internship_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id uuid NOT NULL REFERENCES public.internships(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status public.application_status NOT NULL DEFAULT 'applied',
  applied_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  decision_reason text,
  CONSTRAINT uq_application UNIQUE (internship_id, student_id)
);

CREATE TABLE public.student_internships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  company text NOT NULL,
  role text NOT NULL,
  duration text,
  description text,
  start_date date,
  end_date date,
  external_url text,
  status public.internship_status NOT NULL DEFAULT 'submitted',
  verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.internship_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  context public.document_context NOT NULL,
  ref_id uuid NOT NULL,
  doc_type public.document_type NOT NULL,
  storage_path text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Optional: reference integrity checks for internship_documents
-- (We keep it flexible; enforcement done by application logic + RLS policies.)

CREATE TABLE public.evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id uuid REFERENCES public.internships(id) ON DELETE SET NULL,
  student_internship_id uuid REFERENCES public.student_internships(id) ON DELETE SET NULL,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  evaluator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  score numeric(5,2),
  grade text,
  feedback text,
  completion_status boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_source_check CHECK (
    (internship_id IS NOT NULL AND student_internship_id IS NULL)
    OR (internship_id IS NULL AND student_internship_id IS NOT NULL)
  )
);

CREATE TABLE public.approval_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  entity text NOT NULL CHECK (entity IN ('internship_post','application','student_internship','document','evaluation')),
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('submitted','under_review','approved','rejected','closed','completed','posted','applied','verified','evaluated','uploaded')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_internships_created_by ON public.internships(created_by);
CREATE INDEX IF NOT EXISTS idx_applications_internship ON public.internship_applications(internship_id);
CREATE INDEX IF NOT EXISTS idx_applications_student ON public.internship_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_student_internships_student ON public.student_internships(student_id);
CREATE INDEX IF NOT EXISTS idx_documents_ref ON public.internship_documents(ref_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_student ON public.evaluations(student_id);
CREATE INDEX IF NOT EXISTS idx_approval_logs_entity ON public.approval_logs(entity, entity_id);

-- Storage bucket for internship documents (private)
SELECT storage.create_bucket('internship_docs', public := false);

-- Row Level Security
ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internship_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internship_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_logs ENABLE ROW LEVEL SECURITY;

-- Helper predicates for role checks (policies will use EXISTS against profiles)
-- Policies for internships
CREATE POLICY internships_select_all
  ON public.internships FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY internships_insert_faculty
  ON public.internships FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'faculty'
    )
  );

CREATE POLICY internships_update_owner
  ON public.internships FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY internships_admin_all
  ON public.internships FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Policies for internship_applications
CREATE POLICY applications_select_student_or_owner
  ON public.internship_applications FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.internships i WHERE i.id = internship_id AND i.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.faculty_assignments fa WHERE fa.student_id = internship_applications.student_id AND fa.faculty_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY applications_insert_students
  ON public.internship_applications FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY applications_update_faculty_owner_or_assigned
  ON public.internship_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.internships i WHERE i.id = internship_id AND i.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.faculty_assignments fa WHERE fa.student_id = internship_applications.student_id AND fa.faculty_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.internships i WHERE i.id = internship_id AND i.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.faculty_assignments fa WHERE fa.student_id = internship_applications.student_id AND fa.faculty_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Policies for student_internships
CREATE POLICY student_internships_select_student_or_assigned
  ON public.student_internships FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.faculty_assignments fa WHERE fa.student_id = public.student_internships.student_id AND fa.faculty_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY student_internships_insert_students
  ON public.student_internships FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY student_internships_update_student_or_assigned_faculty
  ON public.student_internships FOR UPDATE
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.faculty_assignments fa WHERE fa.student_id = public.student_internships.student_id AND fa.faculty_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.faculty_assignments fa WHERE fa.student_id = public.student_internships.student_id AND fa.faculty_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Policies for internship_documents
CREATE POLICY internship_documents_select_owners_faculty_admin
  ON public.internship_documents FOR SELECT
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.internship_applications a
      JOIN public.internships i ON i.id = a.internship_id
      WHERE internship_documents.context = 'application' AND internship_documents.ref_id = a.id
        AND (i.created_by = auth.uid() OR EXISTS (
          SELECT 1 FROM public.faculty_assignments fa WHERE fa.student_id = a.student_id AND fa.faculty_id = auth.uid()
        ))
    )
    OR EXISTS (
      SELECT 1 FROM public.student_internships si
      WHERE internship_documents.context = 'student_internship' AND internship_documents.ref_id = si.id
        AND EXISTS (
          SELECT 1 FROM public.faculty_assignments fa WHERE fa.student_id = si.student_id AND fa.faculty_id = auth.uid()
        )
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY internship_documents_insert_owner
  ON public.internship_documents FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY internship_documents_update_owner_admin
  ON public.internship_documents FOR UPDATE
  TO authenticated
  USING (uploaded_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (uploaded_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY internship_documents_delete_owner_admin
  ON public.internship_documents FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Policies for evaluations
CREATE POLICY evaluations_select_student_faculty_admin
  ON public.evaluations FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR evaluator_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.faculty_assignments fa WHERE fa.student_id = public.evaluations.student_id AND fa.faculty_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY evaluations_insert_faculty
  ON public.evaluations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'faculty')
    AND evaluator_id = auth.uid()
  );

CREATE POLICY evaluations_update_faculty_admin
  ON public.evaluations FOR UPDATE
  TO authenticated
  USING (evaluator_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (evaluator_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Policies for approval_logs (read own/related, write by faculty/admin)
CREATE POLICY approval_logs_select_related
  ON public.approval_logs FOR SELECT
  TO authenticated
  USING (
    actor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.internship_applications a
      WHERE approval_logs.entity = 'application' AND approval_logs.entity_id = a.id AND a.student_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.student_internships si
      WHERE approval_logs.entity = 'student_internship' AND approval_logs.entity_id = si.id AND si.student_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY approval_logs_insert_faculty_admin
  ON public.approval_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.role = 'faculty' OR p.role = 'admin'))
    AND actor_id = auth.uid()
  );

-- Storage object policies scoped to internship_docs bucket
-- Allow authenticated users to upload files to the internship_docs bucket under any path; app links via internship_documents.
CREATE POLICY "upload internship docs (owner)"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = (SELECT id FROM storage.buckets WHERE name = 'internship_docs')
    AND owner = auth.uid()
  );

-- Allow select if owner or document record grants access
CREATE POLICY "read internship docs via document link or owner"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = (SELECT id FROM storage.buckets WHERE name = 'internship_docs')
    AND (
      owner = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.internship_documents d
        WHERE d.storage_path = storage.objects.name
          AND (
            d.uploaded_by = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.internship_applications a JOIN public.internships i ON i.id = a.internship_id
              WHERE d.context = 'application' AND d.ref_id = a.id AND (i.created_by = auth.uid() OR EXISTS (
                SELECT 1 FROM public.faculty_assignments fa WHERE fa.student_id = a.student_id AND fa.faculty_id = auth.uid()
              ))
            )
            OR EXISTS (
              SELECT 1 FROM public.student_internships si
              WHERE d.context = 'student_internship' AND d.ref_id = si.id AND EXISTS (
                SELECT 1 FROM public.faculty_assignments fa WHERE fa.student_id = si.student_id AND fa.faculty_id = auth.uid()
              )
            )
            OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
          )
      )
    )
  );

-- Allow update/delete only by owner
CREATE POLICY "update internship docs (owner)"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = (SELECT id FROM storage.buckets WHERE name = 'internship_docs')
    AND owner = auth.uid()
  )
  WITH CHECK (owner = auth.uid());

CREATE POLICY "delete internship docs (owner)"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = (SELECT id FROM storage.buckets WHERE name = 'internship_docs')
    AND owner = auth.uid()
  );

COMMIT;