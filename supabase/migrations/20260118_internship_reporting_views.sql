-- Internship Reporting & Analytics Views
-- Created on 2026-01-18
BEGIN;

-- Student-wise participation summary across applications and self-uploads
CREATE OR REPLACE VIEW public.v_student_internship_participation AS
SELECT
  p.id AS student_id,
  p.full_name,
  p.department,
  -- applications
  COUNT(*) FILTER (WHERE a.status = 'applied')                AS applications_applied,
  COUNT(*) FILTER (WHERE a.status = 'under_review')           AS applications_under_review,
  COUNT(*) FILTER (WHERE a.status = 'accepted')               AS applications_accepted,
  COUNT(*) FILTER (WHERE a.status = 'rejected')               AS applications_rejected,
  COUNT(*) FILTER (WHERE a.status = 'withdrawn')              AS applications_withdrawn,
  -- self uploads
  COUNT(*) FILTER (WHERE si.status = 'submitted')             AS self_submitted,
  COUNT(*) FILTER (WHERE si.status = 'under_review')          AS self_under_review,
  COUNT(*) FILTER (WHERE si.status = 'approved')              AS self_approved,
  COUNT(*) FILTER (WHERE si.status = 'rejected')              AS self_rejected,
  COUNT(*) FILTER (WHERE si.status = 'completed')             AS self_completed
FROM public.profiles p
LEFT JOIN public.internship_applications a ON a.student_id = p.id
LEFT JOIN public.student_internships si ON si.student_id = p.id
WHERE p.role = 'student'
GROUP BY p.id, p.full_name, p.department;

-- Year-wise internship participation combining applications (applied_at) and self-uploads (start_date)
CREATE OR REPLACE VIEW public.v_yearwise_internship_participation AS
SELECT
  year,
  COUNT(*) FILTER (WHERE source = 'application')   AS applications_count,
  COUNT(*) FILTER (WHERE source = 'self')          AS self_uploads_count
FROM (
  SELECT date_part('year', a.applied_at)::int AS year, 'application'::text AS source
  FROM public.internship_applications a
  UNION ALL
  SELECT COALESCE(date_part('year', si.start_date), date_part('year', si.created_at))::int AS year, 'self'::text AS source
  FROM public.student_internships si
) t
GROUP BY year
ORDER BY year DESC;

-- Evaluation distributions by department: avg score and grade counts
CREATE OR REPLACE VIEW public.v_evaluation_distributions AS
SELECT
  p.department,
  ROUND(AVG(e.score)::numeric, 2) AS avg_score,
  COUNT(*) FILTER (WHERE e.grade ILIKE 'A%') AS grade_a_count,
  COUNT(*) FILTER (WHERE e.grade ILIKE 'B%') AS grade_b_count,
  COUNT(*) FILTER (WHERE e.grade ILIKE 'C%') AS grade_c_count,
  COUNT(*) FILTER (WHERE e.grade ILIKE 'D%') AS grade_d_count,
  COUNT(*) FILTER (WHERE e.grade ILIKE 'F%') AS grade_f_count,
  COUNT(*) AS total_evaluations
FROM public.evaluations e
JOIN public.profiles p ON p.id = e.student_id
GROUP BY p.department
ORDER BY p.department;

COMMIT;
