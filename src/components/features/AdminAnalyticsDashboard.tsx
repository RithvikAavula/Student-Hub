import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  Trophy,
  TrendingUp,
  Users,
  FileCheck,
  BarChart3,
  Loader2,
  GraduationCap,
  Calendar,
  Target,
  CheckCircle,
  Clock,
  XCircle,
  Layers,
  Award,
  Star,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface StudentRecord {
  id: string;
  student_id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  academic_year: number;
}

interface Profile {
  id: string;
  full_name: string;
  department: string | null;
  year_of_study: number | null;
}

interface YearStats {
  year: number;
  totalStudents: number;
  studentsWithCertificates: number;
  totalCertificates: number;
  approved: number;
  pending: number;
  rejected: number;
  categoryBreakdown: Record<string, number>;
}

// Color palettes
const YEAR_COLORS = {
  1: '#3b82f6', // blue
  2: '#8b5cf6', // purple
  3: '#f59e0b', // amber
  4: '#10b981', // emerald
};

const CATEGORY_COLORS: Record<string, string> = {
  academic: '#6366f1',
  sports: '#10b981',
  cultural: '#f59e0b',
  technical: '#8b5cf6',
  social: '#ec4899',
  other: '#64748b',
};

const STATUS_COLORS = {
  approved: '#22c55e',
  pending: '#f59e0b',
  rejected: '#ef4444',
};

const chartConfig: ChartConfig = {
  academic: { label: 'Academic', color: CATEGORY_COLORS.academic },
  sports: { label: 'Sports', color: CATEGORY_COLORS.sports },
  cultural: { label: 'Cultural', color: CATEGORY_COLORS.cultural },
  technical: { label: 'Technical', color: CATEGORY_COLORS.technical },
  social: { label: 'Social', color: CATEGORY_COLORS.social },
  other: { label: 'Other', color: CATEGORY_COLORS.other },
  certificates: { label: 'Certificates', color: '#6366f1' },
  year1: { label: '1st Year', color: YEAR_COLORS[1] },
  year2: { label: '2nd Year', color: YEAR_COLORS[2] },
  year3: { label: '3rd Year', color: YEAR_COLORS[3] },
  year4: { label: '4th Year', color: YEAR_COLORS[4] },
};

// Utility functions
const getYearLabel = (year: number): string => {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const suffix = year <= 3 ? suffixes[year] : suffixes[0];
  return `${year}${suffix} Year`;
};

const formatCategory = (cat: string): string => {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
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
    <Card className="overflow-hidden">
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${color}, transparent)` }}
      />
      <CardContent className="p-6 relative">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium",
                trend.positive ? "text-green-500" : "text-red-500"
              )}>
                <TrendingUp className={cn(
                  "h-3 w-3",
                  !trend.positive && "rotate-180"
                )} />
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
  );
}

// Year Overview Card Component
function YearOverviewCard({ stats, onClick }: { stats: YearStats; onClick: () => void }) {
  const participationRate = stats.totalStudents > 0 
    ? Math.round((stats.studentsWithCertificates / stats.totalStudents) * 100) 
    : 0;
  const approvalRate = stats.totalCertificates > 0 
    ? Math.round((stats.approved / stats.totalCertificates) * 100) 
    : 0;
  const color = YEAR_COLORS[stats.year as keyof typeof YEAR_COLORS] || '#6366f1';

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-300 group border-2 hover:border-primary/50"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
            >
              {stats.year}
            </div>
            <div>
              <CardTitle className="text-lg text-foreground">{getYearLabel(stats.year)}</CardTitle>
              <CardDescription>{stats.totalStudents} students enrolled</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {stats.studentsWithCertificates} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-2 rounded-lg bg-green-500/10">
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{stats.approved}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </div>
          <div className="p-2 rounded-lg bg-amber-500/10">
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="p-2 rounded-lg bg-red-500/10">
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{stats.rejected}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Participation</span>
            <span className="font-medium text-foreground">{participationRate}%</span>
          </div>
          <Progress value={participationRate} className="h-2" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Approval Rate</span>
            <span className="font-medium text-foreground">{approvalRate}%</span>
          </div>
          <Progress value={approvalRate} className="h-2 [&>div]:bg-green-500" />
        </div>
      </CardContent>
    </Card>
  );
}

// Main Component
export default function AdminAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeYearTab, setActiveYearTab] = useState<string>('overview');

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const { data: recordsData, error: recordsError } = await supabase
          .from('student_records')
          .select('id, student_id, title, category, status, created_at, academic_year')
          .not('certificate_url', 'is', null);

        if (recordsError) throw recordsError;

        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, department, year_of_study')
          .eq('role', 'student');

        if (profilesError) throw profilesError;

        setRecords(recordsData || []);
        setProfiles(profilesData || []);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Calculate stats per year
  const yearStats = useMemo((): YearStats[] => {
    const stats: Record<number, YearStats> = {};
    
    // Initialize stats for years 1-4
    for (let year = 1; year <= 4; year++) {
      const studentsInYear = profiles.filter(p => p.year_of_study === year);
      const studentIdsInYear = new Set(studentsInYear.map(s => s.id));
      const recordsForYear = records.filter(r => studentIdsInYear.has(r.student_id));
      const studentsWithCerts = new Set(recordsForYear.map(r => r.student_id)).size;
      
      const categoryBreakdown: Record<string, number> = {};
      recordsForYear.filter(r => r.status === 'approved').forEach(r => {
        categoryBreakdown[r.category] = (categoryBreakdown[r.category] || 0) + 1;
      });

      stats[year] = {
        year,
        totalStudents: studentsInYear.length,
        studentsWithCertificates: studentsWithCerts,
        totalCertificates: recordsForYear.length,
        approved: recordsForYear.filter(r => r.status === 'approved').length,
        pending: recordsForYear.filter(r => r.status === 'pending').length,
        rejected: recordsForYear.filter(r => r.status === 'rejected').length,
        categoryBreakdown,
      };
    }

    return Object.values(stats);
  }, [profiles, records]);

  // Overall stats
  const overallStats = useMemo(() => {
    const totalStudents = profiles.length;
    const totalRecords = records.length;
    const approved = records.filter(r => r.status === 'approved').length;
    const pending = records.filter(r => r.status === 'pending').length;
    const rejected = records.filter(r => r.status === 'rejected').length;
    const studentsWithCerts = new Set(records.map(r => r.student_id)).size;
    const participationRate = totalStudents > 0 ? Math.round((studentsWithCerts / totalStudents) * 100) : 0;
    const approvalRate = totalRecords > 0 ? Math.round((approved / totalRecords) * 100) : 0;

    return {
      totalStudents,
      totalRecords,
      approved,
      pending,
      rejected,
      studentsWithCerts,
      participationRate,
      approvalRate,
      avgCertsPerStudent: studentsWithCerts > 0 ? (approved / studentsWithCerts).toFixed(1) : '0',
    };
  }, [profiles, records]);

  // Year comparison chart data
  const yearComparisonData = useMemo(() => {
    return yearStats.map(s => ({
      year: getYearLabel(s.year),
      approved: s.approved,
      pending: s.pending,
      rejected: s.rejected,
      total: s.totalCertificates,
    }));
  }, [yearStats]);

  // Category breakdown across years
  const categoryYearData = useMemo(() => {
    const categories = ['academic', 'sports', 'cultural', 'technical', 'social', 'other'];
    return categories.map(cat => {
      const data: Record<string, unknown> = { category: formatCategory(cat) };
      yearStats.forEach(s => {
        data[`year${s.year}`] = s.categoryBreakdown[cat] || 0;
      });
      return data;
    });
  }, [yearStats]);

  // Monthly trends by year
  const monthlyTrendsByYear = useMemo(() => {
    const now = new Date();
    const trends: Record<string, Record<number, number>> = {};

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString('en-US', { month: 'short' });
      trends[key] = { 1: 0, 2: 0, 3: 0, 4: 0 };
    }

    // Map student_id to year_of_study
    const studentYearMap = new Map<string, number>();
    profiles.forEach(p => {
      if (p.year_of_study) studentYearMap.set(p.id, p.year_of_study);
    });

    // Count approved records per month per year
    records
      .filter(r => r.status === 'approved')
      .forEach(r => {
        const date = new Date(r.created_at);
        const key = date.toLocaleDateString('en-US', { month: 'short' });
        const year = studentYearMap.get(r.student_id) || 0;
        if (key in trends && year >= 1 && year <= 4) {
          trends[key][year]++;
        }
      });

    return Object.entries(trends).map(([month, years]) => ({
      month,
      year1: years[1],
      year2: years[2],
      year3: years[3],
      year4: years[4],
    }));
  }, [records, profiles]);

  // Category radar data for specific year
  const getCategoryRadarData = (year: number) => {
    const stats = yearStats.find(s => s.year === year);
    if (!stats) return [];

    const categories = ['academic', 'sports', 'cultural', 'technical', 'social'];
    const maxCount = Math.max(...categories.map(c => stats.categoryBreakdown[c] || 0), 1);

    return categories.map(cat => ({
      category: formatCategory(cat),
      value: stats.categoryBreakdown[cat] || 0,
      fullMark: maxCount,
    }));
  };

  // Get selected year details
  const selectedYearStats = useMemo(() => {
    if (activeYearTab === 'overview') return null;
    const year = parseInt(activeYearTab);
    return yearStats.find(s => s.year === year);
  }, [activeYearTab, yearStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading department analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          Department Analytics
        </h2>
        <p className="text-muted-foreground mt-1">
          Comprehensive overview of student achievements across all years
        </p>
      </div>

      {/* Overall Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Students"
          value={overallStats.totalStudents}
          description={`${overallStats.studentsWithCerts} actively participating`}
          icon={Users}
          color="#6366f1"
        />
        <StatsCard
          title="Total Certificates"
          value={overallStats.totalRecords}
          description={`${overallStats.avgCertsPerStudent} avg per student`}
          icon={FileCheck}
          color="#10b981"
        />
        <StatsCard
          title="Participation Rate"
          value={`${overallStats.participationRate}%`}
          description="Students with certificates"
          icon={Target}
          color="#f59e0b"
        />
        <StatsCard
          title="Approval Rate"
          value={`${overallStats.approvalRate}%`}
          description={`${overallStats.approved} approved, ${overallStats.pending} pending`}
          icon={CheckCircle}
          color="#22c55e"
        />
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{overallStats.approved}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Review</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{overallStats.pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rejected</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{overallStats.rejected}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Year Tabs */}
      <Tabs value={activeYearTab} onValueChange={setActiveYearTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Overview
          </TabsTrigger>
          {[1, 2, 3, 4].map(year => (
            <TabsTrigger key={year} value={year.toString()} className="flex items-center gap-2">
              <span 
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: YEAR_COLORS[year as keyof typeof YEAR_COLORS] }}
              >
                {year}
              </span>
              {getYearLabel(year)}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Year Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {yearStats.map(stats => (
              <YearOverviewCard 
                key={stats.year} 
                stats={stats} 
                onClick={() => setActiveYearTab(stats.year.toString())}
              />
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Year Comparison Bar Chart */}
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Certificates by Year
                </CardTitle>
                <CardDescription>Comparison of certificate submissions across years</CardDescription>
              </CardHeader>
              <CardContent className="overflow-hidden">
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearComparisonData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-muted-foreground" />
                      <YAxis dataKey="year" type="category" width={80} className="text-foreground" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="approved" stackId="a" fill={STATUS_COLORS.approved} name="Approved" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="pending" stackId="a" fill={STATUS_COLORS.pending} name="Pending" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="rejected" stackId="a" fill={STATUS_COLORS.rejected} name="Rejected" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Monthly Trends by Year */}
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Monthly Trends by Year
                </CardTitle>
                <CardDescription>Approved certificates over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent className="overflow-hidden">
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrendsByYear}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-muted-foreground" />
                      <YAxis className="text-muted-foreground" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="year1" stackId="1" stroke={YEAR_COLORS[1]} fill={YEAR_COLORS[1]} fillOpacity={0.6} name="1st Year" />
                      <Area type="monotone" dataKey="year2" stackId="1" stroke={YEAR_COLORS[2]} fill={YEAR_COLORS[2]} fillOpacity={0.6} name="2nd Year" />
                      <Area type="monotone" dataKey="year3" stackId="1" stroke={YEAR_COLORS[3]} fill={YEAR_COLORS[3]} fillOpacity={0.6} name="3rd Year" />
                      <Area type="monotone" dataKey="year4" stackId="1" stroke={YEAR_COLORS[4]} fill={YEAR_COLORS[4]} fillOpacity={0.6} name="4th Year" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Category Distribution by Year */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Category Distribution by Year
              </CardTitle>
              <CardDescription>How different categories are distributed across years</CardDescription>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <ChartContainer config={chartConfig} className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryYearData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="category" className="text-muted-foreground" />
                    <YAxis className="text-muted-foreground" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="year1" fill={YEAR_COLORS[1]} name="1st Year" />
                    <Bar dataKey="year2" fill={YEAR_COLORS[2]} name="2nd Year" />
                    <Bar dataKey="year3" fill={YEAR_COLORS[3]} name="3rd Year" />
                    <Bar dataKey="year4" fill={YEAR_COLORS[4]} name="4th Year" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Individual Year Tabs */}
        {[1, 2, 3, 4].map(year => (
          <TabsContent key={year} value={year.toString()} className="space-y-6">
            {selectedYearStats && (
              <>
                {/* Year Header */}
                <Card className="border-2" style={{ borderColor: `${YEAR_COLORS[year as keyof typeof YEAR_COLORS]}40` }}>
                  <CardContent className="py-6">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg"
                        style={{ background: `linear-gradient(135deg, ${YEAR_COLORS[year as keyof typeof YEAR_COLORS]}, ${YEAR_COLORS[year as keyof typeof YEAR_COLORS]}cc)` }}
                      >
                        {year}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-foreground">{getYearLabel(year)} Analytics</h3>
                        <p className="text-muted-foreground">{selectedYearStats.totalStudents} students enrolled • {selectedYearStats.studentsWithCertificates} actively participating</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{selectedYearStats.approved}</p>
                          <p className="text-xs text-muted-foreground">Approved</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{selectedYearStats.pending}</p>
                          <p className="text-xs text-muted-foreground">Pending</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-red-600 dark:text-red-400">{selectedYearStats.rejected}</p>
                          <p className="text-xs text-muted-foreground">Rejected</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Year Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <StatsCard
                    title="Total Students"
                    value={selectedYearStats.totalStudents}
                    icon={Users}
                    color={YEAR_COLORS[year as keyof typeof YEAR_COLORS]}
                  />
                  <StatsCard
                    title="Participation"
                    value={`${selectedYearStats.totalStudents > 0 ? Math.round((selectedYearStats.studentsWithCertificates / selectedYearStats.totalStudents) * 100) : 0}%`}
                    description={`${selectedYearStats.studentsWithCertificates} students with certificates`}
                    icon={Target}
                    color="#f59e0b"
                  />
                  <StatsCard
                    title="Total Certificates"
                    value={selectedYearStats.totalCertificates}
                    icon={FileCheck}
                    color="#10b981"
                  />
                  <StatsCard
                    title="Approval Rate"
                    value={`${selectedYearStats.totalCertificates > 0 ? Math.round((selectedYearStats.approved / selectedYearStats.totalCertificates) * 100) : 0}%`}
                    icon={CheckCircle}
                    color="#22c55e"
                  />
                </div>

                {/* Charts for Year */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Category Distribution Pie */}
                  <Card className="overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-foreground">Category Distribution</CardTitle>
                      <CardDescription>Breakdown of approved certificates by category</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-hidden">
                      <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={Object.entries(selectedYearStats.categoryBreakdown)
                                .map(([category, count]) => ({
                                  category: formatCategory(category),
                                  count,
                                  fill: CATEGORY_COLORS[category] || CATEGORY_COLORS.other,
                                }))}
                              dataKey="count"
                              nameKey="category"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              label={({ category, count }) => `${category}: ${count}`}
                            >
                              {Object.entries(selectedYearStats.categoryBreakdown).map(([category]) => (
                                <Cell key={category} fill={CATEGORY_COLORS[category] || CATEGORY_COLORS.other} />
                              ))}
                            </Pie>
                            <ChartTooltip content={<ChartTooltipContent />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  {/* Category Radar */}
                  <Card className="overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-foreground">Category Performance</CardTitle>
                      <CardDescription>Radar view of category achievements</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-hidden">
                      <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={getCategoryRadarData(year)}>
                            <PolarGrid className="stroke-muted" />
                            <PolarAngleAxis dataKey="category" className="text-foreground" />
                            <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                            <Radar
                              name="Certificates"
                              dataKey="value"
                              stroke={YEAR_COLORS[year as keyof typeof YEAR_COLORS]}
                              fill={YEAR_COLORS[year as keyof typeof YEAR_COLORS]}
                              fillOpacity={0.5}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Category Cards */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      Category Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {Object.entries(CATEGORY_COLORS).map(([category, color]) => {
                        const count = selectedYearStats.categoryBreakdown[category] || 0;
                        return (
                          <div 
                            key={category}
                            className="p-4 rounded-xl border border-border text-center"
                            style={{ background: `linear-gradient(135deg, ${color}10, transparent)` }}
                          >
                            <div 
                              className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
                              style={{ backgroundColor: `${color}20` }}
                            >
                              <Star className="w-5 h-5" style={{ color }} />
                            </div>
                            <p className="text-2xl font-bold text-foreground">{count}</p>
                            <p className="text-xs text-muted-foreground capitalize">{category}</p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
