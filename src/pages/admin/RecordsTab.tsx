import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { StudentRecord, Profile, RecordStatus, RecordCategory, AcademicYear } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Grid3X3, List, GraduationCap } from 'lucide-react';
import StatusBadge from '@/components/features/StatusBadge';
import CategoryBadge from '@/components/features/CategoryBadge';
import RecordDetailsDialog from '@/components/features/RecordDetailsDialog';
import { getAcademicYearLabel } from '@/lib/academicYear';

interface RecordWithStudent extends StudentRecord {
  student?: Profile;
}

export default function RecordsTab() {
  const [records, setRecords] = useState<RecordWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<RecordWithStudent | null>(null);
  const [statusFilter, setStatusFilter] = useState<RecordStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<RecordCategory | 'all'>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [academicYearFilter, setAcademicYearFilter] = useState<AcademicYear | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    setErrorMsg(null);
    const { data, error } = await supabase
      .from('student_records')
      .select(`*, student:profiles!student_records_student_id_fkey(*)`)
      .order('created_at', { ascending: false });

    console.debug('[Admin RecordsTab] fetchRecords', { dataLength: (data || []).length, error });
    if (error) {
      setErrorMsg(error.message || JSON.stringify(error));
      setRecords([]);
    } else {
      setRecords(data || []);
    }
    setLoading(false);
  };

  const availableYears = Array.from(new Set(records.map(r => r.student?.year_of_study).filter(Boolean))).sort() as number[];
  const availableSections = Array.from(new Set(records.map(r => r.student?.section).filter(Boolean))).sort() as string[];
  
  // Get available academic years from records (respects each student's starting year)
  const availableAcademicYears = Array.from(
    new Set(records.map(r => r.academic_year).filter((y): y is AcademicYear => y !== null && y !== undefined))
  ).sort() as AcademicYear[];

  const filteredRecords = records.filter(r => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
    const matchesYear = yearFilter === 'all' || r.student?.year_of_study?.toString() === yearFilter;
    const matchesSection = sectionFilter === 'all' || r.student?.section === sectionFilter;
    const matchesAcademicYear = academicYearFilter === 'all' || r.academic_year === academicYearFilter;
    const matchesSearch =
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.student?.student_id?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesCategory && matchesYear && matchesSection && matchesAcademicYear && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Total Records</p>
            <p className="text-2xl font-bold text-foreground">{records.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{records.filter(r => r.status === 'pending').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{records.filter(r => r.status === 'approved').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Rejected</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{records.filter(r => r.status === 'rejected').length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
          <CardDescription>
            Filter records by status, category, year, section, or search by student details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {errorMsg && (
              <Alert>
                <AlertDescription>
                  <span className="font-medium">Data load error:</span> {errorMsg}. Ensure your .env is present and restart the dev server.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Student name, ID, or title..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Status</label>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as RecordStatus | 'all')}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Category</label>
                <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as RecordCategory | 'all')}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="cultural">Cultural</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Year</label>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {availableYears.map(y => (
                      <SelectItem key={y} value={y.toString()}>Year {y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Section</label>
                <Select value={sectionFilter} onValueChange={setSectionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {availableSections.map(s => (
                      <SelectItem key={s} value={s.toString()}>Section {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Academic Year</label>
                <Select 
                  value={academicYearFilter.toString()} 
                  onValueChange={(v) => setAcademicYearFilter(v === 'all' ? 'all' : parseInt(v) as AcademicYear)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Academic Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Academic Years</SelectItem>
                    {availableAcademicYears.map(y => (
                      <SelectItem key={y} value={y.toString()}>{getAcademicYearLabel(y)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              Records ({filteredRecords.length} of {records.length})
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4 mr-2" />
                List
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="w-4 h-4 mr-2" />
                Grid
              </Button>
            </div>
          </div>
          {filteredRecords.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No records found matching the current filters.</p>
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecords.map(record => (
                <Card key={record.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-semibold text-foreground truncate">{record.title}</h4>
                        <StatusBadge status={record.status} />
                        <CategoryBadge category={record.category} />
                        {record.academic_year && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            <GraduationCap className="w-3 h-3 mr-1" />
                            {getAcademicYearLabel(record.academic_year)}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p><strong>Student:</strong> {record.student?.full_name}</p>
                        <p><strong>ID:</strong> {record.student?.student_id || 'N/A'}</p>
                        <p><strong>Reg. Year:</strong> {record.student?.year_of_study || 'N/A'} | <strong>Section:</strong> {record.student?.section || 'N/A'}</p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(record.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex gap-2 pt-2">
                        {record.certificate_url && (
                          <Button variant="outline" size="sm" asChild className="flex-1">
                            <a href={record.certificate_url} target="_blank" rel="noopener noreferrer">
                              Certificate
                            </a>
                          </Button>
                        )}
                        <Button variant="default" size="sm" onClick={() => setSelectedRecord(record)} className="flex-1">
                          Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            filteredRecords.map(record => (
              <Card key={record.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h4 className="text-lg font-semibold text-foreground">{record.title}</h4>
                        <StatusBadge status={record.status} />
                        <CategoryBadge category={record.category} />
                        {record.academic_year && (
                          <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700">
                            <GraduationCap className="w-3 h-3 mr-1" />
                            {getAcademicYearLabel(record.academic_year)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3 flex-wrap">
                        <span><strong>Student:</strong> {record.student?.full_name}</span>
                        <span><strong>ID:</strong> {record.student?.student_id || 'N/A'}</span>
                        <span><strong>Reg. Year:</strong> {record.student?.year_of_study || 'N/A'}</span>
                        <span><strong>Section:</strong> {record.student?.section || 'N/A'}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mb-3">
                        Submitted: {new Date(record.created_at).toLocaleString()}
                      </div>
                      {record.description && (
                        <p className="text-sm text-foreground/80 mb-3 line-clamp-2">{record.description}</p>
                      )}
                      <div className="flex gap-2">
                        {record.certificate_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={record.certificate_url} target="_blank" rel="noopener noreferrer">
                              View Certificate
                            </a>
                          </Button>
                        )}
                        <Button variant="default" size="sm" onClick={() => setSelectedRecord(record)}>
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
      {selectedRecord && (
        <RecordDetailsDialog
          record={selectedRecord}
          open={!!selectedRecord}
          onOpenChange={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
}
