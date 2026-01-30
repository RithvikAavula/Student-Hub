import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { StudentRecord, Profile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatusBadge from '@/components/features/StatusBadge';
import CategoryBadge from '@/components/features/CategoryBadge';
import ReviewRecordDialog from '@/components/features/ReviewRecordDialog';
import { Filter } from 'lucide-react';

interface RecordWithStudent extends StudentRecord {
  student?: Profile;
}

export default function ReviewRecordsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<RecordWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<RecordWithStudent | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    fetchRecords();

    // Real-time subscription
    const channel = supabase
      .channel('faculty_records_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_records',
        },
        () => {
          fetchRecords();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchRecords = async () => {
    try {
      // Get assigned student IDs
      const { data: assignments, error: assignError } = await supabase
        .from('faculty_assignments')
        .select('student_id')
        .eq('faculty_id', user?.id);

      if (assignError) throw assignError;

      const studentIds = assignments?.map((a) => a.student_id) || [];

      if (studentIds.length === 0) {
        setRecords([]);
        setLoading(false);
        return;
      }

      // Get records for assigned students
      const { data, error } = await supabase
        .from('student_records')
        .select(`
          *,
          student:profiles!student_records_student_id_fkey(*)
        `)
        .in('student_id', studentIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching records',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = statusFilter === 'all' 
    ? records 
    : records.filter(r => r.status === statusFilter);

  const pendingCount = records.filter(r => r.status === 'pending').length;
  const approvedCount = records.filter(r => r.status === 'approved').length;
  const rejectedCount = records.filter(r => r.status === 'rejected').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading records...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold">Student Activity Records</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve student submissions
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Filter by status</span>
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending {pendingCount > 0 && `(${pendingCount})`}
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved {approvedCount > 0 && `(${approvedCount})`}
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected {rejectedCount > 0 && `(${rejectedCount})`}
          </TabsTrigger>
          <TabsTrigger value="all">All ({records.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-6">
          {filteredRecords.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground text-center">
                  No {statusFilter !== 'all' && statusFilter} records found
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredRecords.map((record) => (
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
                        <p className="text-sm text-muted-foreground">
                          Submitted by: {record.student?.full_name || 'Unknown'} 
                          {record.student?.student_id && ` (${record.student.student_id})`}
                        </p>
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
        </TabsContent>
      </Tabs>

      {selectedRecord && (
        <ReviewRecordDialog
          record={selectedRecord}
          open={!!selectedRecord}
          onOpenChange={(open) => !open && setSelectedRecord(null)}
          onSuccess={fetchRecords}
        />
      )}
    </div>
  );
}
