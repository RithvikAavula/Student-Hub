import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Attendance } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { BookOpen, TrendingUp, TrendingDown } from 'lucide-react';

export default function AttendanceTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance();

    // Real-time subscription
    const channel = supabase
      .channel('attendance_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `student_id=eq.${user?.id}`,
        },
        () => {
          fetchAttendance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', user?.id)
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

  const calculatePercentage = (attended: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((attended / total) * 100);
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 75) return 'text-success';
    if (percentage >= 65) return 'text-warning';
    return 'text-destructive';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return 'bg-success';
    if (percentage >= 65) return 'bg-warning';
    return 'bg-destructive';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading attendance...</div>
      </div>
    );
  }

  if (attendance.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            No attendance records found. Your faculty will update attendance soon.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-semibold">Attendance Records</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Track your class attendance across all subjects
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {attendance.map((record) => {
          const percentage = calculatePercentage(record.attended_classes, record.total_classes);
          const isBelowThreshold = percentage < 75;

          return (
            <Card key={record.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{record.subject_name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{record.subject_code}</p>
                  </div>
                  <div className={`text-2xl font-bold ${getStatusColor(percentage)}`}>
                    {percentage}%
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={percentage} className="h-2" indicatorClassName={getProgressColor(percentage)} />
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {record.attended_classes} / {record.total_classes} classes
                  </span>
                  {isBelowThreshold ? (
                    <div className="flex items-center gap-1 text-destructive">
                      <TrendingDown className="w-4 h-4" />
                      <span className="text-xs font-medium">Below 75%</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-success">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-xs font-medium">On track</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Semester: {record.semester}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
