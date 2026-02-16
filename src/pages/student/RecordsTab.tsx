import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { StudentRecord, RecordCategory, AcademicYear, Profile } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, LayoutGrid, List, GraduationCap, Calendar, Award, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import StatusBadge from '@/components/features/StatusBadge';
import CategoryBadge from '@/components/features/CategoryBadge';
import AddRecordDialog from '@/components/features/AddRecordDialog';
import RecordDetailsDialog from '@/components/features/RecordDetailsDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculateAcademicYear, getAcademicYearLabel, groupRecordsByYear, calculateYearWiseStats, getBatchLabel, getAvailableAcademicYears } from '@/lib/academicYear';

export default function RecordsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<StudentRecord | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | RecordCategory>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Academic year state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentAcademicYear, setCurrentAcademicYear] = useState<AcademicYear>(1);
  const [selectedYear, setSelectedYear] = useState<'all' | AcademicYear>('all');
  const [startingYear, setStartingYear] = useState<number>(1);

  useEffect(() => {
    fetchProfile();
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

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (!error && data) {
      setProfile(data);
      // Use year_of_study as the starting year
      const yearOfStudy = data.year_of_study || 1;
      setStartingYear(yearOfStudy);
      setCurrentAcademicYear(calculateAcademicYear(data.join_date, yearOfStudy));
    }
  };

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('student_records')
        .select('*')
        .eq('student_id', user?.id)
        .order('created_at', { ascending: false });

      console.debug('[RecordsTab] fetchRecords response', { 
        studentId: user?.id, 
        dataLength: (data || []).length, 
        records: data?.map(r => ({ id: r.id, title: r.title, academic_year: r.academic_year })),
        error 
      });

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

  // Function to fix existing records that have incorrect academic_year
  // Uses RPC function to bypass immutability trigger
  const fixExistingRecordsAcademicYear = async () => {
    if (!user || !profile || records.length === 0) return;
    
    // Check if there are any records that need fixing
    const hasIncorrectRecords = records.some(r => r.academic_year === 1) && currentAcademicYear > 1;
    
    if (!hasIncorrectRecords) return;
    
    console.debug('[RecordsTab] Fixing academic_year via RPC', { userId: user.id });
    
    try {
      // Call the database function to fix records
      const { data, error } = await supabase.rpc('fix_student_records_academic_year', {
        p_student_id: user.id
      });
      
      if (error) {
        console.error('[RecordsTab] Error fixing records:', error);
        return;
      }
      
      if (data && data > 0) {
        console.debug('[RecordsTab] Fixed academic_year for records', { count: data });
        // Refresh records
        fetchRecords();
      }
    } catch (err) {
      console.error('[RecordsTab] Exception fixing records:', err);
    }
  };

  // Auto-fix records when profile is loaded and current year > 1
  useEffect(() => {
    if (profile && records.length > 0 && currentAcademicYear > 1) {
      const hasIncorrectRecords = records.some(r => r.academic_year === 1);
      if (hasIncorrectRecords) {
        fixExistingRecordsAcademicYear();
      }
    }
  }, [profile, records.length, currentAcademicYear]);

  const filteredRecords = records
    .filter((r) => (activeCategory === 'all' ? true : r.category === activeCategory))
    .filter((r) => (selectedYear === 'all' ? true : r.academic_year === selectedYear));

  // Calculate year-wise stats (only for available years)
  const yearWiseStats = calculateYearWiseStats(records).filter(
    stat => stat.academic_year >= startingYear
  );
  const groupedRecords = groupRecordsByYear(records);

  const categories: Array<'all' | RecordCategory> = [
    'all',
    'academic',
    'technical',
    'sports',
    'cultural',
    'social',
    'other',
  ];

  // Only show academic years from starting year onwards
  const availableYears = getAvailableAcademicYears(startingYear);
  const academicYears: Array<'all' | AcademicYear> = ['all', ...availableYears];

  const getCategoryLabel = (cat: string) => {
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  const getYearTabLabel = (year: 'all' | AcademicYear) => {
    if (year === 'all') return 'All Years';
    return getAcademicYearLabel(year);
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
      {/* Header with Academic Year Info */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold">Certificates</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Submit and track your certificates
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Certificate
        </Button>
      </div>

      {/* Academic Year Status Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-lg">
                  Currently in {getAcademicYearLabel(currentAcademicYear)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {profile?.join_date ? getBatchLabel(profile.join_date, profile?.year_of_study) : 'Batch not set'} • {profile?.department || 'Department not set'}
                </p>
              </div>
            </div>
            
            {/* Year-wise Summary Stats */}
            <div className="flex gap-4 flex-wrap">
              {yearWiseStats.map((stat) => (
                <div key={stat.academic_year} className="text-center px-3 py-1 rounded-lg bg-background/50">
                  <p className="text-lg font-bold">{stat.total_submissions}</p>
                  <p className="text-xs text-muted-foreground">{getAcademicYearLabel(stat.academic_year)}</p>
                </div>
              ))}
              <div className="text-center px-3 py-1 rounded-lg bg-primary/20">
                <p className="text-lg font-bold text-primary">{records.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Year-wise Filter Tabs */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Filter by Year:</span>
          <div className="flex flex-wrap gap-2">
            {academicYears.map((year) => {
              const count = year === 'all' 
                ? records.length 
                : groupedRecords[year]?.length || 0;
              
              return (
                <Button
                  key={year}
                  variant={selectedYear === year ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedYear(year)}
                  className="gap-1"
                >
                  {getYearTabLabel(year)}
                  <span className="ml-1 text-xs opacity-70">({count})</span>
                </Button>
              );
            })}
          </div>
        </div>
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
                      ? 'No certificates found. Start by adding your first certificate!'
                      : `No ${activeCategory} certificates found.`}
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
                          <div className="flex items-center gap-2">
                            <CategoryBadge category={record.category} />
                            {record.academic_year && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                {getAcademicYearLabel(record.academic_year)}
                              </span>
                            )}
                          </div>
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
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <CategoryBadge category={record.category} />
                              <StatusBadge status={record.status} />
                              {record.academic_year && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  {getAcademicYearLabel(record.academic_year)}
                                </span>
                              )}
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
