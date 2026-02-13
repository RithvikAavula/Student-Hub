import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
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
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar,
  Tooltip,
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
  Calendar,
  Sparkles,
  Star,
  Zap,
  Target,
  Flame,
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
  activity_date: string;
}

interface Profile {
  id: string;
  full_name: string;
  department: string | null;
  year_of_study: number | null;
  avatar_path: string | null;
}

interface LeaderboardEntry {
  rank: number;
  studentId: string;
  fullName: string;
  department: string;
  yearOfStudy: number;
  totalCertificates: number;
  avatarUrl: string | null;
}

interface CategoryStat {
  category: string;
  count: number;
  fill: string;
}

interface MonthlyTrend {
  month: string;
  certificates: number;
}

interface TopAchievement {
  title: string;
  count: number;
  category: string;
  fill: string;
}

interface RecentAchievement {
  id: string;
  title: string;
  category: string;
  studentName: string;
  date: string;
  avatarUrl: string | null;
}

// Vibrant color palette for charts
const CATEGORY_COLORS: Record<string, string> = {
  academic: '#6366f1',
  sports: '#10b981',
  cultural: '#f59e0b',
  technical: '#8b5cf6',
  social: '#ec4899',
  other: '#64748b',
};

const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
  academic: ['#818cf8', '#4f46e5'],
  sports: ['#34d399', '#059669'],
  cultural: ['#fbbf24', '#d97706'],
  technical: ['#a78bfa', '#7c3aed'],
  social: ['#f472b6', '#db2777'],
  other: ['#94a3b8', '#475569'],
};

const ACHIEVEMENT_ICONS: Record<string, React.ElementType> = {
  academic: GraduationCap,
  sports: Trophy,
  cultural: Star,
  technical: Zap,
  social: Users,
  other: Award,
};

const STATUS_COLORS: Record<string, string> = {
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
  certificates: { label: 'Certificates', color: '#00A884' },
  approved: { label: 'Approved', color: STATUS_COLORS.approved },
  pending: { label: 'Pending', color: STATUS_COLORS.pending },
  rejected: { label: 'Rejected', color: STATUS_COLORS.rejected },
};

// Utility functions
const getAvatarUrl = (path: string | null): string | null => {
  if (!path) return null;
  const { data } = supabase.storage.from('profile').getPublicUrl(path);
  return data.publicUrl;
};

const formatCategory = (cat: string): string => {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
};

const getYearLabel = (year: number): string => {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const suffix = year <= 3 ? suffixes[year] : suffixes[0];
  return `${year}${suffix} Year`;
};

// Rank Icon Component
function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) {
    return <Crown className="h-6 w-6 text-yellow-500 animate-pulse" />;
  }
  if (rank === 2) {
    return <Medal className="h-5 w-5 text-gray-400" />;
  }
  if (rank === 3) {
    return <Award className="h-5 w-5 text-amber-600" />;
  }
  return (
    <span className="text-sm font-medium text-muted-foreground w-6 text-center">
      #{rank}
    </span>
  );
}

// Stats Card Component
function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  color,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: { value: number; positive: boolean };
  color: string;
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
            <p className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{value}</p>
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

// Leaderboard Row Component
function LeaderboardRow({ entry, index }: { entry: LeaderboardEntry; index: number }) {
  const isTopThree = entry.rank <= 3;
  
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl transition-all duration-300 select-none",
        isTopThree 
          ? "bg-gradient-to-r from-yellow-500/5 via-amber-500/5 to-orange-500/5 border border-amber-500/20 shadow-sm" 
          : "bg-muted/30 border border-transparent"
      )}
      style={{
        animationDelay: `${index * 50}ms`,
        animation: 'fadeInUp 0.5s ease-out forwards',
      }}
    >
      {/* Rank */}
      <div className={cn(
        "flex items-center justify-center w-10 h-10 rounded-lg",
        entry.rank === 1 && "bg-gradient-to-br from-yellow-400 to-amber-500",
        entry.rank === 2 && "bg-gradient-to-br from-gray-300 to-gray-400",
        entry.rank === 3 && "bg-gradient-to-br from-amber-500 to-orange-600",
        entry.rank > 3 && "bg-muted"
      )}>
        {entry.rank <= 3 ? (
          <span className="text-white font-bold text-lg">{entry.rank}</span>
        ) : (
          <span className="text-muted-foreground font-medium">#{entry.rank}</span>
        )}
      </div>

      {/* Avatar */}
      <Avatar className={cn(
        "h-12 w-12 ring-2 transition-all shadow-md",
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
              Top Performer
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-3 w-3" />
          <span className="truncate">{entry.department}</span>
          <span className="text-muted-foreground/50">•</span>
          <GraduationCap className="h-3 w-3" />
          <span>{getYearLabel(entry.yearOfStudy)}</span>
        </div>
      </div>

      {/* Certificate Count */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">{entry.totalCertificates}</p>
          <p className="text-xs text-muted-foreground">certificates</p>
        </div>
        <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
          <FileCheck className="h-5 w-5 text-indigo-500" />
        </div>
      </div>
    </div>
  );
}

// Main Component
export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch all student records with certificates
        const { data: recordsData, error: recordsError } = await supabase
          .from('student_records')
          .select('*')
          .not('certificate_url', 'is', null);

        if (recordsError) throw recordsError;

        // Fetch all student profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, department, year_of_study, avatar_path')
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

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set<string>();
    profiles.forEach(p => {
      if (p.department) depts.add(p.department);
    });
    return Array.from(depts).sort();
  }, [profiles]);

  // Filter records based on status (only approved certificates count)
  const approvedRecords = useMemo(() => {
    return records.filter(r => r.status === 'approved');
  }, [records]);

  // Category statistics
  const categoryStats = useMemo((): CategoryStat[] => {
    const counts: Record<string, number> = {};
    approvedRecords.forEach(r => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    return Object.entries(counts).map(([category, count]) => ({
      category: formatCategory(category),
      count,
      fill: CATEGORY_COLORS[category] || CATEGORY_COLORS.other,
    })).sort((a, b) => b.count - a.count);
  }, [approvedRecords]);

  // Status statistics
  const statusStats = useMemo(() => {
    const counts: Record<string, number> = {};
    records.forEach(r => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({
      name: formatCategory(status),
      value: count,
      fill: STATUS_COLORS[status] || '#6b7280',
    }));
  }, [records]);

  // Monthly trends (last 6 months)
  const monthlyTrends = useMemo((): MonthlyTrend[] => {
    const trends: Record<string, number> = {};
    const now = new Date();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      trends[key] = 0;
    }

    // Count certificates per month
    approvedRecords.forEach(r => {
      const date = new Date(r.created_at);
      const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (key in trends) {
        trends[key]++;
      }
    });

    return Object.entries(trends).map(([month, certificates]) => ({
      month,
      certificates,
    }));
  }, [approvedRecords]);

  // Top achievements by title (most common certificate names)
  const topAchievements = useMemo((): TopAchievement[] => {
    const titleCounts: Record<string, { count: number; category: string }> = {};
    approvedRecords.forEach(r => {
      const title = r.title.trim();
      if (!titleCounts[title]) {
        titleCounts[title] = { count: 0, category: r.category };
      }
      titleCounts[title].count++;
    });

    return Object.entries(titleCounts)
      .map(([title, data]) => ({
        title: title.length > 30 ? title.substring(0, 30) + '...' : title,
        count: data.count,
        category: data.category,
        fill: CATEGORY_COLORS[data.category] || CATEGORY_COLORS.other,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [approvedRecords]);

  // Recent achievements for showcase
  const recentAchievements = useMemo((): RecentAchievement[] => {
    const profileMap = new Map<string, Profile>();
    profiles.forEach(p => profileMap.set(p.id, p));

    return approvedRecords
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6)
      .map(r => {
        const profile = profileMap.get(r.student_id);
        return {
          id: r.id,
          title: r.title,
          category: r.category,
          studentName: profile?.full_name || 'Unknown',
          date: new Date(r.created_at).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          }),
          avatarUrl: getAvatarUrl(profile?.avatar_path || null),
        };
      });
  }, [approvedRecords, profiles]);

  // Radial chart data for categories
  const radialCategoryData = useMemo(() => {
    const maxCount = Math.max(...categoryStats.map(c => c.count), 1);
    return categoryStats.slice(0, 6).map((stat, index) => ({
      ...stat,
      fill: CATEGORY_COLORS[stat.category.toLowerCase()] || CATEGORY_COLORS.other,
      percentage: Math.round((stat.count / maxCount) * 100),
    }));
  }, [categoryStats]);

  // Build leaderboard with proper filtering
  const leaderboardData = useMemo((): LeaderboardEntry[] => {
    // Create a map of student IDs to their profile
    const profileMap = new Map<string, Profile>();
    profiles.forEach(p => profileMap.set(p.id, p));

    // Count certificates per student (only approved)
    const studentCounts: Record<string, number> = {};
    approvedRecords.forEach(r => {
      studentCounts[r.student_id] = (studentCounts[r.student_id] || 0) + 1;
    });

    // Build entries with profile info
    let entries: LeaderboardEntry[] = [];
    Object.entries(studentCounts).forEach(([studentId, count]) => {
      const profile = profileMap.get(studentId);
      if (!profile) return;
      
      // Apply filters
      if (selectedDepartment !== 'all' && profile.department !== selectedDepartment) return;
      if (selectedYear !== 'all' && profile.year_of_study !== parseInt(selectedYear)) return;

      entries.push({
        rank: 0, // Will be set after sorting
        studentId,
        fullName: profile.full_name,
        department: profile.department || 'Unknown',
        yearOfStudy: profile.year_of_study || 0,
        totalCertificates: count,
        avatarUrl: getAvatarUrl(profile.avatar_path),
      });
    });

    // Sort by certificate count and assign ranks
    entries.sort((a, b) => b.totalCertificates - a.totalCertificates);
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return entries;
  }, [approvedRecords, profiles, selectedDepartment, selectedYear]);

  // Summary stats
  const totalCertificates = approvedRecords.length;
  const totalStudents = new Set(approvedRecords.map(r => r.student_id)).size;
  const avgPerStudent = totalStudents > 0 
    ? (totalCertificates / totalStudents).toFixed(1) 
    : '0';

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

  return (
    <div className="space-y-8">
      {/* CSS for animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 5px rgba(99, 102, 241, 0.3); }
          50% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.6); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        
        .chart-enter {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        
        .achievement-card {
          transition: none;
        }
        
        .gradient-border {
          background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899);
          padding: 2px;
          border-radius: 16px;
        }
        
        .sparkle-bg {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1));
        }
        
        .glow-text {
          text-shadow: 0 0 20px rgba(99, 102, 241, 0.5);
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent glow-text">
            Certificate Analytics
          </h2>
          <p className="text-muted-foreground mt-1">
            Insights, achievements, and rankings based on uploaded certificates
          </p>
        </div>
        <Badge variant="outline" className="text-sm py-1.5 px-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/30">
          <Sparkles className="h-4 w-4 mr-2 text-indigo-500" />
          Live Data
        </Badge>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Certificates"
          value={totalCertificates}
          description="Approved uploads"
          icon={FileCheck}
          color="#10b981"
        />
        <StatsCard
          title="Active Students"
          value={totalStudents}
          description="With certificates"
          icon={Users}
          color="#6366f1"
        />
        <StatsCard
          title="Avg. per Student"
          value={avgPerStudent}
          description="Certificates uploaded"
          icon={Target}
          color="#f59e0b"
        />
        <StatsCard
          title="Top Achievement"
          value={topAchievements[0]?.title.substring(0, 15) + (topAchievements[0]?.title.length > 15 ? '...' : '') || 'N/A'}
          description={topAchievements[0] ? `${topAchievements[0].count} students` : ''}
          icon={Flame}
          color="#ec4899"
        />
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="achievements" className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-3 p-1 bg-muted/50">
          <TabsTrigger value="achievements" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
            <Sparkles className="h-4 w-4 mr-2" />
            Achievements
          </TabsTrigger>
          <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
            <BarChart3 className="h-4 w-4 mr-2" />
            Charts
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
            <Trophy className="h-4 w-4 mr-2" />
            Leaderboard
          </TabsTrigger>
        </TabsList>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-6">
          {/* Recent Achievements Showcase */}
          <Card className="chart-enter overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
                  <Star className="h-5 w-5 text-white" />
                </div>
                Recent Achievements
              </CardTitle>
              <CardDescription>
                Latest approved certificates from students
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recentAchievements.map((achievement, index) => {
                  const Icon = ACHIEVEMENT_ICONS[achievement.category] || Award;
                  const colors = CATEGORY_GRADIENTS[achievement.category] || CATEGORY_GRADIENTS.other;
                  return (
                    <div 
                      key={achievement.id}
                      className="achievement-card relative p-4 rounded-xl border bg-card overflow-hidden"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div 
                        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 -translate-y-1/2 translate-x-1/2"
                        style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
                      />
                      <div className="flex items-start gap-3">
                        <div 
                          className="p-2.5 rounded-xl shrink-0"
                          style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
                        >
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{achievement.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={achievement.avatarUrl || undefined} />
                              <AvatarFallback className="text-[10px] bg-muted">
                                {achievement.studentName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground truncate">
                              {achievement.studentName}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <Badge 
                              variant="secondary" 
                              className="text-[10px] px-2 py-0"
                              style={{ 
                                backgroundColor: `${CATEGORY_COLORS[achievement.category]}15`,
                                color: CATEGORY_COLORS[achievement.category] 
                              }}
                            >
                              {formatCategory(achievement.category)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{achievement.date}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {recentAchievements.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No achievements yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Achievements Chart */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="chart-enter" style={{ animationDelay: '100ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
                    <Trophy className="h-5 w-5 text-white" />
                  </div>
                  Top Certificate Titles
                </CardTitle>
                <CardDescription>
                  Most popular achievement names
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[320px]">
                  <BarChart data={topAchievements} margin={{ left: 0, right: 20, top: 10, bottom: 80 }}>
                    <defs>
                      {topAchievements.map((entry, index) => (
                        <linearGradient key={`gradient-${index}`} id={`barGradient-${index}`} x1="0" y1="1" x2="0" y2="0">
                          <stop offset="0%" stopColor={entry.fill} stopOpacity={0.7} />
                          <stop offset="100%" stopColor={entry.fill} stopOpacity={1} />
                        </linearGradient>
                      ))}
                    </defs>
                    <XAxis 
                      dataKey="title" 
                      tick={(props: any) => {
                        const { x, y, payload } = props;
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text x={0} y={0} dy={10} textAnchor="end" fill="currentColor" fontSize={9} transform="rotate(-45)">
                              {payload.value.length > 15 ? payload.value.substring(0, 15) + '...' : payload.value}
                            </text>
                          </g>
                        );
                      }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      height={80}
                    />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border rounded-lg shadow-lg p-3">
                              <p className="font-semibold text-sm">{data.title}</p>
                              <p className="text-xs text-muted-foreground">Category: {data.category}</p>
                              <p className="text-xs font-medium mt-1">{data.count} certificates</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      radius={[8, 8, 0, 0]}
                      animationDuration={1200}
                      animationBegin={0}
                      maxBarSize={50}
                    >
                      {topAchievements.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#barGradient-${index})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Category Radial Chart */}
            <Card className="chart-enter" style={{ animationDelay: '200ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  Category Distribution
                </CardTitle>
                <CardDescription>
                  Achievement breakdown by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <ChartContainer config={chartConfig} className="h-[280px] flex-1 pointer-events-none">
                    <RadialBarChart 
                      cx="50%" 
                      cy="50%" 
                      innerRadius="20%" 
                      outerRadius="90%" 
                      data={radialCategoryData}
                      startAngle={180}
                      endAngle={-180}
                    >
                      <RadialBar
                        background={{ fill: 'hsl(var(--muted))' }}
                        dataKey="count"
                        cornerRadius={10}
                        animationDuration={1500}
                      >
                        {radialCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </RadialBar>
                    </RadialBarChart>
                  </ChartContainer>
                  <div className="space-y-2 min-w-[140px]">
                    {radialCategoryData.map((cat, index) => {
                      const Icon = ACHIEVEMENT_ICONS[cat.category.toLowerCase()] || Award;
                      return (
                        <div key={index} className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: cat.fill }}
                          />
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm truncate">{cat.category}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{cat.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          {/* Charts Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Certificate Names Bar Chart */}
            <Card className="chart-enter">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  Top Certificates
                </CardTitle>
                <CardDescription>
                  Most popular certificate names
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[320px]">
                  <BarChart data={topAchievements} margin={{ left: 0, right: 20, top: 10, bottom: 80 }}>
                    <defs>
                      {topAchievements.map((entry, index) => (
                        <linearGradient key={`catGrad-${index}`} id={`catGradient-${index}`} x1="0" y1="1" x2="0" y2="0">
                          <stop offset="0%" stopColor={entry.fill} stopOpacity={0.7} />
                          <stop offset="100%" stopColor={entry.fill} stopOpacity={1} />
                        </linearGradient>
                      ))}
                    </defs>
                    <XAxis 
                      dataKey="title" 
                      tick={(props: any) => {
                        const { x, y, payload } = props;
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text x={0} y={0} dy={10} textAnchor="end" fill="currentColor" fontSize={9} transform="rotate(-45)">
                              {payload.value.length > 15 ? payload.value.substring(0, 15) + '...' : payload.value}
                            </text>
                          </g>
                        );
                      }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      height={80}
                    />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border rounded-lg shadow-lg p-3">
                              <p className="font-semibold text-sm">{data.title}</p>
                              <p className="text-xs text-muted-foreground">Category: {data.category}</p>
                              <p className="text-xs font-medium mt-1">{data.count} certificates</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      radius={[8, 8, 0, 0]}
                      animationDuration={1000}
                      animationBegin={0}
                      maxBarSize={50}
                    >
                      {topAchievements.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#catGradient-${index})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Category Donut Chart */}
            <Card className="chart-enter overflow-hidden" style={{ animationDelay: '100ms' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  Category Distribution
                </CardTitle>
                <CardDescription>
                  Breakdown of certificates by category
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <PieChart>
                    <defs>
                      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2"/>
                      </filter>
                      {categoryStats.map((entry, index) => (
                        <linearGradient key={`donutGrad-${index}`} id={`donutGradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={entry.fill} stopOpacity={0.9} />
                          <stop offset="100%" stopColor={entry.fill} stopOpacity={1} />
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie
                      data={categoryStats}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      animationDuration={1000}
                      animationBegin={0}
                      style={{ filter: 'url(#shadow)' }}
                    >
                      {categoryStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#donutGradient-${index})`} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border rounded-lg shadow-lg p-3">
                              <p className="font-semibold text-sm">{data.category}</p>
                              <p className="text-xs font-medium mt-1">{data.count} certificates</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Monthly Trend Line Chart */}
            <Card className="lg:col-span-2 chart-enter overflow-hidden" style={{ animationDelay: '200ms' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5 pointer-events-none" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  Upload Trends
                </CardTitle>
                <CardDescription>
                  Approved certificates uploaded over the last 6 months
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <ChartContainer config={chartConfig} className="h-[300px] pointer-events-none">
                  <AreaChart data={monthlyTrends}>
                    <defs>
                      <linearGradient id="colorCertificates" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="50%" stopColor="#14b8a6" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="certificates"
                      stroke="url(#strokeGradient)"
                      strokeWidth={3}
                      fill="url(#colorCertificates)"
                      animationDuration={1500}
                      animationBegin={0}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          {/* Leaderboard Section */}
          <Card className="overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-amber-500/5 to-orange-500/5 pointer-events-none" />
            <CardHeader className="relative">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-500">
                      <Trophy className="h-5 w-5 text-white" />
                    </div>
                    Student Leaderboard
                  </CardTitle>
                  <CardDescription>
                    Rankings based on approved certificate uploads
                  </CardDescription>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger className="w-[200px] bg-background/80 backdrop-blur-sm">
                      <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[150px] bg-background/80 backdrop-blur-sm">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              {/* Filter Info */}
              {(selectedDepartment !== 'all' || selectedYear !== 'all') && (
                <div className="mb-4 p-3 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Showing rankings for:{' '}
                    <span className="font-medium text-foreground">
                      {selectedDepartment !== 'all' ? selectedDepartment : 'All Departments'}
                    </span>
                    {' • '}
                    <span className="font-medium text-foreground">
                      {selectedYear !== 'all' ? getYearLabel(parseInt(selectedYear)) : 'All Years'}
                    </span>
                  </p>
                </div>
              )}

              {/* Leaderboard List */}
              {leaderboardData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold">No students found</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedDepartment !== 'all' || selectedYear !== 'all'
                      ? 'Try adjusting your filters to see more results'
                      : 'No approved certificates have been uploaded yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leaderboardData.slice(0, 20).map((entry, index) => (
                    <LeaderboardRow key={entry.studentId} entry={entry} index={index} />
                  ))}
                  {leaderboardData.length > 20 && (
                    <p className="text-center text-sm text-muted-foreground pt-4">
                      Showing top 20 of {leaderboardData.length} students
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
