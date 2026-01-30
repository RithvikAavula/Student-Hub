import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus, UserMinus, Filter } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function AssignedStudentsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignedStudents, setAssignedStudents] = useState<Profile[]>([]);
  type StudentWithAssignmentFlag = Profile & {
    faculty_assignments?: { faculty_id: string }[];
  };
  const [allStudents, setAllStudents] = useState<StudentWithAssignmentFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [studentToRemove, setStudentToRemove] = useState<Profile | null>(null);
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');

  useEffect(() => {
    fetchAssignedStudents();
    fetchAllStudents();
  }, [user]);

  const fetchAssignedStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('faculty_assignments')
        .select('student:profiles!faculty_assignments_student_id_fkey(*)')
        .eq('faculty_id', user?.id);

      if (error) throw error;
      
      const students = data?.map(d => d.student).filter(Boolean) as Profile[];
      setAssignedStudents(students || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching assigned students',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          faculty_assignments:faculty_assignments!faculty_assignments_student_id_fkey(faculty_id)
        `)
        .eq('role', 'student')
        .order('full_name');

      if (error) throw error;
      setAllStudents((data || []) as StudentWithAssignmentFlag[]);
    } catch (error: any) {
      console.error('Error fetching all students:', error);
    }
  };

  const handleAssignStudent = async () => {
    if (!selectedStudent) {
      toast({
        title: 'Student required',
        description: 'Please select a student to assign.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('faculty_assignments')
        .insert({
          faculty_id: user?.id,
          student_id: selectedStudent,
        });

      if (error) {
        // Handle duplicate key errors from unique constraint
        const msg = typeof error.message === 'string' ? error.message.toLowerCase() : '';
        if (msg.includes('duplicate key') || msg.includes('already exists')) {
          throw new Error('This student is already assigned to a faculty. Remove their current assignment before reassigning.');
        }
        throw error;
      }

      toast({ title: 'Student assigned successfully' });
      fetchAssignedStudents();
      setShowAddDialog(false);
      setSelectedStudent('');
    } catch (error: any) {
      toast({
        title: 'Error assigning student',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from('faculty_assignments')
        .delete()
        .eq('faculty_id', user?.id)
        .eq('student_id', studentId);

      if (error) throw error;

      toast({ title: 'Student removed successfully' });
      fetchAssignedStudents();
      setStudentToRemove(null);
    } catch (error: any) {
      toast({
        title: 'Error removing student',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Only students without any assignment to any faculty
  const unassignedStudents = allStudents.filter(
    (s) => !(s.faculty_assignments && s.faculty_assignments.length > 0)
  );

  // Get unique sections from fetched assigned students
  const allSections = Array.from(
    new Set(assignedStudents.map((s) => s.section).filter(Boolean))
  ).sort() as string[];

  // Filter assigned students by year and section
  const filteredAssignedStudents = assignedStudents.filter((s) => {
    const yearMatch = yearFilter === 'all' || s.year_of_study === parseInt(yearFilter);
    const sectionMatch = sectionFilter === 'all' || s.section === sectionFilter;
    return yearMatch && sectionMatch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading students...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold">Assigned Students</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your assigned students
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
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
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Assign Student
          </Button>
        </div>
      </div>

      {filteredAssignedStudents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">
              No students assigned. Start by assigning students to your faculty account.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAssignedStudents.map((student) => (
            <Card key={student.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{student.full_name}</CardTitle>
                <p className="text-sm text-muted-foreground">{student.student_id}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium truncate max-w-[180px]">{student.email}</span>
                  </div>
                  {student.department && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Department</span>
                      <span className="font-medium">{student.department}</span>
                    </div>
                  )}
                  {student.year_of_study && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Year</span>
                      <span className="font-medium">Year {student.year_of_study}</span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 text-destructive hover:text-destructive"
                    onClick={() => setStudentToRemove(student)}
                  >
                    <UserMinus className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Student</DialogTitle>
            <DialogDescription>
              Select a student to assign to your faculty account
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Student</Label>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {unassignedStudents.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    All students are already assigned
                  </div>
                ) : (
                  unassignedStudents.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.full_name} ({student.student_id})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignStudent}>Assign Student</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!studentToRemove} onOpenChange={(open) => !open && setStudentToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Student Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {studentToRemove?.full_name} from your assigned students?
              This will not delete any existing records, but you will no longer be able to manage their data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => studentToRemove && handleRemoveStudent(studentToRemove.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
