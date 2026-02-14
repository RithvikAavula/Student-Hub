import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, UserMinus, UserPlus, Search } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/Header';
import { ScrollArea } from '@/components/ui/scroll-area';

interface StudentWithAssignments extends Profile {
  faculty_assignments?: {
    faculty_id: string;
    faculty: Profile;
  }[];
}

export default function FacultyDetailsPage() {
  const { facultyId } = useParams<{ facultyId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [allStudents, setAllStudents] = useState<StudentWithAssignments[]>([]);
  const [faculty, setFaculty] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  // Search and filters for assigned students
  const [assignedSearch, setAssignedSearch] = useState('');
  const [assignedYearFilter, setAssignedYearFilter] = useState<string>('all');
  const [assignedSectionFilter, setAssignedSectionFilter] = useState<string>('all');
  // Search and filters for available students
  const [availableSearch, setAvailableSearch] = useState('');
  const [availableYearFilter, setAvailableYearFilter] = useState<string>('all');
  const [availableSectionFilter, setAvailableSectionFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      // Fetch faculty details
      const { data: facultyData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', facultyId)
        .single();
      setFaculty(facultyData);

      // Fetch all students with assignments
      const { data: studentsData } = await supabase
        .from('profiles')
        .select(`
          *,
          faculty_assignments!faculty_assignments_student_id_fkey(
            faculty_id,
            faculty:profiles!faculty_assignments_faculty_id_fkey(*)
          )
        `)
        .eq('role', 'student');
      setAllStudents(studentsData || []);

      setLoading(false);
    }
    if (facultyId) fetchData();
  }, [facultyId]);

  const assignedStudents = allStudents.filter(s => {
    const assignments = Array.isArray(s.faculty_assignments) ? s.faculty_assignments : (s.faculty_assignments ? [s.faculty_assignments] : []);
    return assignments.some(a => a.faculty_id === facultyId);
  });

  const availableStudents = allStudents.filter(s => {
    const assignments = Array.isArray(s.faculty_assignments) ? s.faculty_assignments : (s.faculty_assignments ? [s.faculty_assignments] : []);
    return assignments.length === 0;
  });

  // Filtered assigned students
  const filteredAssignedStudents = assignedStudents.filter(student => {
    const matchesSearch = student.full_name.toLowerCase().includes(assignedSearch.toLowerCase()) ||
                         student.email.toLowerCase().includes(assignedSearch.toLowerCase());
    const matchesYear = assignedYearFilter === 'all' || student.year_of_study?.toString() === assignedYearFilter;
    const matchesSection = assignedSectionFilter === 'all' || student.section === assignedSectionFilter;
    return matchesSearch && matchesYear && matchesSection;
  });

  // Filtered available students
  const filteredAvailableStudents = availableStudents.filter(student => {
    const matchesSearch = student.full_name.toLowerCase().includes(availableSearch.toLowerCase()) ||
                         student.email.toLowerCase().includes(availableSearch.toLowerCase());
    const matchesYear = availableYearFilter === 'all' || student.year_of_study?.toString() === availableYearFilter;
    const matchesSection = availableSectionFilter === 'all' || student.section === availableSectionFilter;
    return matchesSearch && matchesYear && matchesSection;
  });

  // Get unique years and sections for filters
  const allYears = Array.from(new Set(allStudents.map(s => s.year_of_study).filter(Boolean))).sort();
  const allSections = Array.from(new Set(allStudents.map(s => s.section).filter(Boolean))).sort();

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const assignSelectedStudents = async () => {
    if (selectedStudents.length === 0) return;

    try {
      setAssigning(true);
      const assignments = selectedStudents.map(studentId => ({
        student_id: studentId,
        faculty_id: facultyId,
      }));

      const { error } = await supabase.from('faculty_assignments').insert(assignments);

      if (error) {
        const msg = typeof error.message === 'string' ? error.message.toLowerCase() : '';
        if (msg.includes('duplicate key') || msg.includes('already exists')) {
          throw new Error('Some students already have faculty assigned. Please remove existing assignments first.');
        }
        throw error;
      }

      toast({
        title: 'Success',
        description: `${selectedStudents.length} student(s) assigned successfully`,
      });

      // Refresh data
      const { data: studentsData } = await supabase
        .from('profiles')
        .select(`
          *,
          faculty_assignments!faculty_assignments_student_id_fkey(
            faculty_id,
            faculty:profiles!faculty_assignments_faculty_id_fkey(*)
          )
        `)
        .eq('role', 'student');
      setAllStudents(studentsData || []);
      setSelectedStudents([]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setAssigning(false);
    }
  };

  const unassignStudent = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from('faculty_assignments')
        .delete()
        .eq('student_id', studentId)
        .eq('faculty_id', facultyId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Student unassigned successfully',
      });

      // Refresh data
      const { data: studentsData } = await supabase
        .from('profiles')
        .select(`
          *,
          faculty_assignments!faculty_assignments_student_id_fkey(
            faculty_id,
            faculty:profiles!faculty_assignments_faculty_id_fkey(*)
          )
        `)
        .eq('role', 'student');
      setAllStudents(studentsData || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <Header />
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 animate-spin text-primary"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-foreground" onClick={() => navigate('/dashboard', { state: { activeTab: 'assignments' } })}>
          <ArrowLeft className="w-4 h-4" /> Back to Assignments
        </button>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                {faculty?.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{faculty?.full_name}</h1>
                <p className="text-muted-foreground">{faculty?.email}</p>
                <p className="text-muted-foreground">{faculty?.department}</p>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assigned Students */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserMinus className="w-5 h-5" />
                Assigned Students ({assignedStudents.length})
              </CardTitle>
              <CardDescription>
                Students currently assigned to this faculty
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search and Filters for Assigned */}
              <div className="space-y-4 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search assigned students..."
                    value={assignedSearch}
                    onChange={(e) => setAssignedSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={assignedYearFilter} onValueChange={setAssignedYearFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filter by Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {allYears.map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={assignedSectionFilter} onValueChange={setAssignedSectionFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filter by Section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {allSections.map(section => (
                        <SelectItem key={section} value={section}>{section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <ScrollArea className="h-96">
                {filteredAssignedStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {assignedStudents.length === 0 ? 'No students assigned yet.' : 'No students match the filters.'}
                  </p>
                ) : (
                  filteredAssignedStudents.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-3 border border-border rounded-lg mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {student.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{student.full_name}</p>
                          <p className="text-sm text-muted-foreground">{student.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Assigned</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unassignStudent(student.id)}
                        >
                          Unassign
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Available Students */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Available Students ({availableStudents.length})
              </CardTitle>
              <CardDescription>
                Students available to assign to this faculty
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search and Filters for Available */}
              <div className="space-y-4 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search available students..."
                    value={availableSearch}
                    onChange={(e) => setAvailableSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={availableYearFilter} onValueChange={setAvailableYearFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filter by Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {allYears.map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={availableSectionFilter} onValueChange={setAvailableSectionFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filter by Section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {allSections.map(section => (
                        <SelectItem key={section} value={section}>{section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <ScrollArea className="h-96">
                {filteredAvailableStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {availableStudents.length === 0 ? 'No available students.' : 'No students match the filters.'}
                  </p>
                ) : (
                  <>
                    {filteredAvailableStudents.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-3 border border-border rounded-lg mb-2">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedStudents.includes(student.id)}
                            onCheckedChange={() => toggleStudentSelection(student.id)}
                          />
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {student.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{student.full_name}</p>
                            <p className="text-sm text-muted-foreground">{student.email}</p>
                          </div>
                        </div>
                        <Badge variant="secondary">Available</Badge>
                      </div>
                    ))}
                    {selectedStudents.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <Button
                          onClick={assignSelectedStudents}
                          disabled={assigning}
                          className="w-full"
                        >
                          {assigning ? 'Assigning...' : `Assign ${selectedStudents.length} Student(s)`}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
