/**
 * Faculty Notifications Component
 * 
 * Shows a bell icon with notifications for new student submissions
 * Clicking a notification navigates to the submissions tab
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Bell, FileCheck, Clock, CheckCircle2, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  studentId: string;
  studentName: string;
  yearOfStudy: number;
  section: string | null;
  recordId: string;
  recordTitle: string;
  category: string;
  createdAt: string;
  avatarUrl: string | null;
}

interface NotificationData {
  studentId: string;
  recordId: string;
}

interface FacultyNotificationsProps {
  onNotificationClick?: (tab: string, data?: NotificationData) => void;
}

// Get avatar URL from path
const getAvatarUrl = (path: string | null): string | null => {
  if (!path) return null;
  const { data } = supabase.storage.from('profile').getPublicUrl(path);
  return data.publicUrl;
};

// Get year label
const getYearLabel = (year: number): string => {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const suffix = year <= 3 ? suffixes[year] : suffixes[0];
  return `${year}${suffix} Year`;
};

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  academic: '#6366f1',
  sports: '#10b981',
  cultural: '#f59e0b',
  technical: '#8b5cf6',
  social: '#ec4899',
  other: '#64748b',
};

export default function FacultyNotifications({ onNotificationClick }: FacultyNotificationsProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Fetch pending submissions from assigned students
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get assigned student IDs
      const { data: assignments, error: assignmentError } = await supabase
        .from('faculty_assignments')
        .select('student_id')
        .eq('faculty_id', user.id);

      if (assignmentError) throw assignmentError;

      const studentIds = (assignments || []).map(a => a.student_id);
      if (studentIds.length === 0) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      // Get pending records from assigned students
      const { data: records, error: recordsError } = await supabase
        .from('student_records')
        .select(`
          id,
          student_id,
          title,
          category,
          created_at,
          profiles:student_id (
            full_name,
            year_of_study,
            section,
            avatar_path
          )
        `)
        .in('student_id', studentIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);

      if (recordsError) throw recordsError;

      // Transform to notifications
      const notifs: Notification[] = (records || []).map((record: any) => ({
        id: record.id,
        studentId: record.student_id,
        studentName: record.profiles?.full_name || 'Unknown Student',
        yearOfStudy: record.profiles?.year_of_study || 1,
        section: record.profiles?.section || null,
        recordId: record.id,
        recordTitle: record.title,
        category: record.category,
        createdAt: record.created_at,
        avatarUrl: getAvatarUrl(record.profiles?.avatar_path || null),
      }));

      setNotifications(notifs);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('faculty-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'student_records',
        },
        () => {
          // Refetch notifications when new records are added
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchNotifications]);

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    setOpen(false);
    if (onNotificationClick) {
      onNotificationClick('submissions', {
        studentId: notification.studentId,
        recordId: notification.recordId,
      });
    }
  };

  // Mark as checked when opened
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setLastChecked(new Date());
    }
  };

  // Count new notifications since last check
  const newCount = lastChecked
    ? notifications.filter(n => new Date(n.createdAt) > lastChecked).length
    : notifications.length;

  // Display count (cap at 99)
  const displayCount = notifications.length > 99 ? '99+' : notifications.length;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full hover:bg-primary/10 transition-colors"
        >
          <Bell className={cn(
            "h-5 w-5 transition-colors",
            notifications.length > 0 ? "text-primary" : "text-muted-foreground"
          )} />
          
          {/* Badge */}
          <AnimatePresence>
            {notifications.length > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1"
              >
                <Badge 
                  variant="destructive" 
                  className="h-5 min-w-[20px] px-1.5 text-[10px] font-bold rounded-full flex items-center justify-center"
                >
                  {displayCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Pulse animation for new notifications */}
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive/30 animate-ping" />
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-96 p-0" 
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h4 className="font-semibold">Notifications</h4>
          </div>
          {notifications.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {notifications.length} pending
            </Badge>
          )}
        </div>

        {/* Notifications list */}
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium">All caught up!</p>
              <p className="text-sm text-muted-foreground mt-1">
                No pending submissions to review
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification, index) => (
                <motion.button
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleNotificationClick(notification)}
                  className="w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-start gap-3 group"
                >
                  {/* Avatar */}
                  <Avatar className="h-10 w-10 ring-2 ring-primary/10 shrink-0">
                    <AvatarImage src={notification.avatarUrl || undefined} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-white text-sm">
                      {notification.studentName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        {notification.studentName}
                      </span>
                      <Badge 
                        variant="outline" 
                        className="text-[10px] px-1.5 py-0 shrink-0"
                      >
                        <GraduationCap className="h-2.5 w-2.5 mr-1" />
                        {getYearLabel(notification.yearOfStudy)}
                        {notification.section && ` - ${notification.section}`}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground truncate">
                      Submitted: <span className="font-medium text-foreground">{notification.recordTitle}</span>
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <Badge 
                        variant="secondary"
                        className="text-[10px] px-2 py-0"
                        style={{ 
                          backgroundColor: `${CATEGORY_COLORS[notification.category]}15`,
                          color: CATEGORY_COLORS[notification.category]
                        }}
                      >
                        {notification.category.charAt(0).toUpperCase() + notification.category.slice(1)}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {/* Arrow indicator on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-center">
                    <FileCheck className="h-4 w-4 text-primary" />
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 border-t bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-primary hover:text-primary hover:bg-primary/10"
              onClick={() => {
                setOpen(false);
                if (onNotificationClick) {
                  onNotificationClick('submissions');
                }
              }}
            >
              View all submissions
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
