BEGIN;

-- ============================================================
-- Add Fraud Detection Columns to student_records
-- ============================================================
-- This migration adds fraud analysis columns to the student_records
-- table so that certificate uploads are analyzed for authenticity

-- Add fraud analysis columns to student_records
ALTER TABLE public.student_records
ADD COLUMN IF NOT EXISTS fraud_indicators jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS fraud_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS analysis_completed boolean DEFAULT false;

-- Comments
COMMENT ON COLUMN public.student_records.fraud_indicators IS 
'JSON object containing fraud analysis results including:
- creation_software: Software used to create the document
- modification_software: Software used to modify the document
- has_digital_signature: Whether document has a digital signature
- metadata_stripped: Whether metadata has been stripped
- multiple_modifications: Whether document was modified multiple times
- has_layers: Whether document contains layers (editing indicator)
- names_found: Names extracted from certificate text (OCR)
- name_match_score: Percentage match with student name (0-100)
- name_verification_status: verified|suspicious|mismatch|not_found
- text_anomalies: Array of detected text anomalies
- font_inconsistencies: Whether font inconsistencies detected
- text_confidence: OCR confidence percentage';

COMMENT ON COLUMN public.student_records.fraud_score IS 
'Risk score from 0–100 indicating likelihood of fraud (0=low risk, 100=critical risk)';

COMMENT ON COLUMN public.student_records.analysis_completed IS 
'Whether fraud analysis has been performed on the certificate';

-- ============================================================
-- Indexes for fraud detection queries
-- ============================================================

-- Index for finding high-risk submissions
CREATE INDEX IF NOT EXISTS idx_student_records_fraud_score 
ON public.student_records(fraud_score DESC) 
WHERE fraud_score > 40;

-- Index for pending submissions with fraud analysis
CREATE INDEX IF NOT EXISTS idx_student_records_pending_fraud 
ON public.student_records(fraud_score DESC, created_at DESC) 
WHERE status = 'pending';

COMMIT;
