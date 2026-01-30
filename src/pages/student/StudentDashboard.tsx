import { useState } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import RecordsTab from './RecordsTab';
// Attendance and Internal Marks features removed from dashboard
import Header from '@/components/layout/Header';
import StudentProfile from './StudentProfile';
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
import { NotebookText, User } from 'lucide-react';
// Profile is now a tab within the dashboard

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('records');

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
                    onClick={() => setActiveTab('records')}
                    isActive={activeTab === 'records'}
                    size="lg"
                  >
                    <NotebookText />
                    <span>Activity Records</span>
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
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container px-6 md:px-8 py-6">
            <div className="flex items-center gap-3 mb-4">
              <SidebarTrigger className="h-9 w-9" />
              <h2 className="text-2xl font-bold tracking-tight">Student Dashboard</h2>
            </div>
            <div className="space-y-6">
              <p className="text-muted-foreground">
                Manage your activity records and profile
              </p>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsContent value="records" className="space-y-4">
                  <RecordsTab />
                </TabsContent>

                
                {/* Attendance and Internal Marks tabs removed */}

                <TabsContent value="profile" className="space-y-4">
                  <StudentProfile />
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
