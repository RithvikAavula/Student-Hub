import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import Header from '@/components/layout/Header';
import AdminProfile from './AdminProfile';
import FacultyManagementTab from './FacultyManagementTab';
import StudentManagementTab from './StudentManagementTab';
import AssignmentManagementTab from './AssignmentManagementTab';
import ReviewRecordsTab from '../faculty/ReviewRecordsTab';
import RecordsTab from './RecordsTab';
// Attendance and Internal Marks features removed from dashboard
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
import { Users, UserCog, ClipboardList, NotebookText, User } from 'lucide-react';
// Profile is now a tab within the dashboard

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('faculty');

  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar variant="floating" collapsible="offcanvas">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Admin Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setActiveTab('faculty')} isActive={activeTab === 'faculty'} size="lg">
                    <UserCog />
                    <span>Faculty</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setActiveTab('students')} isActive={activeTab === 'students'} size="lg">
                    <Users />
                    <span>Students</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setActiveTab('assignments')} isActive={activeTab === 'assignments'} size="lg">
                    <ClipboardList />
                    <span>Assignments</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setActiveTab('records')} isActive={activeTab === 'records'} size="lg">
                    <NotebookText />
                    <span>Records</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                {/* Attendance and Internal Marks menu items removed */}
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
          <Header />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center gap-3 mb-6">
              <SidebarTrigger className="h-9 w-9" />
              <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            </div>
            <p className="text-slate-600 mt-1">
              Manage faculty, students, and assignments across all departments
            </p>
            <div className="mt-4 flex items-center gap-4 text-sm">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                {profile?.role.toUpperCase()}
              </span>
              <span className="text-slate-600">
                Department: <span className="font-medium text-slate-900">{profile?.department || 'All'}</span>
              </span>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 mt-6">
              <TabsContent value="faculty">
                <FacultyManagementTab />
              </TabsContent>
              <TabsContent value="students">
                <StudentManagementTab />
              </TabsContent>
              <TabsContent value="assignments">
                <AssignmentManagementTab />
              </TabsContent>
              <TabsContent value="records">
                <RecordsTab />
              </TabsContent>
              
              {/* Attendance and Internal Marks tabs removed */}
              
              <TabsContent value="profile">
                <AdminProfile />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
