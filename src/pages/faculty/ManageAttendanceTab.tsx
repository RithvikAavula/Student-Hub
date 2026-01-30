import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Attendance, Profile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ManageAttendanceTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<Profile[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [formData, setFormData] = useState({
    subject_code: '',
    subject_name: '',
    total_classes: 0,
    attended_classes: 0,
    semester: '',
  });
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    fetchAssignedStudents();
    fetchAttendance();
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

  const fetchAttendance = async () => {
    try {
      const { data: assignments } = await supabase
        .from('faculty_assignments')
        .select('student_id')
        .eq('faculty_id', user?.id);

      const studentIds = assignments?.map((a) => a.student_id) || [];

      if (studentIds.length === 0) {
        setAttendance([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .in('student_id', studentIds)
        .order('subject_name');

      if (error) throw error;
      setAttendance(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching attendance',
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
      if (editMode && editId) {
        const { error } = await supabase
          .from('attendance')
          .update({
            ...formData,
            updated_by: user?.id,
          })
          .eq('id', editId);

        if (error) throw error;
        toast({ title: 'Attendance updated successfully' });
      } else {
        const { error } = await supabase
          .from('attendance')
          .insert({
            student_id: selectedStudent,
            ...formData,
            updated_by: user?.id,
          });

        if (error) throw error;
        toast({ title: 'Attendance added successfully' });
      }

      fetchAttendance();
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Error saving attendance',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (record: Attendance) => {
    setEditMode(true);
    setEditId(record.id);
    setSelectedStudent(record.student_id);
    setFormData({
      subject_code: record.subject_code,
      subject_name: record.subject_name,
      total_classes: record.total_classes,
      attended_classes: record.attended_classes,
      semester: record.semester,
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setShowDialog(false);
    setEditMode(false);
    setEditId(null);
    setSelectedStudent('');
    setFormData({
      subject_code: '',
      subject_name: '',
      total_classes: 0,
      attended_classes: 0,
      semester: '',
    });
  };

  const calculatePercentage = (attended: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((attended / total) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading attendance...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold">Manage Attendance</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Update student attendance records
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Attendance
        </Button>
      </div>

      {attendance.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">
              No attendance records found. Start by adding attendance for your students.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {attendance.map((record) => {
            const student = students.find(s => s.id === record.student_id);
            const percentage = calculatePercentage(record.attended_classes, record.total_classes);
            
            return (
              <Card key={record.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{record.subject_name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {student?.full_name} ({student?.student_id}) • {record.subject_code}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(record)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Attended</p>
                      <p className="font-semibold">{record.attended_classes}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-semibold">{record.total_classes}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Percentage</p>
                      <p className="font-semibold">{percentage}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Semester</p>
                      <p className="font-semibold">{record.semester}</p>
                    </div>
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
            <DialogTitle>{editMode ? 'Edit' : 'Add'} Attendance</DialogTitle>
            <DialogDescription>
              {editMode ? 'Update' : 'Create'} attendance record for a student
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={editMode}>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Attended Classes</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.attended_classes}
                  onChange={(e) => setFormData({ ...formData, attended_classes: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Total Classes</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.total_classes}
                  onChange={(e) => setFormData({ ...formData, total_classes: parseInt(e.target.value) || 0 })}
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
            <Button onClick={handleSubmit}>
              {editMode ? 'Update' : 'Add'} Attendance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
