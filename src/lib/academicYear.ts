import { AcademicYear, GraduationStatus, YearWiseStats, StudentRecord, Profile } from '@/types';
import { supabase } from './supabase';

/**
 * Calculate current academic year based on join date AND starting year (year_of_study from registration)
 * 
 * Example: If student registered as 3rd year in September 2025, and now it's February 2026:
 * - They are still in 3rd year (academic session hasn't changed yet)
 * 
 * If now it's September 2026:
 * - They are now in 4th year (1 year has passed since registration)
 * 
 * Academic year progression happens every June/July
 */
export function calculateAcademicYear(
  joinDate: string | Date | null | undefined,
  startingYear: number | null | undefined = 1
): AcademicYear {
  const effectiveStartYear = startingYear || 1;
  
  if (!joinDate) return effectiveStartYear as AcademicYear;
  
  const join = new Date(joinDate);
  const now = new Date();
  
  const joinMonth = join.getMonth() + 1; // 1-12
  const currentMonth = now.getMonth() + 1; // 1-12
  const joinYear = join.getFullYear();
  const currentYear = now.getFullYear();
  
  let yearsPassed: number;
  
  if (joinMonth >= 6) {
    // Joined in June-December (start of academic session)
    yearsPassed = currentYear - joinYear;
    if (currentMonth >= 6) {
      // New academic session has started
      yearsPassed += 1;
    }
  } else {
    // Joined in January-May (mid-session, same academic year)
    yearsPassed = currentYear - joinYear;
    if (currentMonth >= 6) {
      yearsPassed += 1;
    }
  }
  
  // Calculate current year by adding years passed to starting year
  // But for the first academic session (yearsPassed = 0), they are still in starting year
  const calculatedYear = effectiveStartYear + Math.max(0, yearsPassed - 1);
  
  // Clamp to starting_year to 4 range
  if (calculatedYear < effectiveStartYear) return effectiveStartYear as AcademicYear;
  if (calculatedYear > 4) return 4;
  
  return calculatedYear as AcademicYear;
}

/**
 * Get graduation status based on join date and starting year
 */
export function getGraduationStatus(
  joinDate: string | Date | null | undefined,
  startingYear: number | null | undefined = 1
): GraduationStatus {
  if (!joinDate) return 'Active';
  
  const effectiveStartYear = startingYear || 1;
  const yearsToGraduation = 5 - effectiveStartYear; // If start at 3rd year, 2 years to graduate
  
  const join = new Date(joinDate);
  const now = new Date();
  
  const yearsDiff = (now.getTime() - join.getTime()) / (1000 * 60 * 60 * 24 * 365);
  
  return yearsDiff >= yearsToGraduation ? 'Graduated' : 'Active';
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
 * Get batch label from join date (e.g., "2023 Batch")
 */
export function getBatchLabel(joinDate: string | Date | null | undefined): string {
  if (!joinDate) return 'Unknown Batch';
  const year = new Date(joinDate).getFullYear();
  return `${year} Batch`;
}

/**
 * Get batch year from join date
 */
export function getBatchYear(joinDate: string | Date | null | undefined): number | null {
  if (!joinDate) return null;
  return new Date(joinDate).getFullYear();
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
