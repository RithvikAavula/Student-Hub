import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/layout/Header';
import AdminProfile from './AdminProfile';
import FacultyManagementTab from './FacultyManagementTab';
import StudentManagementTab from './StudentManagementTab';
import AssignmentManagementTab from './AssignmentManagementTab';
import ReviewRecordsTab from '../faculty/ReviewRecordsTab';
import RecordsTab from './RecordsTab';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarSeparator,
  SidebarTrigger,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { Users, UserCog, ClipboardList, NotebookText, User, BarChart3 } from 'lucide-react';
import AnalyticsDashboard from '@/components/features/AnalyticsDashboard';
import { ThemeToggle } from '@/components/theme/ThemeProvider';
import { MorphingBlob } from '@/components/motion';

// Tab content animation variants
const contentVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.2 } }
};

// Menu item animation
const menuItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.08, duration: 0.3, ease: [0.4, 0, 0.2, 1] }
  })
};

export default function AdminDashboard() {
  const { profile } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'faculty');

  const menuItems = [
    { id: 'faculty', label: 'Faculty', icon: UserCog },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'assignments', label: 'Assignments', icon: ClipboardList },
    { id: 'records', label: 'Records', icon: NotebookText },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'faculty': return <FacultyManagementTab />;
      case 'students': return <StudentManagementTab />;
      case 'assignments': return <AssignmentManagementTab />;
      case 'records': return <RecordsTab />;
      case 'analytics': return <AnalyticsDashboard />;
      case 'profile': return <AdminProfile />;
      default: return <FacultyManagementTab />;
    }
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar variant="floating" collapsible="offcanvas" className="border-r-0">
        <SidebarHeader className="p-4 border-b border-border/50">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-lg shadow-primary/20 ring-2 ring-primary/20">
              <img 
                src="https://res.cloudinary.com/dfnpgl0bb/image/upload/v1771046687/ChatGPT_Image_Feb_14_2026_10_54_24_AM_k20wkr.png" 
                alt="Student Hub Logo" 
                className="w-full h-full object-contain"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Student Hub
              </span>
              <span className="text-xs text-muted-foreground">Admin Panel</span>
            </div>
          </motion.div>
        </SidebarHeader>
        <SidebarContent className="bg-gradient-to-b from-background to-muted/30">
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70">Admin Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item, index) => (
                  <SidebarMenuItem key={item.id}>
                    <motion.div
                      custom={index}
                      variants={menuItemVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <SidebarMenuButton
                        onClick={() => setActiveTab(item.id)}
                        isActive={activeTab === item.id}
                        size="lg"
                        className={`transition-all duration-300 hover:translate-x-1 group relative ${activeTab === item.id ? 'bg-gradient-to-r from-primary/10 to-accent/10 shadow-sm' : 'hover:bg-primary/5'}`}
                      >
                        <motion.div
                          animate={activeTab === item.id ? { scale: [1, 1.2, 1] } : {}}
                          transition={{ duration: 0.3 }}
                        >
                          <item.icon className={`transition-colors ${activeTab === item.id ? 'text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]' : 'group-hover:text-primary/70'}`} />
                        </motion.div>
                        <span className={activeTab === item.id ? 'font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent' : ''}>{item.label}</span>
                        {activeTab === item.id && (
                          <motion.div
                            layoutId="adminActiveIndicator"
                            className="absolute left-0 w-1 h-6 bg-gradient-to-b from-primary via-accent to-primary rounded-r-full shadow-[0_0_10px_hsl(var(--primary)/0.5)]"
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                      </SidebarMenuButton>
                    </motion.div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarSeparator />
      </Sidebar>
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
          {/* Animated background effects */}
          <MorphingBlob 
            className="absolute top-0 right-0 w-[500px] h-[500px] opacity-30 pointer-events-none" 
            colors={['hsl(var(--primary)/0.1)', 'hsl(var(--accent)/0.1)', 'hsl(var(--primary)/0.1)']}
          />
          <MorphingBlob 
            className="absolute bottom-0 left-0 w-[400px] h-[400px] opacity-20 pointer-events-none" 
            colors={['hsl(var(--accent)/0.1)', 'hsl(var(--primary)/0.1)', 'hsl(var(--accent)/0.1)']}
          />
          
          <Header />
          <div className="w-full px-4 sm:px-6 lg:px-8 py-8 relative z-10 transition-all duration-200">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="flex items-center gap-3 mb-6">
                <SidebarTrigger className="h-9 w-9 hover:scale-110 transition-transform" />
                <motion.h1 
                  className="text-2xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  Admin Dashboard
                </motion.h1>
                <div className="ml-auto">
                  <ThemeToggle />
                </div>
              </div>
              <motion.p 
                className="text-muted-foreground mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Manage faculty, students, and assignments across all departments
              </motion.p>
              <motion.div 
                className="mt-4 flex items-center gap-4 text-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <span className="px-3 py-1 bg-gradient-to-r from-primary/20 to-primary/10 text-primary rounded-full font-medium shadow-sm">
                  {profile?.role.toUpperCase()}
                </span>
                <span className="text-muted-foreground">
                  Department: <span className="font-medium text-foreground">{profile?.department || 'All'}</span>
                </span>
              </motion.div>
            </motion.div>

            <div className="mt-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  variants={contentVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  {renderTabContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
