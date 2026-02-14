import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/Header';
import FacultyProfile from './FacultyProfile';
import ReviewRecordsTab from './ReviewRecordsTab';
import StudentSubmissionsTab from './StudentSubmissionsTab';
import AssignedStudentsTab from './AssignedStudentsTab';
import WhatsAppMessages from '@/components/features/WhatsAppMessages';
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
import { NotebookText, Users, User, LayoutDashboard, MessageCircle, BarChart3 } from 'lucide-react';
import FacultyAnalyticsDashboard from './FacultyAnalyticsDashboard';
import { ThemeToggle } from '@/components/theme/ThemeProvider';
import { MorphingBlob } from '@/components/motion';
import FacultyNotifications from '@/components/features/FacultyNotifications';

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

interface SelectedNotification {
  studentId: string;
  recordId: string;
}

export default function FacultyDashboard() {
  const [activeTab, setActiveTab] = useState('submissions');
  const [selectedNotification, setSelectedNotification] = useState<SelectedNotification | null>(null);

  // Handle notification click with navigation to specific record
  const handleNotificationClick = (tab: string, data?: SelectedNotification) => {
    setSelectedNotification(data || null);
    setActiveTab(tab);
  };

  // Clear selected notification when changing tabs manually
  const handleTabChange = (tabId: string) => {
    setSelectedNotification(null);
    setActiveTab(tabId);
  };

  const menuItems = [
    { id: 'submissions', label: 'Student Submissions', icon: LayoutDashboard },
    { id: 'records', label: 'Review Records', icon: NotebookText },
    { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'submissions': return <StudentSubmissionsTab 
        initialStudentId={selectedNotification?.studentId}
        initialRecordId={selectedNotification?.recordId}
        onNavigationComplete={() => setSelectedNotification(null)}
      />;
      case 'records': return <ReviewRecordsTab />;
      case 'messages': return <WhatsAppMessages userRole="faculty" />;
      case 'students': return <AssignedStudentsTab />;
      case 'analytics': return <FacultyAnalyticsDashboard />;
      case 'profile': return <FacultyProfile />;
      default: return <StudentSubmissionsTab />;
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
              <span className="text-xs text-muted-foreground">Faculty Portal</span>
            </div>
          </motion.div>
        </SidebarHeader>
        <SidebarContent className="bg-gradient-to-b from-background to-muted/30">
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70">Navigation</SidebarGroupLabel>
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
                        onClick={() => handleTabChange(item.id)}
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
                            layoutId="facultyActiveIndicator"
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
          <main className="w-full px-6 md:px-8 py-6 relative z-10 transition-all duration-200">
            {activeTab !== 'messages' && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <SidebarTrigger className="h-9 w-9 hover:scale-110 transition-transform" />
                  <motion.h2 
                    className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    Faculty Dashboard
                  </motion.h2>
                  <div className="ml-auto flex items-center gap-2">
                    <FacultyNotifications onNotificationClick={handleNotificationClick} />
                    <ThemeToggle />
                  </div>
                </div>
                <motion.p 
                  className="text-muted-foreground mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Review student records and manage assigned students
                </motion.p>
              </motion.div>
            )}
            {activeTab === 'messages' && (
              <motion.div 
                className="flex items-center gap-3 mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <SidebarTrigger className="h-9 w-9 hover:scale-110 transition-transform" />
                <div className="ml-auto flex items-center gap-2">
                  <FacultyNotifications onNotificationClick={setActiveTab} />
                  <ThemeToggle />
                </div>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={contentVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-4"
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
