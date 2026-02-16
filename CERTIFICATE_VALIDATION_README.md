# Certificate Validation and Fake Detection System

A comprehensive system for issuing, storing, and validating certificates with tamper detection capabilities.

## Overview

The Certificate Validation System provides a secure way to:
- Issue certificates with unique codes
- Store certificates securely with file hash
- Validate certificates by code
- Detect tampered or fake certificates

## Features

### 1. Certificate Issuance
Faculty and Admins can issue certificates through the Certificates tab in their dashboard.

**Process:**
1. Click "Issue Certificate" button
2. Select or enter recipient name
3. Enter certificate title and description
4. Set issue date
5. Upload certificate file (PDF, PNG, or JPEG)
6. System automatically generates:
   - Unique certificate code (e.g., `CERT-2026-000001`)
   - SHA-256 hash of the file

### 2. Certificate Validation
Anyone can verify certificates through the public verification page at `/verify-certificate`.

**Verification Methods:**
1. **By Code Only**: Enter certificate code to verify it exists
2. **With File Verification**: Upload the certificate file to check for tampering

### 3. Validation Results

| Status | Description |
|--------|-------------|
| **VALID** | Certificate code exists AND file hash matches (if file provided) |
| **FAKE** | Certificate code does not exist in the system |
| **TAMPERED** | Certificate code exists BUT file hash doesn't match |

## Database Structure

### certificates
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| certificate_code | TEXT | Unique code (CERT-YYYY-NNNNNN) |
| recipient_name | TEXT | Name of certificate recipient |
| recipient_id | UUID | Optional link to profiles |
| issuer | TEXT | Name of issuer |
| issuer_id | UUID | ID of issuing faculty/admin |
| issue_date | DATE | Date of issuance |
| title | TEXT | Certificate title |
| description | TEXT | Optional description |
| file_url | TEXT | URL to stored file |
| file_hash | TEXT | SHA-256 hash of file |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### certificate_validation_logs
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| certificate_code | TEXT | Code being validated |
| uploaded_file_hash | TEXT | Hash of uploaded file (if any) |
| validation_status | ENUM | valid/fake/tampered |
| validated_by | UUID | User who validated (if logged in) |
| ip_address | TEXT | IP of validator |
| user_agent | TEXT | Browser info |
| created_at | TIMESTAMPTZ | Validation timestamp |

## Access Control

| Role | Permissions |
|------|-------------|
| **Student** | View own certificates (if recipient) |
| **Faculty** | Issue certificates, view own issued, view validation logs |
| **Admin** | All permissions + delete certificates, view all certificates |
| **Public** | Validate certificates via verification page |

## Technical Implementation

### File Hashing
Uses Web Crypto API for SHA-256 hashing:
```typescript
const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
```

### Certificate Code Generation
Generated server-side using PostgreSQL sequence:
```sql
'CERT-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('certificate_code_seq')::text, 6, '0')
```

## Usage

### For Faculty/Admin

1. Navigate to Dashboard → Certificates tab
2. Click "Issue Certificate"
3. Fill in recipient details
4. Upload the certificate file
5. Submit to generate code and store

### For Verification

1. Go to `/verify-certificate` or click "Verify Certificate" in navbar
2. Enter the certificate code
3. Optionally upload the certificate file for tampering detection
4. View the validation result

## API Functions

```typescript
// Issue a new certificate
await issueCertificate({
  recipientName: "John Doe",
  recipientId: "uuid-optional",
  issuer: "Dr. Smith",
  issuerId: "uuid",
  issueDate: "2026-02-15",
  title: "Certificate of Excellence",
  description: "For outstanding performance",
  file: File
});

// Validate by code only
const result = await validateCertificateByCode(code, userId);

// Validate with file
const result = await validateCertificateWithFile(code, file, userId);

// Get statistics
const stats = await getCertificateStats();
```

## Statistics Dashboard

Faculty and Admin can view:
- Total certificates issued
- Valid verifications count
- Fake detection count
- Tampered detection count
- Recent validation activity (7 days)
- Fraud detection rate

## Security Features

1. **SHA-256 Hashing**: Cryptographic hash ensures file integrity
2. **Unique Codes**: Sequentially generated to prevent guessing
3. **RLS Policies**: Row-level security in Supabase
4. **Validation Logging**: All validation attempts are logged
5. **Secure Storage**: Files stored in Supabase storage with policies
