import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { StudentRecord, Profile, RecordStatus, RecordCategory, AcademicYear } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, Search, Grid3X3, List, GraduationCap, FileText, CheckCircle, XCircle, Clock,
  BookOpen, Code, Trophy, Music, Heart, MoreHorizontal
} from 'lucide-react';
import StatusBadge from '@/components/features/StatusBadge';
import CategoryBadge from '@/components/features/CategoryBadge';
import RecordDetailsDialog from '@/components/features/RecordDetailsDialog';
import { getAcademicYearLabel } from '@/lib/academicYear';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

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
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Stats Overview */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">{records.length}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300 hover:-translate-y-1">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">{records.filter(r => r.status === 'pending').length}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300 hover:-translate-y-1">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">{records.filter(r => r.status === 'approved').length}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20 hover:shadow-lg hover:shadow-red-500/10 transition-all duration-300 hover:-translate-y-1">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-400 bg-clip-text text-transparent">{records.filter(r => r.status === 'rejected').length}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                <XCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters & Search Card */}
      <motion.div variants={itemVariants}>
        <Card className="border-primary/20 shadow-lg shadow-primary/5 overflow-hidden">
          <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30">
                    <Search className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Filters & Search</CardTitle>
                    <CardDescription className="text-sm">
                      Refine results by status, category, or student details
                    </CardDescription>
                  </div>
                </div>
                {(statusFilter !== 'all' || categoryFilter !== 'all' || yearFilter !== 'all' || sectionFilter !== 'all' || academicYearFilter !== 'all' || searchTerm) && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setStatusFilter('all');
                      setCategoryFilter('all');
                      setYearFilter('all');
                      setSectionFilter('all');
                      setAcademicYearFilter('all');
                      setSearchTerm('');
                    }}
                    className="text-xs"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </CardHeader>
          </div>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {errorMsg && (
                <Alert>
                  <AlertDescription>
                    <span className="font-medium">Data load error:</span> {errorMsg}. Ensure your .env is present and restart the dev server.
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Search Row - Full Width */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder="Search by student name, ID, or record title..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 text-base bg-muted/50 border-muted-foreground/20 focus:border-primary"
                />
              </div>
              
              {/* Filters Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</label>
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as RecordStatus | 'all')}>
                    <SelectTrigger className="bg-background">
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
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</label>
                  <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as RecordCategory | 'all')}>
                    <SelectTrigger className="bg-background">
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
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Year of Study</label>
                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger className="bg-background">
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
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Section</label>
                  <Select value={sectionFilter} onValueChange={setSectionFilter}>
                    <SelectTrigger className="bg-background">
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
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Academic Year</label>
                  <Select 
                    value={academicYearFilter.toString()} 
                    onValueChange={(v) => setAcademicYearFilter(v === 'all' ? 'all' : parseInt(v) as AcademicYear)}
                  >
                    <SelectTrigger className="bg-background">
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
      </motion.div>

      {/* Category Breakdown */}
      <motion.div variants={itemVariants}>
        <Card className="border-primary/20 shadow-lg shadow-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Grid3X3 className="w-5 h-5 text-primary" />
              Category Breakdown
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (click to filter)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div 
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${categoryFilter === 'academic' ? 'bg-blue-500/20 border-blue-500 ring-2 ring-blue-500/30' : 'bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10 hover:border-blue-500/40'}`}
                onClick={() => setCategoryFilter(categoryFilter === 'academic' ? 'all' : 'academic')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-foreground">Academic</span>
                </div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{records.filter(r => r.category === 'academic').length}</p>
              </div>
              <div 
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${categoryFilter === 'technical' ? 'bg-purple-500/20 border-purple-500 ring-2 ring-purple-500/30' : 'bg-purple-500/5 border-purple-500/20 hover:bg-purple-500/10 hover:border-purple-500/40'}`}
                onClick={() => setCategoryFilter(categoryFilter === 'technical' ? 'all' : 'technical')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Code className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium text-foreground">Technical</span>
                </div>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{records.filter(r => r.category === 'technical').length}</p>
              </div>
              <div 
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${categoryFilter === 'sports' ? 'bg-green-500/20 border-green-500 ring-2 ring-green-500/30' : 'bg-green-500/5 border-green-500/20 hover:bg-green-500/10 hover:border-green-500/40'}`}
                onClick={() => setCategoryFilter(categoryFilter === 'sports' ? 'all' : 'sports')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-foreground">Sports</span>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{records.filter(r => r.category === 'sports').length}</p>
              </div>
              <div 
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${categoryFilter === 'cultural' ? 'bg-pink-500/20 border-pink-500 ring-2 ring-pink-500/30' : 'bg-pink-500/5 border-pink-500/20 hover:bg-pink-500/10 hover:border-pink-500/40'}`}
                onClick={() => setCategoryFilter(categoryFilter === 'cultural' ? 'all' : 'cultural')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Music className="w-4 h-4 text-pink-500" />
                  <span className="text-sm font-medium text-foreground">Cultural</span>
                </div>
                <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">{records.filter(r => r.category === 'cultural').length}</p>
              </div>
              <div 
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${categoryFilter === 'social' ? 'bg-orange-500/20 border-orange-500 ring-2 ring-orange-500/30' : 'bg-orange-500/5 border-orange-500/20 hover:bg-orange-500/10 hover:border-orange-500/40'}`}
                onClick={() => setCategoryFilter(categoryFilter === 'social' ? 'all' : 'social')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium text-foreground">Social</span>
                </div>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{records.filter(r => r.category === 'social').length}</p>
              </div>
              <div 
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${categoryFilter === 'other' ? 'bg-gray-500/20 border-gray-500 ring-2 ring-gray-500/30' : 'bg-gray-500/5 border-gray-500/20 hover:bg-gray-500/10 hover:border-gray-500/40'}`}
                onClick={() => setCategoryFilter(categoryFilter === 'other' ? 'all' : 'other')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <MoreHorizontal className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-foreground">Other</span>
                </div>
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{records.filter(r => r.category === 'other').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          >
            <Loader2 className="w-8 h-8 text-primary" />
          </motion.div>
        </div>
      ) : (
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              Records <span className="text-muted-foreground font-normal">({filteredRecords.length} of {records.length})</span>
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
                <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No records found matching the current filters.</p>
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecords.map((record, index) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                >
                  <Card className="hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-primary/50">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-semibold text-foreground truncate">{record.title}</h4>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={record.status} />
                          <CategoryBadge category={record.category} />
                          {record.academic_year && (
                            <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700">
                              <GraduationCap className="w-3 h-3 mr-1" />
                              {getAcademicYearLabel(record.academic_year)}
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p><strong className="text-foreground/80">Student:</strong> {record.student?.full_name}</p>
                          <p><strong className="text-foreground/80">ID:</strong> {record.student?.student_id || 'N/A'}</p>
                          <p><strong className="text-foreground/80">Year:</strong> {record.student?.year_of_study || 'N/A'} | <strong className="text-foreground/80">Section:</strong> {record.student?.section || 'N/A'}</p>
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
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecords.map((record, index) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.3 }}
                >
                  <Card className="hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 border-l-4 border-l-primary/50 hover:border-l-primary">
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
                            <span><strong className="text-foreground/80">Student:</strong> {record.student?.full_name}</span>
                            <span><strong className="text-foreground/80">ID:</strong> {record.student?.student_id || 'N/A'}</span>
                            <span><strong className="text-foreground/80">Year:</strong> {record.student?.year_of_study || 'N/A'}</span>
                            <span><strong className="text-foreground/80">Section:</strong> {record.student?.section || 'N/A'}</span>
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
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}
      {selectedRecord && (
        <RecordDetailsDialog
          record={selectedRecord}
          open={!!selectedRecord}
          onOpenChange={() => setSelectedRecord(null)}
        />
      )}
    </motion.div>
  );
}
