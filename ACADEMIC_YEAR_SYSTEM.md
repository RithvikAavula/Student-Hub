# Academic Year Progression System

## Overview

This document explains the dynamic academic year progression and historical submissions system implemented in the Student Certificate Platform.

## Core Concepts

### 1. Academic Year Calculation (B.Tech Convention)

In B.Tech colleges, the academic year starts in **August** (freshers join between August-October).

The academic year is **dynamically calculated** based on:
- **`year_of_study`**: The year the student registered as (1st, 2nd, 3rd, or 4th year)
- **`join_date`**: When the student enrolled in the system
- **Current date**: To determine progression since joining

**Key Feature**: Students who join as 3rd year (lateral entry, transfer students, etc.) will only see 3rd and 4th year filters. They won't see 1st and 2nd year options since those don't apply to them.

**Academic Year Start:**
- Month >= August (8): Academic year = current calendar year
- Month < August: Academic year = previous calendar year
- Example: September 2026 = Academic year 2026-27, February 2026 = Academic year 2025-26

**Current Year Formula:**
```
current_year = starting_year + (current_academic_year_start - join_academic_year_start)
```
- Minimum academic year = `year_of_study` (starting year)
- Maximum academic year = 4 (capped)
- After completing 4th year, student status becomes "Graduated"

### 2. Batch Year (Passing Out Year)

The **batch year** represents the year the student will graduate, not when they joined.

**Batch Year Formula:**
```
batch_year = join_academic_year_start + (5 - year_of_study_at_join)
```

**Examples:**
- 1st year joins Aug 2026 → Batch 2030 (2026 + 4)
- 2nd year joins Aug 2026 → Batch 2029 (2026 + 3)
- 3rd year joins Feb 2026 (academic year 2025) → Batch 2027 (2025 + 2)
- 4th year joins Aug 2026 → Batch 2027 (2026 + 1)

**Example 1 (Fresh student):**
- Student registers as: 1st Year
- Student joins: September 2026
- Batch: 2030 (passing out year)
- Current date: February 2028 (academic year 2027-28)
- Calculated Academic Year: 2nd Year (1 + (2027 - 2026) = 2)
- Available filters: 1st, 2nd, 3rd, 4th Year

**Example 2 (Lateral entry):**
- Student registers as: 3rd Year
- Student joins: September 2025
- Batch: 2027 (passing out year)
- Current date: February 2027 (academic year 2026-27)
- Calculated Academic Year: 4th Year (3 + (2026 - 2025) = 4)
- Available filters: 3rd, 4th Year only

### 3. Data Immutability

Once a certificate/submission is created, its `academic_year` field is:
- **Set automatically** by a database trigger
- **Immutable** - cannot be changed after creation
- **Historical** - remains permanently even when student progresses to next year

This ensures:
- Old submissions retain their original academic year
- No data loss during year transitions
- Complete historical tracking

## Database Schema Changes

### Profiles Table Additions

```sql
-- Added columns
join_date DATE DEFAULT CURRENT_DATE
batch_year INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM join_date)) STORED
year_of_study INTEGER CHECK (year_of_study BETWEEN 1 AND 4)

-- join_date: When the student enrolled
-- batch_year: Auto-calculated for filtering (e.g., 2023 batch)
-- year_of_study: The year the student registered as (starting year)
```

### Student Records Table Additions

```sql
-- Added column
academic_year INTEGER DEFAULT 1 CHECK (academic_year BETWEEN 1 AND 4)

-- Stores the academic year at time of submission
-- Immutable after creation
```

## Key Database Functions

### 1. `calculate_academic_year(join_date, starting_year)`
Returns the current academic year (starting_year to 4) based on join date and starting year.
- `starting_year` defaults to 1 if not provided
- Returns minimum of `starting_year` and maximum of 4

### 2. `get_graduation_status(join_date)`
Returns "Active" or "Graduated" status.

### 3. `get_student_records_by_academic_year(student_id, year)`
Retrieves records filtered by academic year.

### 4. `get_student_year_wise_stats(student_id)`
Returns aggregated statistics per academic year.

### 5. `get_faculty_filtered_records(faculty_id, department, year, batch)`
Returns filtered records for faculty with multiple filter options.

## Automatic Triggers

### On Record Insert
`trg_set_submission_academic_year` automatically:
1. Looks up student's join_date and year_of_study
2. Calculates current academic year (from starting year onwards)
3. Sets academic_year on the new record

### On Record Update (Prevention)
`trg_prevent_academic_year_update` prevents:
- Any modification to academic_year after initial creation
- Ensures data integrity

## Frontend Implementation

### Student View

**RecordsTab.tsx:**
- Displays current academic year prominently
- Year-wise filter buttons (shows only available years based on starting year)
- Year-wise statistics summary (filtered for available years)
- Academic year badge on each record card

**StudentProfile.tsx:**
- Shows calculated academic year
- Displays batch information
- Shows graduation status

### Faculty View

**StudentSubmissionsTab.tsx:**
- Filter by batch year (2023, 2024, etc.)
- Filter by academic year when viewing a student
- Academic year badges on all record cards
- Year-wise statistics for each student

### Dialogs

**AddRecordDialog.tsx:**
- Shows which academic year the submission will be recorded under
- Informs student that the year is permanent

**RecordDetailsDialog.tsx & ReviewRecordDialog.tsx:**
- Display academic year badge
- Show historical context

## Data Flow

### Certificate Upload Flow

```
1. Student clicks "Add Record"
2. Dialog shows current academic year (calculated from join_date)
3. Student fills form and submits
4. Backend trigger fires:
   a. Looks up student's join_date from profiles
   b. Calculates academic year using calculate_academic_year()
   c. Sets academic_year on the record
5. Record is created with immutable academic_year
```

### Year Progression Flow

```
1. Time passes (new academic session starts in June)
2. No manual updates needed
3. calculate_academic_year() now returns higher value
4. All NEW submissions get the new academic year
5. Old submissions retain their original academic year
6. Student sees both current year and historical submissions
```

### Faculty Review Flow

```
1. Faculty opens Student Submissions tab
2. Sees all assigned students with current academic year
3. Clicks on a student
4. Sees year-wise filter buttons
5. Can filter by:
   - Academic year (1st, 2nd, 3rd, 4th, All)
   - Category
6. Reviews records with full historical context
```

## Type Definitions

```typescript
// Academic year type (1-4)
type AcademicYear = 1 | 2 | 3 | 4;

// Graduation status
type GraduationStatus = 'Active' | 'Graduated';

// Extended profile with academic info
interface Profile {
  // ... existing fields
  join_date?: string;
  batch_year?: number;
  current_academic_year?: AcademicYear;
  graduation_status?: GraduationStatus;
}

// Extended record with academic year
interface StudentRecord {
  // ... existing fields
  academic_year?: AcademicYear;
}

// Year-wise statistics
interface YearWiseStats {
  academic_year: AcademicYear;
  total_submissions: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
}
```

## Utility Functions (lib/academicYear.ts)

| Function | Description |
|----------|-------------|
| `getAcademicYearStart(date)` | Get academic year start (August-based) |
| `calculateBatchYear(joinDate, yearOfStudy)` | Calculate batch/passing out year |
| `calculateAcademicYear(joinDate, yearOfStudy)` | Calculate current academic year |
| `getGraduationStatus(joinDate, yearOfStudy)` | Get Active/Graduated status |
| `getAcademicYearLabel(year)` | Get label like "1st Year" |
| `getBatchLabel(joinDate, yearOfStudy)` | Get label like "Batch 2030" (passing out year) |
| `getBatchYear(joinDate, yearOfStudy)` | Get batch year as number |
| `groupRecordsByYear(records)` | Group records by academic year |
| `calculateYearWiseStats(records)` | Calculate statistics per year |
| `fetchStudentRecordsByYear()` | Query records by year |
| `fetchYearWiseStats()` | Query aggregated stats |
| `fetchFacultyFilteredRecords()` | Query with faculty filters |
| `ACADEMIC_YEAR_OPTIONS` | Filter options array |

## Filter Options Available

### Student Dashboard
- Academic Year: All Years, 1st, 2nd, 3rd, 4th
- Category: All, Academic, Technical, Sports, Cultural, Social, Other

### Faculty Dashboard (Student List)
- Year of Study: All, 1-4
- Section: All, A, B, C...
- Batch: All, 2023, 2024...

### Faculty Dashboard (Individual Student)
- Academic Year: All Years, 1st, 2nd, 3rd, 4th
- Category: All, Academic, Technical, Sports, Cultural, Social, Other

## Migration Notes

When running the migration `20260214_academic_year_progression.sql`:

1. **New columns are added** to existing tables
2. **Existing records** are updated with estimated academic year
3. **Triggers** ensure future records are correctly tagged
4. **Views** provide convenient querying

## Scaling Considerations

The system naturally scales for:
- **Multiple batches**: Each batch identified by join_date/batch_year
- **Historical data**: All years preserved indefinitely
- **Performance**: Indexed on academic_year for fast queries
- **Data integrity**: Triggers prevent accidental modification

## Common Queries

### Get student's current academic year
```sql
SELECT calculate_academic_year(join_date) 
FROM profiles 
WHERE id = 'student-uuid';
```

### Get all submissions for 2nd year
```sql
SELECT * FROM student_records 
WHERE student_id = 'student-uuid' 
AND academic_year = 2;
```

### Get year-wise breakdown
```sql
SELECT * FROM get_student_year_wise_stats('student-uuid');
```

### Faculty filtered view
```sql
SELECT * FROM get_faculty_filtered_records(
  'faculty-uuid', 
  'Computer Science',  -- department
  2,                   -- academic year
  2023                 -- batch year
);
```
