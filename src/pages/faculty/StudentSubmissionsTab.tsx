import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Profile, StudentRecord } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, FileText, Award, User, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/features/StatusBadge';
import CategoryBadge from '@/components/features/CategoryBadge';
import ReviewRecordDialog from '@/components/features/ReviewRecordDialog';

interface RecordWithStudent extends StudentRecord {
  student?: Profile;
}

interface StudentWithRecordCount extends Profile {
  recordCount: number;
  pendingCount: number;
}

export default function StudentSubmissionsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentWithRecordCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);
  const [studentRecords, setStudentRecords] = useState<RecordWithStudent[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RecordWithStudent | null>(null);
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');

  useEffect(() => {
    fetchStudentsWithSubmissions();
  }, [user]);

  const fetchStudentsWithSubmissions = async () => {
    try {
      // Get assigned student IDs
      const { data: assignments, error: assignError } = await supabase
        .from('faculty_assignments')
        .select('student_id')
        .eq('faculty_id', user?.id);

      if (assignError) throw assignError;

      const studentIds = assignments?.map((a) => a.student_id) || [];

      if (studentIds.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // Get student profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', studentIds)
        .order('full_name');

      if (profileError) throw profileError;

      // Get all records for these students to compute counts
      const { data: records, error: recordError } = await supabase
        .from('student_records')
        .select('student_id, status')
        .in('student_id', studentIds);

      if (recordError) throw recordError;

      console.debug('[StudentSubmissionsTab] records count for students', { count: (records || []).length });

      // Count records per student
      const countMap: Record<string, { total: number; pending: number }> = {};
      (records || []).forEach((r) => {
        if (!countMap[r.student_id]) {
          countMap[r.student_id] = { total: 0, pending: 0 };
        }
        countMap[r.student_id].total++;
        if (r.status === 'pending') {
          countMap[r.student_id].pending++;
        }
      });

      const studentsWithCounts: StudentWithRecordCount[] = (profiles || []).map((p) => ({
        ...p,
        recordCount: countMap[p.id]?.total || 0,
        pendingCount: countMap[p.id]?.pending || 0,
      }));

      // Sort by pending count descending, then by name
      studentsWithCounts.sort((a, b) => {
        if (b.pendingCount !== a.pendingCount) return b.pendingCount - a.pendingCount;
        return (a.full_name || '').localeCompare(b.full_name || '');
      });

      setStudents(studentsWithCounts);
    } catch (error: any) {
      toast({
        title: 'Error fetching students',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentRecords = async (studentId: string) => {
    setLoadingRecords(true);
    try {
      const { data, error } = await supabase
        .from('student_records')
        .select(`
          *,
          student:profiles!student_records_student_id_fkey(*)
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudentRecords(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching records',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleStudentClick = (student: StudentWithRecordCount) => {
    setSelectedStudent(student);
    fetchStudentRecords(student.id);
  };

  const handleBack = () => {
    setSelectedStudent(null);
    setStudentRecords([]);
    // Refresh counts in case records were reviewed
    fetchStudentsWithSubmissions();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading students...</div>
      </div>
    );
  }

  // Show individual student's submissions
  if (selectedStudent) {
    const pendingRecords = studentRecords.filter((r) => r.status === 'pending');
    const approvedRecords = studentRecords.filter((r) => r.status === 'approved');
    const rejectedRecords = studentRecords.filter((r) => r.status === 'rejected');

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Students
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-2xl font-semibold">{selectedStudent.full_name}</h3>
            <p className="text-sm text-muted-foreground">
              {selectedStudent.student_id} • {selectedStudent.department || 'No Department'}
              {selectedStudent.year_of_study && ` • Year ${selectedStudent.year_of_study}`}
            </p>
            <p className="text-sm text-muted-foreground">{selectedStudent.email}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingRecords.length}</p>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Award className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{approvedRecords.length}</p>
                  <p className="text-sm text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{rejectedRecords.length}</p>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h4 className="text-lg font-semibold mb-4">Submissions ({studentRecords.length})</h4>
          {loadingRecords ? (
            <div className="text-muted-foreground py-8 text-center">Loading submissions...</div>
          ) : studentRecords.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground text-center">
                  No submissions from this student yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {studentRecords.map((record) => (
                <Card
                  key={record.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedRecord(record)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CategoryBadge category={record.category} />
                          <StatusBadge status={record.status} />
                        </div>
                        <CardTitle className="text-xl">{record.title}</CardTitle>
                        {record.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {record.description}
                          </p>
                        )}
                      </div>
                      {record.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRecord(record);
                          }}
                        >
                          Review
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {new Date(record.activity_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {record.points > 0 && (
                        <span className="font-semibold text-primary">{record.points} points</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {selectedRecord && (
          <ReviewRecordDialog
            record={selectedRecord}
            open={!!selectedRecord}
            onOpenChange={(open) => !open && setSelectedRecord(null)}
            onSuccess={() => {
              fetchStudentRecords(selectedStudent.id);
              setSelectedRecord(null);
            }}
          />
        )}
      </div>
    );
  }

  // Get unique sections from fetched students
  const allSections = Array.from(
    new Set(students.map((s) => s.section).filter(Boolean))
  ).sort() as string[];

  // Filter students by year and section
  const filteredStudents = students.filter((s) => {
    const yearMatch = yearFilter === 'all' || s.year_of_study === parseInt(yearFilter);
    const sectionMatch = sectionFilter === 'all' || s.section === sectionFilter;
    return yearMatch && sectionMatch;
  });

  // Show all students grid
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold">Student Submissions</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Click on a student card to view their submissions
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter by year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              <SelectItem value="1">1st Year</SelectItem>
              <SelectItem value="2">2nd Year</SelectItem>
              <SelectItem value="3">3rd Year</SelectItem>
              <SelectItem value="4">4th Year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter by section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {allSections.map((section) => (
                <SelectItem key={section} value={section}>
                  Section {section}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">
              No students assigned. Assign students from the Students tab to view their submissions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStudents.map((student) => (
            <Card
              key={student.id}
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
              onClick={() => handleStudentClick(student)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{student.full_name}</CardTitle>
                    <p className="text-sm text-muted-foreground truncate">{student.student_id}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Department</span>
                    <span className="font-medium">{student.department || 'N/A'}</span>
                  </div>
                  {student.year_of_study && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Year</span>
                      <span className="font-medium">{student.year_of_study}</span>
                    </div>
                  )}
                  <div className="border-t pt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{student.recordCount} submissions</span>
                    </div>
                    {student.pendingCount > 0 && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                        {student.pendingCount} pending
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
