import { AcademicYear, GraduationStatus, YearWiseStats, StudentRecord, Profile } from '@/types';
import { supabase } from './supabase';

/**
 * Academic year in B.Tech colleges starts in August.
 * Freshers (1st years) join between August-October each year.
 * 
 * Get the academic year start (e.g., 2025 for academic year 2025-26)
 */
export function getAcademicYearStart(date: Date = new Date()): number {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();
  
  // If month is August (8) or later, academic year started this year
  // If month is before August, we're still in the previous academic year
  return month >= 8 ? year : year - 1;
}

/**
 * Calculate batch year (passing out year) based on join date and year_of_study at registration
 * 
 * Examples:
 * - 1st year joins in Aug 2026 → Batch 2030 (2026 + 4 = 2030)
 * - 2nd year joins in Aug 2026 → Batch 2029 (2026 + 3 = 2029)
 * - 3rd year joins in Feb 2026 (academic year 2025-26) → Batch 2027 (2025 + 2 = 2027)
 * - 4th year joins in Aug 2026 → Batch 2027 (2026 + 1 = 2027)
 */
export function calculateBatchYear(
  joinDate: string | Date | null | undefined,
  yearOfStudyAtJoin: number | null | undefined = 1
): number {
  const effectiveYear = yearOfStudyAtJoin || 1;
  
  if (!joinDate) {
    // If no join date, assume current academic year
    return getAcademicYearStart() + (5 - effectiveYear);
  }
  
  const join = new Date(joinDate);
  const joinAcademicYearStart = getAcademicYearStart(join);
  
  // Batch year = join academic year + remaining years to graduate
  // If 1st year: 4 more years, if 2nd: 3 more years, etc.
  return joinAcademicYearStart + (5 - effectiveYear);
}

/**
 * Calculate current academic year (1st, 2nd, 3rd, 4th) based on batch year
 * 
 * Formula: current_year = starting_year + (current_academic_year_start - join_academic_year_start)
 * 
 * Example: Student joined as 3rd year in Feb 2026 (academic year 2025-26), checking in Sep 2026:
 * - join_academic_year_start = 2025
 * - current_academic_year_start = 2026
 * - current_year = 3 + (2026 - 2025) = 4
 */
export function calculateAcademicYear(
  joinDate: string | Date | null | undefined,
  startingYear: number | null | undefined = 1
): AcademicYear {
  const effectiveStartYear = startingYear || 1;
  
  if (!joinDate) return effectiveStartYear as AcademicYear;
  
  const join = new Date(joinDate);
  const now = new Date();
  
  const joinAcademicYearStart = getAcademicYearStart(join);
  const currentAcademicYearStart = getAcademicYearStart(now);
  
  // Calculate current year of study
  const yearsPassed = currentAcademicYearStart - joinAcademicYearStart;
  const currentYear = effectiveStartYear + yearsPassed;
  
  // Clamp between starting year and 4
  if (currentYear < effectiveStartYear) return effectiveStartYear as AcademicYear;
  if (currentYear > 4) return 4;
  
  return currentYear as AcademicYear;
}

/**
 * Get graduation status based on batch year
 */
export function getGraduationStatus(
  joinDate: string | Date | null | undefined,
  startingYear: number | null | undefined = 1
): GraduationStatus {
  if (!joinDate) return 'Active';
  
  const batchYear = calculateBatchYear(joinDate, startingYear);
  const now = new Date();
  const currentAcademicYearStart = getAcademicYearStart(now);
  
  // If current academic year has passed the batch year, student has graduated
  return currentAcademicYearStart >= batchYear ? 'Graduated' : 'Active';
}

/**
 * Get academic year label (e.g., "1st Year", "2nd Year")
 */
export function getAcademicYearLabel(year: AcademicYear | number): string {
  const suffixes: Record<number, string> = {
    1: '1st Year',
    2: '2nd Year',
    3: '3rd Year',
    4: '4th Year',
  };
  return suffixes[year] || `Year ${year}`;
}

/**
 * Get batch label from join date and year_of_study (e.g., "Batch 2030")
 * This shows the passing out year, not the joining year
 */
export function getBatchLabel(
  joinDate: string | Date | null | undefined,
  yearOfStudyAtJoin: number | null | undefined = 1
): string {
  const batchYear = calculateBatchYear(joinDate, yearOfStudyAtJoin);
  return `Batch ${batchYear}`;
}

/**
 * Get batch year (passing out year) - exposed for direct use
 */
export function getBatchYear(
  joinDate: string | Date | null | undefined,
  yearOfStudyAtJoin: number | null | undefined = 1
): number {
  return calculateBatchYear(joinDate, yearOfStudyAtJoin);
}

/**
 * Group records by academic year
 */
export function groupRecordsByYear(records: StudentRecord[]): Record<AcademicYear, StudentRecord[]> {
  const grouped: Record<AcademicYear, StudentRecord[]> = {
    1: [],
    2: [],
    3: [],
    4: [],
  };
  
  records.forEach((record) => {
    const year = (record.academic_year || 1) as AcademicYear;
    if (grouped[year]) {
      grouped[year].push(record);
    }
  });
  
  return grouped;
}

/**
 * Calculate year-wise statistics from records
 */
export function calculateYearWiseStats(records: StudentRecord[]): YearWiseStats[] {
  const stats: Record<number, YearWiseStats> = {};
  
  records.forEach((record) => {
    const year = record.academic_year || 1;
    
    if (!stats[year]) {
      stats[year] = {
        academic_year: year as AcademicYear,
        total_submissions: 0,
        pending_count: 0,
        approved_count: 0,
        rejected_count: 0,
      };
    }
    
    stats[year].total_submissions++;
    
    if (record.status === 'pending') {
      stats[year].pending_count++;
    } else if (record.status === 'approved') {
      stats[year].approved_count++;
    } else if (record.status === 'rejected') {
      stats[year].rejected_count++;
    }
  });
  
  // Return sorted by year
  return Object.values(stats).sort((a, b) => a.academic_year - b.academic_year);
}

/**
 * Get student records filtered by academic year
 */
export async function fetchStudentRecordsByYear(
  studentId: string,
  academicYear?: AcademicYear | null
): Promise<StudentRecord[]> {
  let query = supabase
    .from('student_records')
    .select('*')
    .eq('student_id', studentId);
  
  if (academicYear) {
    query = query.eq('academic_year', academicYear);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching records by year:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Get year-wise stats from database
 */
export async function fetchYearWiseStats(studentId: string): Promise<YearWiseStats[]> {
  const { data, error } = await supabase.rpc('get_student_year_wise_stats', {
    p_student_id: studentId,
  });
  
  if (error) {
    console.error('Error fetching year-wise stats:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Get faculty filtered records
 */
export async function fetchFacultyFilteredRecords(
  facultyId: string,
  options?: {
    department?: string | null;
    academicYear?: AcademicYear | null;
    batchYear?: number | null;
  }
) {
  const { data, error } = await supabase.rpc('get_faculty_filtered_records', {
    p_faculty_id: facultyId,
    p_department: options?.department || null,
    p_academic_year: options?.academicYear || null,
    p_batch_year: options?.batchYear || null,
  });
  
  if (error) {
    console.error('Error fetching faculty filtered records:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Get unique batch years for filtering
 */
export async function fetchUniqueBatchYears(): Promise<number[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('batch_year')
    .eq('role', 'student')
    .not('batch_year', 'is', null);
  
  if (error) {
    console.error('Error fetching batch years:', error);
    return [];
  }
  
  const uniqueYears = [...new Set(data?.map(d => d.batch_year).filter(Boolean))];
  return uniqueYears.sort((a, b) => (b || 0) - (a || 0));
}

/**
 * Get unique departments for filtering
 */
export async function fetchUniqueDepartments(): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('department')
    .eq('role', 'student')
    .not('department', 'is', null);
  
  if (error) {
    console.error('Error fetching departments:', error);
    return [];
  }
  
  const uniqueDepts = [...new Set(data?.map(d => d.department).filter(Boolean))] as string[];
  return uniqueDepts.sort();
}

/**
 * Enhance profile with calculated academic year
 */
export function enhanceProfileWithAcademicYear(profile: Profile): Profile & {
  current_academic_year: AcademicYear;
  graduation_status: GraduationStatus;
} {
  return {
    ...profile,
    current_academic_year: calculateAcademicYear(profile.join_date, profile.year_of_study),
    graduation_status: getGraduationStatus(profile.join_date, profile.year_of_study),
  };
}

/**
 * Get available academic years for a student based on their starting year
 * If student joined in 3rd year, returns [3, 4]
 * If student joined in 1st year, returns [1, 2, 3, 4]
 */
export function getAvailableAcademicYears(startingYear: number | null | undefined): AcademicYear[] {
  const effectiveStartYear = startingYear || 1;
  const years: AcademicYear[] = [];
  
  for (let y = effectiveStartYear; y <= 4; y++) {
    years.push(y as AcademicYear);
  }
  
  return years;
}

/**
 * Get academic year filter options for a student based on their starting year
 * If student joined in 3rd year, returns ['all', 3, 4]
 */
export function getAcademicYearFilterOptions(startingYear: number | null | undefined): { value: AcademicYear | 'all'; label: string }[] {
  const availableYears = getAvailableAcademicYears(startingYear);
  
  return [
    { value: 'all', label: 'All Years' },
    ...availableYears.map(year => ({
      value: year,
      label: getAcademicYearLabel(year),
    })),
  ];
}

/**
 * Default academic year options for filters (all years)
 * Use getAcademicYearFilterOptions() for student-specific filters
 */
export const ACADEMIC_YEAR_OPTIONS: { value: AcademicYear | 'all'; label: string }[] = [
  { value: 'all', label: 'All Years' },
  { value: 1, label: '1st Year' },
  { value: 2, label: '2nd Year' },
  { value: 3, label: '3rd Year' },
  { value: 4, label: '4th Year' },
];
