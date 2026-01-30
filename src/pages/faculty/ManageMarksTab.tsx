import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { InternalMark, Profile, AssessmentType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ManageMarksTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<Profile[]>([]);
  const [marks, setMarks] = useState<InternalMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [formData, setFormData] = useState({
    subject_code: '',
    subject_name: '',
    assessment_type: 'assignment' as AssessmentType,
    max_marks: 0,
    obtained_marks: 0,
    semester: '',
  });

  useEffect(() => {
    fetchAssignedStudents();
    fetchMarks();
  }, [user]);

  const fetchAssignedStudents = async () => {
    try {
      const { data: assignments, error } = await supabase
        .from('faculty_assignments')
        .select('student_id, student:profiles!faculty_assignments_student_id_fkey(*)')
        .eq('faculty_id', user?.id);

      if (error) throw error;
      
      const studentProfiles = assignments?.map(a => a.student).filter(Boolean) as Profile[];
      setStudents(studentProfiles || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching students',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const fetchMarks = async () => {
    try {
      const { data: assignments } = await supabase
        .from('faculty_assignments')
        .select('student_id')
        .eq('faculty_id', user?.id);

      const studentIds = assignments?.map((a) => a.student_id) || [];

      if (studentIds.length === 0) {
        setMarks([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('internal_marks')
        .select('*')
        .in('student_id', studentIds)
        .order('subject_name');

      if (error) throw error;
      setMarks(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching marks',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedStudent) {
      toast({
        title: 'Student required',
        description: 'Please select a student.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('internal_marks')
        .insert({
          student_id: selectedStudent,
          ...formData,
          updated_by: user?.id,
        });

      if (error) throw error;

      toast({ title: 'Marks added successfully' });
      fetchMarks();
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Error saving marks',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setShowDialog(false);
    setSelectedStudent('');
    setFormData({
      subject_code: '',
      subject_name: '',
      assessment_type: 'assignment',
      max_marks: 0,
      obtained_marks: 0,
      semester: '',
    });
  };

  const calculatePercentage = (obtained: number, max: number) => {
    if (max === 0) return 0;
    return Math.round((obtained / max) * 100);
  };

  const getAssessmentLabel = (type: string) => {
    const labels: Record<string, string> = {
      assignment: 'Assignment',
      test1: 'Test 1',
      test2: 'Test 2',
      test3: 'Test 3',
      project: 'Project',
      seminar: 'Seminar',
      other: 'Other',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading marks...</div>
      </div>
    );
  }

  // Group marks by student
  const marksByStudent = marks.reduce((acc, mark) => {
    if (!acc[mark.student_id]) {
      acc[mark.student_id] = [];
    }
    acc[mark.student_id].push(mark);
    return acc;
  }, {} as Record<string, InternalMark[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold">Manage Internal Marks</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Update student internal assessment marks
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Marks
        </Button>
      </div>

      {marks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">
              No marks records found. Start by adding marks for your students.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {Object.entries(marksByStudent).map(([studentId, studentMarks]) => {
            const student = students.find(s => s.id === studentId);
            
            return (
              <Card key={studentId}>
                <CardHeader>
                  <CardTitle>
                    {student?.full_name} ({student?.student_id})
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {student?.department} • Year {student?.year_of_study}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {studentMarks.map((mark) => {
                      const percentage = calculatePercentage(mark.obtained_marks, mark.max_marks);
                      
                      return (
                        <div
                          key={mark.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{mark.subject_name} ({mark.subject_code})</p>
                            <p className="text-sm text-muted-foreground">
                              {getAssessmentLabel(mark.assessment_type)} • {mark.semester}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">{percentage}%</p>
                            <p className="text-xs text-muted-foreground">
                              {mark.obtained_marks}/{mark.max_marks}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Internal Marks</DialogTitle>
            <DialogDescription>
              Add assessment marks for a student
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.full_name} ({student.student_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subject Code</Label>
                <Input
                  value={formData.subject_code}
                  onChange={(e) => setFormData({ ...formData, subject_code: e.target.value })}
                  placeholder="CS101"
                />
              </div>
              <div className="space-y-2">
                <Label>Subject Name</Label>
                <Input
                  value={formData.subject_name}
                  onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                  placeholder="Data Structures"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assessment Type</Label>
              <Select
                value={formData.assessment_type}
                onValueChange={(value) => setFormData({ ...formData, assessment_type: value as AssessmentType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="test1">Test 1</SelectItem>
                  <SelectItem value="test2">Test 2</SelectItem>
                  <SelectItem value="test3">Test 3</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="seminar">Seminar</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Obtained Marks</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.obtained_marks}
                  onChange={(e) => setFormData({ ...formData, obtained_marks: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Marks</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.max_marks}
                  onChange={(e) => setFormData({ ...formData, max_marks: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Semester</Label>
              <Input
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                placeholder="Fall 2024"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleSubmit}>Add Marks</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
