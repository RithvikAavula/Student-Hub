import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Users, Mail, Calendar, GraduationCap, Building2 } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { getBatchYear, getBatchLabel, calculateAcademicYear, getAcademicYearLabel } from '@/lib/academicYear';

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

export default function StudentManagementTab() {
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterSection, setFilterSection] = useState<string>('all');
  const [filterBatch, setFilterBatch] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('department', { ascending: true })
        .order('year_of_study', { ascending: true })
        .order('full_name', { ascending: true });

      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Get available years, sections, and batch years for filters
  const availableYears = Array.from(new Set(students.map((s) => s.year_of_study).filter(Boolean))).sort() as number[];
  const availableSections = Array.from(new Set(students.map((s) => s.section).filter(Boolean))).sort() as string[];
  const availableBatchYears = Array.from(
    new Set(students.map((s) => getBatchYear(s.join_date, s.year_of_study)).filter((y): y is number => y !== null && y !== undefined))
  ).sort((a, b) => b - a);

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.department?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = filterYear === 'all' || (s.year_of_study && s.year_of_study.toString() === filterYear);
    const matchesSection = filterSection === 'all' || s.section === filterSection;
    const studentBatchYear = getBatchYear(s.join_date, s.year_of_study);
    const matchesBatch = filterBatch === 'all' || (studentBatchYear && studentBatchYear.toString() === filterBatch);
    return matchesSearch && matchesYear && matchesSection && matchesBatch;
  });

  // Group students by department
  const studentsByDepartment = filteredStudents.reduce((acc, s) => {
    const dept = s.department || 'Unassigned';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(s);
    return acc;
  }, {} as Record<string, Profile[]>);

  const departments = Object.keys(studentsByDepartment).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        >
          <Loader2 className="w-8 h-8 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Search Bar and Filters Row */}
      <motion.div variants={itemVariants}>
        <Card className="border-primary/20 shadow-lg shadow-primary/5">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                placeholder="Search students by name, email, student ID, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 items-center">
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      Year {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSection} onValueChange={setFilterSection}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {availableSections.map((section) => (
                    <SelectItem key={section} value={section}>
                      Section {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableBatchYears.length > 0 && (
                <Select value={filterBatch} onValueChange={setFilterBatch}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    {availableBatchYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        Batch {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {(filterYear !== 'all' || filterSection !== 'all' || filterBatch !== 'all') && (
                <button
                  type="button"
                  onClick={() => { setFilterYear('all'); setFilterSection('all'); setFilterBatch('all'); }}
                  className="text-xs px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* Stats Overview */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">{students.length}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-1">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Departments</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">{departments.length}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Building2 className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300 hover:-translate-y-1">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Students</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">{filteredStudents.length}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Students by Department */}
      <div className="space-y-6">
        {departments.map((dept, deptIndex) => (
          <motion.div key={dept} variants={itemVariants}>
            <Card className="overflow-hidden border-border/50 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-foreground">{dept}</span>
                  </div>
                  <span className="text-sm font-normal px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full">
                    {studentsByDepartment[dept].length} students
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {studentsByDepartment[dept].map((s, index) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                    >
                      <Card className="border border-border/50 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 hover:-translate-y-1 group">
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{s.full_name}</h3>
                                <p className="text-xs text-muted-foreground mt-1">{s.student_id || 'No ID'}</p>
                              </div>
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-semibold text-lg shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                                {s.full_name.charAt(0).toUpperCase()}
                              </div>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                                <Mail className="w-4 h-4 text-blue-500/70" />
                                <span className="truncate">{s.email}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <GraduationCap className="w-4 h-4 text-blue-500/70" />
                                <Badge variant="secondary" className="bg-blue-500/10 hover:bg-blue-500/20">
                                  {getAcademicYearLabel(calculateAcademicYear(s.join_date, s.year_of_study))}
                                </Badge>
                                <Badge variant="outline" className="border-green-500/30 text-green-600 dark:text-green-400">
                                  {getBatchLabel(s.join_date, s.year_of_study)}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                                <Calendar className="w-4 h-4 text-blue-500/70" />
                                <span>Joined {s.join_date ? new Date(s.join_date).toLocaleDateString() : new Date(s.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-dashed border-2">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">No students found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Try adjusting your search or filter criteria</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
