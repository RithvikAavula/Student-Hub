import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { InternalMark } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { BookMarked, Award } from 'lucide-react';

export default function MarksTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [marks, setMarks] = useState<InternalMark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarks();

    // Real-time subscription
    const channel = supabase
      .channel('marks_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'internal_marks',
          filter: `student_id=eq.${user?.id}`,
        },
        () => {
          fetchMarks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchMarks = async () => {
    try {
      const { data, error } = await supabase
        .from('internal_marks')
        .select('*')
        .eq('student_id', user?.id)
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

  // Group marks by subject
  const groupedMarks = marks.reduce((acc, mark) => {
    if (!acc[mark.subject_name]) {
      acc[mark.subject_name] = [];
    }
    acc[mark.subject_name].push(mark);
    return acc;
  }, {} as Record<string, InternalMark[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading marks...</div>
      </div>
    );
  }

  if (marks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookMarked className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            No marks records found. Your faculty will update marks soon.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-semibold">Internal Marks</h3>
        <p className="text-sm text-muted-foreground mt-1">
          View your internal assessment scores across all subjects
        </p>
      </div>

      <div className="grid gap-6">
        {Object.entries(groupedMarks).map(([subjectName, subjectMarks]) => {
          const totalObtained = subjectMarks.reduce((sum, m) => sum + m.obtained_marks, 0);
          const totalMax = subjectMarks.reduce((sum, m) => sum + m.max_marks, 0);
          const overallPercentage = calculatePercentage(totalObtained, totalMax);

          return (
            <Card key={subjectName} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{subjectName}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {subjectMarks[0].subject_code} • {subjectMarks[0].semester}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary">{overallPercentage}%</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {totalObtained}/{totalMax}
                    </p>
                  </div>
                </div>
                <Progress value={overallPercentage} className="h-2 mt-4" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {subjectMarks.map((mark) => {
                    const percentage = calculatePercentage(mark.obtained_marks, mark.max_marks);
                    return (
                      <div
                        key={mark.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Award className="w-4 h-4 text-primary" />
                          <div>
                            <p className="font-medium text-sm">
                              {getAssessmentLabel(mark.assessment_type)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {mark.obtained_marks}/{mark.max_marks} marks
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{percentage}%</p>
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
    </div>
  );
}
