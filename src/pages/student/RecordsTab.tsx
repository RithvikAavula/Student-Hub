import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { StudentRecord, RecordCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, LayoutGrid, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import StatusBadge from '@/components/features/StatusBadge';
import CategoryBadge from '@/components/features/CategoryBadge';
import AddRecordDialog from '@/components/features/AddRecordDialog';
import RecordDetailsDialog from '@/components/features/RecordDetailsDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function RecordsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<StudentRecord | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | RecordCategory>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchRecords();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('student_records_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_records',
          filter: `student_id=eq.${user?.id}`,
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
      const { data, error } = await supabase
        .from('student_records')
        .select('*')
        .eq('student_id', user?.id)
        .order('created_at', { ascending: false });

      console.debug('[RecordsTab] fetchRecords response', { studentId: user?.id, dataLength: (data || []).length, error });

      if (error) throw error;
      setRecords(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching records',
        description: error.message,
        variant: 'destructive',
      });
      console.error('[RecordsTab] fetchRecords error', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records
    .filter((r) => (activeCategory === 'all' ? true : r.category === activeCategory));

  const categories: Array<'all' | RecordCategory> = [
    'all',
    'academic',
    'technical',
    'sports',
    'cultural',
    'social',
    'other',
  ];

  const getCategoryLabel = (cat: string) => {
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  };

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
          <h3 className="text-2xl font-semibold">Activity Records</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upload and track your extracurricular achievements
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Record
        </Button>
      </div>

      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as any)}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <TabsList className="grid grid-cols-4 lg:grid-cols-7 w-full">
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="text-xs">
              {getCategoryLabel(cat)}
            </TabsTrigger>
          ))}
          </TabsList>

            <div className="flex items-center gap-3 mt-3 md:mt-0">

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-pressed={viewMode === 'grid'}
                  className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                  title="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              </div>
        </div>

        {categories.map((cat) => (
          <TabsContent key={cat} value={cat} className="space-y-4 mt-6">
            {filteredRecords.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground text-center">
                    {activeCategory === 'all'
                      ? 'No activity records found. Start by adding your first achievement!'
                      : `No ${activeCategory} records found.`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              viewMode === 'grid' ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredRecords.map((record) => (
                    <Card
                      key={record.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setSelectedRecord(record)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <CategoryBadge category={record.category} />
                          <StatusBadge status={record.status} />
                        </div>
                        <CardTitle className="text-lg line-clamp-1">{record.title}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {record.description || 'No description provided'}
                        </CardDescription>
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
                            <span className="font-semibold text-primary">{record.points} pts</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRecords.map((record) => (
                    <Card key={record.id} className="hover:shadow-lg transition-shadow" onClick={() => setSelectedRecord(record)}>
                      <CardContent>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <CategoryBadge category={record.category} />
                              <StatusBadge status={record.status} />
                              <span className="text-sm text-muted-foreground">{(record as any).student?.section ? `Section ${(record as any).student.section}` : ''}</span>
                            </div>
                            <h4 className="text-lg font-semibold">{record.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{record.description || 'No description provided'}</p>
                            <div className="text-xs text-muted-foreground mt-2">
                              Submitted: {new Date(record.created_at).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex flex-col items-end justify-between">
                            <div className="text-sm text-muted-foreground">
                              {new Date(record.activity_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            {record.points > 0 && <div className="font-semibold text-primary">{record.points} pts</div>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ))}
          </TabsContent>
        ))}
      </Tabs>

      <AddRecordDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={fetchRecords}
      />

      {selectedRecord && (
        <RecordDetailsDialog
          record={selectedRecord}
          open={!!selectedRecord}
          onOpenChange={(open) => !open && setSelectedRecord(null)}
          onSuccess={fetchRecords}
        />
      )}
    </div>
  );
}
