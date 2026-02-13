/**
 * Student Analytics Dashboard
 * 
 * A personalized analytics view for students showing:
 * - Their own submission statistics
 * - Category breakdown of their records
 * - Monthly trends
 * - Their personal ranking in the leaderboard (only their position)
 */

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Tooltip,
} from 'recharts';
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  FileCheck,
  BarChart3,
  Crown,
  Loader2,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  Sparkles,
  Star,
  Zap,
  Users,
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

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  academic: GraduationCap,
  sports: Trophy,
  cultural: Star,
  technical: Zap,
  social: Users,
  other: Award,
};

const chartConfig: ChartConfig = {
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
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  color: string;
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

// Rank Display Component
function RankDisplay({ 
  rank, 
  totalStudents,
  studentName,
  avatarUrl,
  approvedCount,
  department,
  yearOfStudy,
}: { 
  rank: number;
  totalStudents: number;
  studentName: string;
  avatarUrl: string | null;
  approvedCount: number;
  department: string;
  yearOfStudy: number;
}) {
  const isTopThree = rank <= 3;
  const percentile = totalStudents > 0 ? Math.round(((totalStudents - rank + 1) / totalStudents) * 100) : 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      <Card className={cn(
        "overflow-hidden",
        isTopThree && "border-2 border-yellow-500/30"
      )}>
        {/* Background gradient for top performers */}
        {isTopThree && (
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-amber-500/10 to-orange-500/5 pointer-events-none" />
        )}
        
        <CardContent className="p-8 relative">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Rank Badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className={cn(
                "relative w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-xl",
                rank === 1 && "bg-gradient-to-br from-yellow-400 to-amber-500",
                rank === 2 && "bg-gradient-to-br from-gray-300 to-gray-400",
                rank === 3 && "bg-gradient-to-br from-amber-500 to-orange-600",
                rank > 3 && "bg-gradient-to-br from-indigo-500 to-purple-500"
              )}
            >
              {rank <= 3 ? (
                <>
                  <span>#{rank}</span>
                  {rank === 1 && (
                    <Crown className="absolute -top-3 -right-3 h-8 w-8 text-yellow-500 drop-shadow-lg" />
                  )}
                  {rank === 2 && (
                    <Medal className="absolute -top-2 -right-2 h-6 w-6 text-gray-400 drop-shadow-lg" />
                  )}
                  {rank === 3 && (
                    <Award className="absolute -top-2 -right-2 h-6 w-6 text-amber-600 drop-shadow-lg" />
                  )}
                </>
              ) : (
                <span>#{rank}</span>
              )}
            </motion.div>

            {/* Student Info */}
            <div className="space-y-3">
              <Avatar className="h-20 w-20 mx-auto ring-4 ring-primary/20 shadow-lg">
                <AvatarImage src={avatarUrl || undefined} className="object-cover" />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                  {studentName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h3 className="text-xl font-bold">{studentName}</h3>
                <p className="text-sm text-muted-foreground">
                  {department} • {getYearLabel(yearOfStudy)}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 w-full max-w-md">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{approvedCount}</p>
                <p className="text-xs text-muted-foreground">Approved Certificates</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{rank}</p>
                <p className="text-xs text-muted-foreground">Your Rank</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-500">{percentile}%</p>
                <p className="text-xs text-muted-foreground">Percentile</p>
              </div>
            </div>

            {/* Encouragement message */}
            {rank <= 3 ? (
              <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0 text-sm px-4 py-1.5">
                <Trophy className="h-4 w-4 mr-2" />
                {rank === 1 ? 'Top Performer!' : rank === 2 ? 'Excellent Work!' : 'Great Achievement!'}
              </Badge>
            ) : rank <= 10 ? (
              <Badge variant="outline" className="text-sm px-4 py-1.5">
                <Star className="h-4 w-4 mr-2" />
                Top 10 - Keep it up!
              </Badge>
            ) : (
              <p className="text-sm text-muted-foreground">
                Upload more certificates to improve your ranking!
              </p>
            )}

            {/* Progress to next rank */}
            {rank > 1 && (
              <div className="w-full max-w-xs space-y-2">
                <p className="text-xs text-muted-foreground text-center">
                  Progress indicator
                </p>
                <Progress value={percentile} className="h-2" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Main Component
export default function StudentAnalyticsDashboard() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [myRecords, setMyRecords] = useState<StudentRecord[]>([]);
  const [allRecords, setAllRecords] = useState<StudentRecord[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;
      
      setLoading(true);
      try {
        // 1. Get student's own records
        const { data: myRecordsData, error: myRecordsError } = await supabase
          .from('student_records')
          .select('*')
          .eq('student_id', user.id);

        if (myRecordsError) throw myRecordsError;
        setMyRecords(myRecordsData || []);

        // 2. Get all approved records (for leaderboard calculation)
        const { data: allRecordsData, error: allRecordsError } = await supabase
          .from('student_records')
          .select('*')
          .eq('status', 'approved');

        if (allRecordsError) throw allRecordsError;
        setAllRecords(allRecordsData || []);

        // 3. Get all student profiles (for leaderboard)
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, department, year_of_study, section, avatar_path')
          .eq('role', 'student');

        if (profilesError) throw profilesError;
        setAllProfiles(profilesData || []);

      } catch (error) {
        console.error('Error fetching student analytics:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user?.id]);

  // Calculate my stats
  const myStats = useMemo(() => {
    const total = myRecords.length;
    const approved = myRecords.filter(r => r.status === 'approved').length;
    const pending = myRecords.filter(r => r.status === 'pending').length;
    const rejected = myRecords.filter(r => r.status === 'rejected').length;
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
    
    return { total, approved, pending, rejected, approvalRate };
  }, [myRecords]);

  // My category breakdown
  const myCategoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    myRecords.forEach(r => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([category, count]) => ({
        name: category.charAt(0).toUpperCase() + category.slice(1),
        category,
        value: count,
        fill: CATEGORY_COLORS[category] || CATEGORY_COLORS.other,
      }))
      .sort((a, b) => b.value - a.value);
  }, [myRecords]);

  // My monthly trends
  const myMonthlyTrends = useMemo(() => {
    const trends: Record<string, { approved: number; pending: number; rejected: number }> = {};
    const now = new Date();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString('en-US', { month: 'short' });
      trends[key] = { approved: 0, pending: 0, rejected: 0 };
    }

    myRecords.forEach(r => {
      const date = new Date(r.created_at);
      const key = date.toLocaleDateString('en-US', { month: 'short' });
      if (trends[key]) {
        trends[key][r.status]++;
      }
    });

    return Object.entries(trends).map(([month, data]) => ({
      month,
      total: data.approved + data.pending + data.rejected,
      ...data,
    }));
  }, [myRecords]);

  // Calculate my rank
  const myRankData = useMemo(() => {
    // Count approved certificates per student
    const studentCounts: Record<string, number> = {};
    allRecords.forEach(r => {
      studentCounts[r.student_id] = (studentCounts[r.student_id] || 0) + 1;
    });

    // Sort students by count
    const sortedStudents = Object.entries(studentCounts)
      .sort((a, b) => b[1] - a[1]);

    // Find my rank
    const myIndex = sortedStudents.findIndex(([id]) => id === user?.id);
    const myRank = myIndex === -1 ? sortedStudents.length + 1 : myIndex + 1;
    const myApproved = studentCounts[user?.id || ''] || 0;
    const totalStudents = sortedStudents.length;

    return { myRank, myApproved, totalStudents };
  }, [allRecords, user?.id]);

  // Status pie chart data
  const statusPieData = useMemo(() => [
    { name: 'Approved', value: myStats.approved, fill: STATUS_COLORS.approved },
    { name: 'Pending', value: myStats.pending, fill: STATUS_COLORS.pending },
    { name: 'Rejected', value: myStats.rejected, fill: STATUS_COLORS.rejected },
  ].filter(d => d.value > 0), [myStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-primary" />
          My Analytics
        </h2>
        <p className="text-muted-foreground mt-1">
          Your personal submission statistics and ranking
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Submissions"
          value={myStats.total}
          description="All your records"
          icon={FileCheck}
          color="#6366f1"
        />
        <StatsCard
          title="Approved"
          value={myStats.approved}
          description={`${myStats.approvalRate}% approval rate`}
          icon={CheckCircle2}
          color={STATUS_COLORS.approved}
        />
        <StatsCard
          title="Pending Review"
          value={myStats.pending}
          description="Awaiting approval"
          icon={Clock}
          color={STATUS_COLORS.pending}
        />
        <StatsCard
          title="Your Rank"
          value={`#${myRankData.myRank}`}
          description={`of ${myRankData.totalStudents} students`}
          icon={Trophy}
          color="#f59e0b"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3 p-1 bg-muted/50">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="trends" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <TrendingUp className="h-4 w-4 mr-2" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="ranking" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Trophy className="h-4 w-4 mr-2" />
            My Ranking
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
                  Breakdown of your submission statuses
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
                    <div className="text-center">
                      <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No submissions yet</p>
                      <p className="text-sm">Upload your first certificate to see stats</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Category Breakdown
                </CardTitle>
                <CardDescription>
                  Your submissions by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myCategoryStats.length > 0 ? (
                  <div className="space-y-4">
                    {myCategoryStats.map((stat, index) => {
                      const Icon = CATEGORY_ICONS[stat.category] || Award;
                      const percentage = myStats.total > 0 ? Math.round((stat.value / myStats.total) * 100) : 0;
                      return (
                        <motion.div
                          key={stat.category}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center gap-4"
                        >
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${stat.fill}20` }}
                          >
                            <Icon className="h-5 w-5" style={{ color: stat.fill }} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{stat.name}</span>
                              <span className="text-sm text-muted-foreground">{stat.value}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: stat.fill }}
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    <p>No category data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Monthly Submission Trends
              </CardTitle>
              <CardDescription>
                Your submissions over the last 6 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={myMonthlyTrends}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#6366f1" 
                    fill="url(#colorTotal)" 
                    name="Total Submissions"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status trends stacked */}
          <Card>
            <CardHeader>
              <CardTitle>Status Breakdown by Month</CardTitle>
              <CardDescription>
                How your submissions were processed each month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={myMonthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="approved" stackId="a" fill={STATUS_COLORS.approved} name="Approved" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pending" stackId="a" fill={STATUS_COLORS.pending} name="Pending" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="rejected" stackId="a" fill={STATUS_COLORS.rejected} name="Rejected" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ranking Tab */}
        <TabsContent value="ranking" className="space-y-6">
          <div className="max-w-xl mx-auto">
            <RankDisplay
              rank={myRankData.myRank}
              totalStudents={myRankData.totalStudents}
              studentName={profile?.full_name || 'Student'}
              avatarUrl={user?.avatar || null}
              approvedCount={myRankData.myApproved}
              department={profile?.department || 'Unknown'}
              yearOfStudy={profile?.year_of_study || 1}
            />
          </div>
          
          {/* Tips to improve */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                Tips to Improve Your Ranking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <span>Upload certificates with clear, legible images for faster approval</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <span>Participate in various activities to diversify your portfolio</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <span>Ensure all certificate details are accurate before submission</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <span>Regular submissions help maintain an active profile</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
