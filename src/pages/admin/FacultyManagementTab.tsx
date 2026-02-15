import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Users, Mail, Calendar, UserCog, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

export default function FacultyManagementTab() {
  const [faculty, setFaculty] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchFaculty();
  }, []);

  const fetchFaculty = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'faculty')
        .order('department', { ascending: true })
        .order('full_name', { ascending: true });

      if (error) throw error;
      setFaculty(data || []);
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

  const filteredFaculty = faculty.filter((f) =>
    f.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group faculty by department
  const facultyByDepartment = filteredFaculty.reduce((acc, f) => {
    const dept = f.department || 'Unassigned';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(f);
    return acc;
  }, {} as Record<string, Profile[]>);

  const departments = Object.keys(facultyByDepartment).sort();

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
      {/* Search Bar */}
      <motion.div variants={itemVariants}>
        <Card className="border-primary/20 shadow-lg shadow-primary/5">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search faculty by name, email, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 transition-all focus:shadow-lg focus:shadow-primary/10"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Overview */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-1">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Faculty</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">{faculty.length}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <UserCog className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Departments</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">{departments.length}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Building2 className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300 hover:-translate-y-1">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Faculty</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">{filteredFaculty.length}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Faculty by Department */}
      <div className="space-y-6">
        {departments.map((dept, deptIndex) => (
          <motion.div key={dept} variants={itemVariants}>
            <Card className="overflow-hidden border-border/50 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-foreground">{dept}</span>
                  </div>
                  <span className="text-sm font-normal px-3 py-1 bg-primary/10 text-primary rounded-full">
                    {facultyByDepartment[dept].length} faculty
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {facultyByDepartment[dept].map((f, index) => (
                    <motion.div
                      key={f.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                    >
                      <Card className="border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1 group">
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{f.full_name}</h3>
                                <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Faculty Member</p>
                              </div>
                              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-semibold text-lg shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                                {f.full_name.charAt(0).toUpperCase()}
                              </div>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                                <Mail className="w-4 h-4 text-primary/70" />
                                <span className="truncate">{f.email}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                                <Calendar className="w-4 h-4 text-primary/70" />
                                <span>Joined {new Date(f.created_at).toLocaleDateString()}</span>
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

      {filteredFaculty.length === 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-dashed border-2">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <UserCog className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">No faculty found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Try adjusting your search criteria</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
