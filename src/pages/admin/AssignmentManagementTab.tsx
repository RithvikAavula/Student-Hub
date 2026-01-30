import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserPlus, UserMinus, Users, GraduationCap, Mail, Building2, ArrowLeft, Check, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface StudentWithAssignments extends Profile {
  faculty_assignments?: {
    faculty_id: string;
    faculty: Profile;
  }[];
}

interface FacultyWithStats extends Profile {
  assignedStudentsCount: number;
  departmentStudentsCount: number;
}

export default function AssignmentManagementTab() {
  const [students, setStudents] = useState<StudentWithAssignments[]>([]);
  const [faculty, setFaculty] = useState<FacultyWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyWithStats | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [assigningStudents, setAssigningStudents] = useState(false);
  const [showStudentDialog, setShowStudentDialog] = useState(false);
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterSection, setFilterSection] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch students with their assignments
      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select(`
          *,
          faculty_assignments!faculty_assignments_student_id_fkey(
            faculty_id,
            faculty:profiles!faculty_assignments_faculty_id_fkey(*)
          )
        `)
        .eq('role', 'student')
        .order('department', { ascending: true })
        .order('full_name', { ascending: true });

      if (studentsError) throw studentsError;

      // Fetch all faculty
      const { data: facultyData, error: facultyError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'faculty')
        .order('department', { ascending: true })
        .order('full_name', { ascending: true });

      if (facultyError) throw facultyError;

      // Calculate faculty stats
      const facultyWithStats: FacultyWithStats[] = (facultyData || []).map((f) => {
        const assignedStudentsCount = (studentsData || []).filter((s) =>
          s.faculty_assignments?.some((a: any) => a.faculty_id === f.id)
        ).length;
        const departmentStudentsCount = (studentsData || []).filter(
          (s) => s.department === f.department
        ).length;
        return {
          ...f,
          assignedStudentsCount,
          departmentStudentsCount,
        };
      });

      setStudents(studentsData || []);
      setFaculty(facultyWithStats);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const assignStudentsToFaculty = async () => {
    if (!selectedFaculty || selectedStudents.length === 0) return;

    try {
      setAssigningStudents(true);

      // Insert assignments for all selected students
      const assignments = selectedStudents.map((studentId) => ({
        student_id: studentId,
        faculty_id: selectedFaculty.id,
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
        description: `${selectedStudents.length} student(s) assigned to ${selectedFaculty.full_name}`,
      });

      setSelectedStudents([]);
      setShowStudentDialog(false);
      setSelectedFaculty(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setAssigningStudents(false);
    }
  };

  const removeAssignment = async (studentId: string, facultyId: string) => {
    try {
      const { error } = await supabase
        .from('faculty_assignments')
        .delete()
        .eq('student_id', studentId)
        .eq('faculty_id', facultyId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Assignment removed successfully',
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleFacultyClick = (facultyMember: FacultyWithStats) => {
    setSelectedFaculty(facultyMember);
    setSelectedStudents([]);
    setFilterYear('all');
    setFilterSection('all');
    setShowStudentDialog(true);
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllUnassignedStudents = () => {
    if (!selectedFaculty) return;
    const unassignedStudents = getFilteredDepartmentStudents(selectedFaculty.department)
      .filter((s) => !hasAssignedFaculty(s) && !getAssignedStudents(selectedFaculty.id).some((as) => as.id === s.id))
      .map((s) => s.id);
    setSelectedStudents(unassignedStudents);
  };

  const deselectAllStudents = () => {
    setSelectedStudents([]);
  };

  const filteredFaculty = selectedDepartment === 'all'
    ? faculty
    : faculty.filter((f) => f.department === selectedDepartment);

  const departments = Array.from(
    new Set([...students.map((s) => s.department), ...faculty.map((f) => f.department)].filter(Boolean))
  ).sort();

  const getDepartmentStudents = (department: string | undefined) => {
    if (!department) return [];
    return students.filter((s) => s.department === department);
  };

  const getFilteredDepartmentStudents = (department: string | undefined) => {
    let filtered = getDepartmentStudents(department);
    if (filterYear !== 'all') {
      filtered = filtered.filter((s) => s.year_of_study?.toString() === filterYear);
    }
    if (filterSection !== 'all') {
      filtered = filtered.filter((s) => s.section === filterSection);
    }
    return filtered;
  };

  const getAvailableYears = (department: string | undefined) => {
    const deptStudents = getDepartmentStudents(department);
    return Array.from(new Set(deptStudents.map((s) => s.year_of_study).filter(Boolean))).sort() as number[];
  };

  const getAvailableSections = (department: string | undefined) => {
    const deptStudents = getDepartmentStudents(department);
    return Array.from(new Set(deptStudents.map((s) => s.section).filter(Boolean))).sort() as string[];
  };

  const getAssignedStudents = (facultyId: string) => {
    return students.filter((s) =>
      s.faculty_assignments?.some((a) => a.faculty_id === facultyId)
    );
  };

  const hasAssignedFaculty = (student: StudentWithAssignments) => {
    return student.faculty_assignments && student.faculty_assignments.length > 0;
  };

  const getAssignedFacultyName = (student: StudentWithAssignments) => {
    if (student.faculty_assignments && student.faculty_assignments.length > 0) {
      return student.faculty_assignments[0].faculty?.full_name || 'Unknown';
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">


      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Assignments</p>
                <p className="text-2xl font-bold text-slate-900">
                  {students.reduce((sum, s) => sum + (s.faculty_assignments?.length || 0), 0)}
                </p>
              </div>
              <UserPlus className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Students</p>
                <p className="text-2xl font-bold text-slate-900">{students.length}</p>
              </div>
              <GraduationCap className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Faculty</p>
                <p className="text-2xl font-bold text-slate-900">{faculty.length}</p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Faculty Cards Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Faculty Members
          </CardTitle>
          <CardDescription>
            Click on a faculty card to view department students and assign them
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFaculty.map((facultyMember) => (
              <Card
                key={facultyMember.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/50 group"
                onClick={() => handleFacultyClick(facultyMember)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0 group-hover:scale-110 transition-transform">
                      {facultyMember.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{facultyMember.full_name}</h3>
                      <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{facultyMember.email}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                        <Building2 className="w-3 h-3" />
                        <span>{facultyMember.department || 'No Department'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="text-center flex-1">
                        <p className="text-2xl font-bold text-green-600">{facultyMember.assignedStudentsCount}</p>
                        <p className="text-xs text-slate-500">Assigned</p>
                      </div>
                      <div className="h-8 w-px bg-slate-200" />
                      <div className="text-center flex-1">
                        <p className="text-2xl font-bold text-blue-600">{facultyMember.departmentStudentsCount}</p>
                        <p className="text-xs text-slate-500">In Department</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Badge
                      variant={facultyMember.assignedStudentsCount > 0 ? 'default' : 'secondary'}
                      className="w-full justify-center"
                    >
                      {facultyMember.assignedStudentsCount > 0
                        ? `${facultyMember.assignedStudentsCount} Student(s) Assigned`
                        : 'No Students Assigned'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredFaculty.length === 0 && (
            <div className="py-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No faculty found in this department.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Assignment Dialog */}
      <Dialog open={showStudentDialog} onOpenChange={setShowStudentDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Assign Students to {selectedFaculty?.full_name}
            </DialogTitle>
            <DialogDescription>
              {selectedFaculty?.department
                ? `Showing students from ${selectedFaculty.department} department. Select students to assign.`
                : 'No department assigned to this faculty.'}
            </DialogDescription>
          </DialogHeader>

          {selectedFaculty && (
            <div className="flex flex-col flex-1 overflow-hidden gap-4">
              {/* Faculty Info Summary */}
              <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200 flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {selectedFaculty.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{selectedFaculty.full_name}</h3>
                  <p className="text-sm text-slate-500">{selectedFaculty.email}</p>
                  <Badge variant="outline" className="mt-1">
                    {selectedFaculty.department || 'No Department'}
                  </Badge>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-sm text-slate-500">Currently Assigned</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {selectedFaculty.assignedStudentsCount}
                  </p>
                </div>
              </div>

              {/* Student Selection Actions */}
              <div className="flex flex-col gap-3 py-2 flex-shrink-0">
                {/* Filters Row */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">Filter:</span>
                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {getAvailableYears(selectedFaculty.department).map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          Year {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterSection} onValueChange={setFilterSection}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {getAvailableSections(selectedFaculty.department).map((section) => (
                        <SelectItem key={section} value={section}>
                          Section {section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(filterYear !== 'all' || filterSection !== 'all') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFilterYear('all');
                        setFilterSection('all');
                      }}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>

                {/* Selection Actions Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllUnassignedStudents}
                    >
                      Select All Unassigned
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={deselectAllStudents}
                    >
                      Deselect All
                    </Button>
                  </div>
                  <Badge variant="secondary">
                    {selectedStudents.length} student(s) selected
                  </Badge>
                </div>
              </div>

              {/* Students List */}
              <ScrollArea className="flex-1 min-h-0 pr-4">
                <div className="space-y-3">
                  {/* Currently Assigned Students */}
                  {getAssignedStudents(selectedFaculty.id).length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-slate-700 sticky top-0 bg-white py-2">
                        Currently Assigned Students
                      </h4>
                      {getAssignedStudents(selectedFaculty.id).map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center gap-4 p-3 bg-green-50 border border-green-200 rounded-lg"
                        >
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {student.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-slate-900">{student.full_name}</h4>
                            <p className="text-sm text-slate-500">
                              {student.student_id || 'No ID'} • Year {student.year_of_study}
                              {student.section && ` • Section ${student.section}`}
                            </p>
                          </div>
                          <Badge variant="default" className="bg-green-600">
                            <Check className="w-3 h-3 mr-1" /> Assigned
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeAssignment(student.id, selectedFaculty.id)}
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Department Students (Unassigned to this faculty) */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-slate-700 sticky top-0 bg-white py-2">
                      Department Students
                      {(filterYear !== 'all' || filterSection !== 'all') && (
                        <span className="ml-2 text-xs font-normal text-slate-500">
                          (Filtered: {filterYear !== 'all' ? `Year ${filterYear}` : ''}{filterYear !== 'all' && filterSection !== 'all' ? ', ' : ''}{filterSection !== 'all' ? `Section ${filterSection}` : ''})
                        </span>
                      )}
                    </h4>
                    {getFilteredDepartmentStudents(selectedFaculty.department)
                      .filter((s) => !getAssignedStudents(selectedFaculty.id).some((as) => as.id === s.id))
                      .map((student) => {
                        const isAssignedToOther = hasAssignedFaculty(student);
                        const assignedToName = getAssignedFacultyName(student);
                        const isSelected = selectedStudents.includes(student.id);

                        return (
                          <div
                            key={student.id}
                            className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                              isAssignedToOther
                                ? 'bg-slate-50 border-slate-200 opacity-60'
                                : isSelected
                                ? 'bg-blue-50 border-blue-300'
                                : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                            }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleStudentSelection(student.id)}
                              disabled={isAssignedToOther}
                              className="data-[state=checked]:bg-blue-600"
                            />
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                              {student.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-slate-900">{student.full_name}</h4>
                              <p className="text-sm text-slate-500">
                                {student.student_id || 'No ID'} • Year {student.year_of_study}
                                {student.section && ` • Section ${student.section}`}
                              </p>
                            </div>
                            {isAssignedToOther ? (
                              <Badge variant="secondary" className="text-xs">
                                Assigned to {assignedToName}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Unassigned
                              </Badge>
                            )}
                          </div>
                        );
                      })}

                    {getFilteredDepartmentStudents(selectedFaculty.department).filter((s) => !getAssignedStudents(selectedFaculty.id).some((as) => as.id === s.id)).length === 0 && (
                      <div className="py-8 text-center">
                        <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">
                          {filterYear !== 'all' || filterSection !== 'all'
                            ? 'No students match the selected filters.'
                            : 'No students in this department.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>

              {/* Fixed Footer with Assign Button */}
              <div className="flex-shrink-0 pt-4 border-t border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowStudentDialog(false);
                      setSelectedFaculty(null);
                      setSelectedStudents([]);
                    }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="lg"
                    onClick={assignStudentsToFaculty}
                    disabled={selectedStudents.length === 0 || assigningStudents}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {assigningStudents ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Assign {selectedStudents.length} Student(s)
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
