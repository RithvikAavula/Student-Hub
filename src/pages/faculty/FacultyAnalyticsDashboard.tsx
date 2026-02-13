/**
 * Faculty Analytics Dashboard
 * 
 * Shows collaborative analytics for all students assigned to the faculty:
 * - Submission statistics (total, approved, rejected, pending)
 * - Breakdown by year and section
 * - Leaderboard of assigned students
 * - Charts and trends
 */

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  Users,
  FileCheck,
  BarChart3,
  Crown,
  Loader2,
  GraduationCap,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  FileX,
  Target,
  Sparkles,
  Filter,
  User,
  BookOpen,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// Types
interface StudentRecord {
  id: string;
  student_id: string;
  title: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  activity_date: string;
}

interface Profile {
  id: string;
  full_name: string;
  department: string | null;
  year_of_study: number | null;
  section: string | null;
  avatar_path: string | null;
  student_id: string | null;
}

interface LeaderboardEntry {
  rank: number;
  studentId: string;
  fullName: string;
  department: string;
  yearOfStudy: number;
  section: string;
  totalSubmissions: number;
  approved: number;
  pending: number;
  rejected: number;
  avatarUrl: string | null;
  approvalRate: number;
}

interface YearSectionStat {
  year: number;
  section: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
}

// Color constants
const STATUS_COLORS = {
  approved: '#22c55e',
  pending: '#f59e0b',
  rejected: '#ef4444',
};

const CATEGORY_COLORS: Record<string, string> = {
  academic: '#6366f1',
  sports: '#10b981',
  cultural: '#f59e0b',
  technical: '#8b5cf6',
  social: '#ec4899',
  other: '#64748b',
};

const chartConfig: ChartConfig = {
  approved: { label: 'Approved', color: STATUS_COLORS.approved },
  pending: { label: 'Pending', color: STATUS_COLORS.pending },
  rejected: { label: 'Rejected', color: STATUS_COLORS.rejected },
  total: { label: 'Total', color: '#6366f1' },
};

// Utility functions
const getAvatarUrl = (path: string | null): string | null => {
  if (!path) return null;
  const { data } = supabase.storage.from('profile').getPublicUrl(path);
  return data.publicUrl;
};

const getYearLabel = (year: number): string => {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const suffix = year <= 3 ? suffixes[year] : suffixes[0];
  return `${year}${suffix} Year`;
};

// Stats Card Component
function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  color,
  trend,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  color: string;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden relative">
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ background: `linear-gradient(135deg, ${color}, transparent)` }}
        />
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold tracking-tight">{value}</p>
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
              {trend && (
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  trend.positive ? "text-green-500" : "text-red-500"
                )}>
                  {trend.positive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {trend.value}% from last month
                </div>
              )}
            </div>
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
            >
              <Icon className="h-7 w-7 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Leaderboard Row Component
function LeaderboardRow({ entry, index }: { entry: LeaderboardEntry; index: number }) {
  const isTopThree = entry.rank <= 3;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl transition-all duration-300",
        isTopThree 
          ? "bg-gradient-to-r from-yellow-500/5 via-amber-500/5 to-orange-500/5 border border-amber-500/20 shadow-sm" 
          : "bg-muted/30 border border-transparent hover:border-muted-foreground/20"
      )}
    >
      {/* Rank */}
      <div className={cn(
        "flex items-center justify-center w-10 h-10 rounded-lg font-bold",
        entry.rank === 1 && "bg-gradient-to-br from-yellow-400 to-amber-500 text-white",
        entry.rank === 2 && "bg-gradient-to-br from-gray-300 to-gray-400 text-white",
        entry.rank === 3 && "bg-gradient-to-br from-amber-500 to-orange-600 text-white",
        entry.rank > 3 && "bg-muted text-muted-foreground"
      )}>
        {entry.rank <= 3 ? entry.rank : `#${entry.rank}`}
      </div>

      {/* Avatar */}
      <Avatar className={cn(
        "h-12 w-12 ring-2 shadow-md",
        entry.rank === 1 && "ring-yellow-500 ring-offset-2 ring-offset-background",
        entry.rank === 2 && "ring-gray-400 ring-offset-1 ring-offset-background",
        entry.rank === 3 && "ring-amber-600 ring-offset-1 ring-offset-background",
        entry.rank > 3 && "ring-muted"
      )}>
        <AvatarImage src={entry.avatarUrl || undefined} alt={entry.fullName} className="object-cover" />
        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-semibold">
          {entry.fullName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold truncate">{entry.fullName}</p>
          {entry.rank === 1 && (
            <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0 text-xs shadow-sm">
              <Crown className="h-3 w-3 mr-1" />
              Top
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GraduationCap className="h-3 w-3" />
          <span>{getYearLabel(entry.yearOfStudy)}</span>
          {entry.section && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <span>Section {entry.section}</span>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="text-center">
          <p className="font-bold text-lg">{entry.totalSubmissions}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {entry.approved}
          </Badge>
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
            <Clock className="h-3 w-3 mr-1" />
            {entry.pending}
          </Badge>
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            {entry.rejected}
          </Badge>
        </div>
        <div className="w-20">
          <div className="flex items-center gap-1">
            <Progress value={entry.approvalRate} className="h-2" />
            <span className="text-xs text-muted-foreground">{entry.approvalRate}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Year-Section Card Component
function YearSectionCard({ stat }: { stat: YearSectionStat }) {
  const total = stat.total || 1;
  const approvalRate = Math.round((stat.approved / total) * 100);
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            {getYearLabel(stat.year)}
            {stat.section && (
              <Badge variant="outline" className="ml-1">
                Section {stat.section}
              </Badge>
            )}
          </CardTitle>
          <Badge 
            variant="outline" 
            className={cn(
              approvalRate >= 70 ? "bg-green-500/10 text-green-600 border-green-500/30" :
              approvalRate >= 40 ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" :
              "bg-red-500/10 text-red-600 border-red-500/30"
            )}
          >
            {approvalRate}% Approval
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{stat.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-500">{stat.approved}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-500">{stat.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-500">{stat.rejected}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-green-500 transition-all" 
                style={{ width: `${(stat.approved / total) * 100}%` }} 
              />
              <div 
                className="h-full bg-yellow-500 transition-all" 
                style={{ width: `${(stat.pending / total) * 100}%` }} 
              />
              <div 
                className="h-full bg-red-500 transition-all" 
                style={{ width: `${(stat.rejected / total) * 100}%` }} 
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Component
export default function FacultyAnalyticsDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([]);
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [leaderboardYear, setLeaderboardYear] = useState<string>('all');

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;
      
      setLoading(true);
      try {
        // 1. Get assigned student IDs
        const { data: assignments, error: assignmentError } = await supabase
          .from('faculty_assignments')
          .select('student_id')
          .eq('faculty_id', user.id);

        if (assignmentError) throw assignmentError;

        const studentIds = (assignments || []).map(a => a.student_id);
        setAssignedStudentIds(studentIds);

        if (studentIds.length === 0) {
          setRecords([]);
          setProfiles([]);
          setLoading(false);
          return;
        }

        // 2. Get profiles of assigned students
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, department, year_of_study, section, avatar_path, student_id')
          .in('id', studentIds);

        if (profilesError) throw profilesError;
        setProfiles(profilesData || []);

        // 3. Get all records from assigned students
        const { data: recordsData, error: recordsError } = await supabase
          .from('student_records')
          .select('*')
          .in('student_id', studentIds);

        if (recordsError) throw recordsError;
        setRecords(recordsData || []);

      } catch (error) {
        console.error('Error fetching faculty analytics:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user?.id]);

  // Get unique years and sections
  const years = useMemo(() => {
    const yearSet = new Set<number>();
    profiles.forEach(p => {
      if (p.year_of_study) yearSet.add(p.year_of_study);
    });
    return Array.from(yearSet).sort();
  }, [profiles]);

  const sections = useMemo(() => {
    const sectionSet = new Set<string>();
    profiles.forEach(p => {
      if (p.section) sectionSet.add(p.section);
    });
    return Array.from(sectionSet).sort();
  }, [profiles]);

  // Filter profiles based on selected year/section
  const filteredProfileIds = useMemo(() => {
    return profiles
      .filter(p => {
        if (selectedYear !== 'all' && p.year_of_study !== parseInt(selectedYear)) return false;
        if (selectedSection !== 'all' && p.section !== selectedSection) return false;
        return true;
      })
      .map(p => p.id);
  }, [profiles, selectedYear, selectedSection]);

  // Filter records based on filtered profiles
  const filteredRecords = useMemo(() => {
    return records.filter(r => filteredProfileIds.includes(r.student_id));
  }, [records, filteredProfileIds]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const approved = filteredRecords.filter(r => r.status === 'approved').length;
    const pending = filteredRecords.filter(r => r.status === 'pending').length;
    const rejected = filteredRecords.filter(r => r.status === 'rejected').length;
    const students = new Set(filteredRecords.map(r => r.student_id)).size;
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
    
    return { total, approved, pending, rejected, students, approvalRate };
  }, [filteredRecords]);

  // Year-Section breakdown
  const yearSectionStats = useMemo((): YearSectionStat[] => {
    const statsMap: Record<string, YearSectionStat> = {};
    
    profiles.forEach(p => {
      const year = p.year_of_study || 0;
      const section = p.section || 'N/A';
      const key = `${year}-${section}`;
      
      if (!statsMap[key]) {
        statsMap[key] = {
          year,
          section,
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
        };
      }
    });

    records.forEach(r => {
      const profile = profiles.find(p => p.id === r.student_id);
      if (!profile) return;
      
      const year = profile.year_of_study || 0;
      const section = profile.section || 'N/A';
      const key = `${year}-${section}`;
      
      if (statsMap[key]) {
        statsMap[key].total++;
        if (r.status === 'approved') statsMap[key].approved++;
        else if (r.status === 'pending') statsMap[key].pending++;
        else if (r.status === 'rejected') statsMap[key].rejected++;
      }
    });

    return Object.values(statsMap)
      .filter(s => s.total > 0)
      .sort((a, b) => a.year - b.year || a.section.localeCompare(b.section));
  }, [profiles, records]);

  // Category breakdown
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([category, count]) => ({
        name: category.charAt(0).toUpperCase() + category.slice(1),
        value: count,
        fill: CATEGORY_COLORS[category] || CATEGORY_COLORS.other,
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRecords]);

  // Monthly trends
  const monthlyTrends = useMemo(() => {
    const trends: Record<string, { approved: number; pending: number; rejected: number }> = {};
    const now = new Date();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString('en-US', { month: 'short' });
      trends[key] = { approved: 0, pending: 0, rejected: 0 };
    }

    filteredRecords.forEach(r => {
      const date = new Date(r.created_at);
      const key = date.toLocaleDateString('en-US', { month: 'short' });
      if (trends[key]) {
        trends[key][r.status]++;
      }
    });

    return Object.entries(trends).map(([month, data]) => ({
      month,
      ...data,
      total: data.approved + data.pending + data.rejected,
    }));
  }, [filteredRecords]);

  // Leaderboard (uses its own year filter)
  const leaderboard = useMemo((): LeaderboardEntry[] => {
    const profileMap = new Map<string, Profile>();
    profiles.forEach(p => profileMap.set(p.id, p));

    // Filter profiles based on leaderboard year filter
    const leaderboardProfileIds = profiles
      .filter(p => leaderboardYear === 'all' || p.year_of_study === parseInt(leaderboardYear))
      .map(p => p.id);

    // Filter records for leaderboard
    const leaderboardRecords = records.filter(r => leaderboardProfileIds.includes(r.student_id));

    const studentStats: Record<string, { total: number; approved: number; pending: number; rejected: number }> = {};
    
    leaderboardRecords.forEach(r => {
      if (!studentStats[r.student_id]) {
        studentStats[r.student_id] = { total: 0, approved: 0, pending: 0, rejected: 0 };
      }
      studentStats[r.student_id].total++;
      studentStats[r.student_id][r.status]++;
    });

    const entries: LeaderboardEntry[] = Object.entries(studentStats)
      .map(([studentId, data]) => {
        const profile = profileMap.get(studentId);
        if (!profile) return null;
        
        return {
          rank: 0,
          studentId,
          fullName: profile.full_name,
          department: profile.department || 'Unknown',
          yearOfStudy: profile.year_of_study || 0,
          section: profile.section || 'N/A',
          totalSubmissions: data.total,
          approved: data.approved,
          pending: data.pending,
          rejected: data.rejected,
          avatarUrl: getAvatarUrl(profile.avatar_path),
          approvalRate: data.total > 0 ? Math.round((data.approved / data.total) * 100) : 0,
        };
      })
      .filter((e): e is LeaderboardEntry => e !== null)
      .sort((a, b) => b.approved - a.approved || b.totalSubmissions - a.totalSubmissions);

    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return entries;
  }, [records, profiles, leaderboardYear]);

  // Status pie chart data
  const statusPieData = useMemo(() => [
    { name: 'Approved', value: stats.approved, fill: STATUS_COLORS.approved },
    { name: 'Pending', value: stats.pending, fill: STATUS_COLORS.pending },
    { name: 'Rejected', value: stats.rejected, fill: STATUS_COLORS.rejected },
  ].filter(d => d.value > 0), [stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (assignedStudentIds.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Students Assigned</h3>
        <p className="text-muted-foreground">
          You don't have any students assigned yet. Go to the Students tab to assign students to view their analytics.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            Student Analytics
          </h2>
          <p className="text-muted-foreground mt-1">
            Overview of {profiles.length} assigned students' submissions
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {getYearLabel(year)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Select value={selectedSection} onValueChange={setSelectedSection}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="All Sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {sections.map(section => (
                <SelectItem key={section} value={section}>
                  Section {section}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title="Total Submissions"
          value={stats.total}
          description="All records"
          icon={FileCheck}
          color="#6366f1"
        />
        <StatsCard
          title="Approved"
          value={stats.approved}
          description={`${stats.approvalRate}% approval rate`}
          icon={CheckCircle2}
          color={STATUS_COLORS.approved}
        />
        <StatsCard
          title="Pending Review"
          value={stats.pending}
          description="Awaiting action"
          icon={Clock}
          color={STATUS_COLORS.pending}
        />
        <StatsCard
          title="Rejected"
          value={stats.rejected}
          description="Need revision"
          icon={XCircle}
          color={STATUS_COLORS.rejected}
        />
        <StatsCard
          title="Active Students"
          value={stats.students}
          description={`of ${profiles.length} assigned`}
          icon={Users}
          color="#8b5cf6"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3 p-1 bg-muted/50">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="breakdown" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BookOpen className="h-4 w-4 mr-2" />
            Breakdown
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Trophy className="h-4 w-4 mr-2" />
            Leaderboard
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Status Distribution
                </CardTitle>
                <CardDescription>
                  Breakdown of submission statuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                {statusPieData.length > 0 ? (
                  <div className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={statusPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {statusPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Monthly Trends
                </CardTitle>
                <CardDescription>
                  Submission trends over the last 6 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={monthlyTrends}>
                    <defs>
                      <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={STATUS_COLORS.approved} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={STATUS_COLORS.approved} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={STATUS_COLORS.pending} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={STATUS_COLORS.pending} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="approved" 
                      stackId="1"
                      stroke={STATUS_COLORS.approved} 
                      fill="url(#colorApproved)" 
                      name="Approved"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="pending" 
                      stackId="1"
                      stroke={STATUS_COLORS.pending} 
                      fill="url(#colorPending)" 
                      name="Pending"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Category Distribution
              </CardTitle>
              <CardDescription>
                Submissions by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {categoryStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {yearSectionStats.map((stat, index) => (
              <motion.div
                key={`${stat.year}-${stat.section}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <YearSectionCard stat={stat} />
              </motion.div>
            ))}
          </div>
          
          {yearSectionStats.length === 0 && (
            <Card className="p-8 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No breakdown data available</p>
            </Card>
          )}
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Student Leaderboard
                  </CardTitle>
                  <CardDescription>
                    Rankings based on approved submissions
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={leaderboardYear} onValueChange={setLeaderboardYear}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {years.map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          {getYearLabel(year)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-3">
                  {leaderboard.map((entry, index) => (
                    <LeaderboardRow key={entry.studentId} entry={entry} index={index} />
                  ))}
                  {leaderboard.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No submissions from students yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
