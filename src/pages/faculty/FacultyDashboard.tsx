import { useState } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import Header from '@/components/layout/Header';
import FacultyProfile from './FacultyProfile';
import ReviewRecordsTab from './ReviewRecordsTab';
import StudentSubmissionsTab from './StudentSubmissionsTab';
// Attendance and Internal Marks features removed from dashboard
import AssignedStudentsTab from './AssignedStudentsTab';
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
} from '@/components/ui/sidebar';
import { NotebookText, Users, User, LayoutDashboard } from 'lucide-react';
// Profile is now a tab within the dashboard

export default function FacultyDashboard() {
  const [activeTab, setActiveTab] = useState('submissions');

  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar variant="floating" collapsible="offcanvas">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setActiveTab('submissions')}
                    isActive={activeTab === 'submissions'}
                    size="lg"
                  >
                    <LayoutDashboard />
                    <span>Student Submissions</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setActiveTab('records')}
                    isActive={activeTab === 'records'}
                    size="lg"
                  >
                    <NotebookText />
                    <span>Review Records</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                {/* Attendance and Internal Marks menu items removed */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setActiveTab('students')}
                    isActive={activeTab === 'students'}
                    size="lg"
                  >
                    <Users />
                    <span>Students</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setActiveTab('profile')}
                    isActive={activeTab === 'profile'}
                    size="lg"
                  >
                    <User />
                    <span>Profile</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarSeparator />
      </Sidebar>
      <SidebarInset>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container px-6 md:px-8 py-6">
            <div className="flex items-center gap-3 mb-4">
              <SidebarTrigger className="h-9 w-9" />
              <h2 className="text-2xl font-bold tracking-tight">Faculty Dashboard</h2>
            </div>
            <div className="space-y-6">
              <p className="text-muted-foreground">
                Review student records and manage assigned students
              </p>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsContent value="submissions" className="space-y-4">
                  <StudentSubmissionsTab />
                </TabsContent>

                <TabsContent value="records" className="space-y-4">
                  <ReviewRecordsTab />
                </TabsContent>

                

                {/* Attendance and Internal Marks tabs removed */}

                <TabsContent value="students" className="space-y-4">
                  <AssignedStudentsTab />
                </TabsContent>

                <TabsContent value="profile" className="space-y-4">
                  <FacultyProfile />
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
