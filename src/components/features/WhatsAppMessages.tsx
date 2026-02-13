import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Conversation, Message, Profile, UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Send,
  Paperclip,
  Search,
  ArrowLeft,
  Check,
  CheckCheck,
  MoreVertical,
  Smile,
  Camera,
  X,
  Bell,
  BellOff,
  Image as ImageIcon,
  File,
  Clock,
  Reply,
  Pencil,
  Trash2,
  Copy,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WhatsAppMessagesProps {
  userRole: 'student' | 'faculty';
}

interface ConversationWithDetails extends Conversation {
  lastMessage?: Message;
  unreadCount?: number;
  contact?: Profile;
}

export default function WhatsAppMessages({ userRole }: WhatsAppMessagesProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [selectedContact, setSelectedContact] = useState<Profile | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'chat'>('list');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState<{ src: string; name: string } | null>(null);
  // WhatsApp-like message features
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // WhatsApp-style emoji shortcuts
  const quickEmojis = ['😊', '😂', '❤️', '👍', '🎉', '🙏', '😍', '🔥'];

  // Helper to show avatar preview
  const showAvatarPreview = (src: string | undefined, name: string) => {
    if (src) {
      setAvatarPreview({ src, name });
    }
  };

  // Convert avatar_path to public URL for contacts
  const enrichProfilesWithAvatars = (profiles: Profile[]): Profile[] => {
    return profiles.map((p) => {
      const avatarPath = (p as any).avatar_path as string | undefined;
      if (avatarPath && !p.avatar) {
        const { data } = supabase.storage.from('profile').getPublicUrl(avatarPath);
        return { ...p, avatar: data.publicUrl };
      }
      return p;
    });
  };

  const fetchContacts = useCallback(async () => {
    try {
      if (!user?.id) return;

      if (userRole === 'student') {
        const { data: assignments, error: assignError } = await supabase
          .from('faculty_assignments')
          .select('faculty_id')
          .eq('student_id', user.id);

        if (assignError) throw assignError;

        if (assignments && assignments.length > 0) {
          const ids = assignments.map(a => a.faculty_id).filter(Boolean) as string[];
          const { data: faculty, error: facultyError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', ids);

          if (facultyError) throw facultyError;
          setContacts(enrichProfilesWithAvatars(faculty || []));
        }
      } else {
        const { data: assignments, error: assignError } = await supabase
          .from('faculty_assignments')
          .select('student_id')
          .eq('faculty_id', user.id);

        if (assignError) throw assignError;

        if (assignments && assignments.length > 0) {
          const ids = assignments.map(a => a.student_id).filter(Boolean) as string[];
          const { data: students, error: studentsError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', ids)
            .order('full_name');

          if (studentsError) throw studentsError;
          setContacts(enrichProfilesWithAvatars(students || []));
        }
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  }, [userRole, user?.id]);

  const fetchConversationsWithDetails = useCallback(async () => {
    if (!user?.id || contacts.length === 0) return;

    try {
      // Get all conversations for this user
      const conversationField = userRole === 'student' ? 'student_id' : 'faculty_id';
      const { data: convs, error } = await supabase
        .from('conversations')
        .select('*')
        .eq(conversationField, user.id);

      if (error) throw error;

      // Enrich conversations with last message and unread count
      const enrichedConvs: ConversationWithDetails[] = await Promise.all(
        (convs || []).map(async (conv) => {
          // Get last message
          const { data: lastMsgData } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', user.id);

          // Find contact
          const contactId = userRole === 'student' ? conv.faculty_id : conv.student_id;
          const contact = contacts.find(c => c.id === contactId);

          return {
            ...conv,
            lastMessage: lastMsgData || undefined,
            unreadCount: count || 0,
            contact,
          };
        })
      );

      // Sort by last message time
      enrichedConvs.sort((a, b) => {
        const aTime = a.lastMessage?.created_at || a.created_at;
        const bTime = b.lastMessage?.created_at || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setConversations(enrichedConvs);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }, [user?.id, contacts, userRole]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    if (contacts.length > 0) {
      fetchConversationsWithDetails();
    }
  }, [contacts, fetchConversationsWithDetails]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`*, sender:profiles(*)`)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Convert avatar_path to public URL for message senders
      const messagesWithAvatars = (data || []).map((msg) => {
        if (msg.sender) {
          const senderAvatarPath = (msg.sender as any).avatar_path as string | undefined;
          if (senderAvatarPath && !msg.sender.avatar) {
            const { data: urlData } = supabase.storage.from('profile').getPublicUrl(senderAvatarPath);
            return { ...msg, sender: { ...msg.sender, avatar: urlData.publicUrl } };
          }
        }
        return msg;
      });
      
      setMessages(messagesWithAvatars);
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, []);

  const markMessagesAsRead = useCallback(async (conversationId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user?.id)
        .eq('is_read', false);
      
      // Update local conversation unread count
      setConversations(prev => 
        prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c)
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (conversation) {
      fetchMessages(conversation.id);
      markMessagesAsRead(conversation.id);
    }
  }, [conversation, fetchMessages, markMessagesAsRead]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time subscription for new messages and updates (read receipts)
  useEffect(() => {
    if (!user || !conversation) return;

    const channel = supabase
      .channel(`messages-${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;

          // For our own messages, just update the temp message with real data
          if (newMessage.sender_id === user.id) {
            setMessages(prev => {
              // Check if we have a temp message that should be replaced
              const hasTempMessage = prev.some(msg => msg.id.startsWith('temp-'));
              if (hasTempMessage) {
                return prev.map(msg => 
                  msg.id.startsWith('temp-') && msg.content === newMessage.content
                    ? { ...newMessage, sender: msg.sender }
                    : msg
                );
              }
              // Otherwise check for duplicates
              if (prev.some(msg => msg.id === newMessage.id)) return prev;
              return [...prev, {
                ...newMessage,
                sender: {
                  id: user.id,
                  email: user.email,
                  full_name: profile?.full_name || 'You',
                  role: userRole,
                  avatar: user.avatar,
                  created_at: newMessage.created_at,
                  updated_at: newMessage.created_at,
                }
              }];
            });
            return;
          }

          setMessages(prev => {
            if (prev.some(msg => msg.id === newMessage.id)) return prev;

            const updatedMessages = [...prev, {
              ...newMessage,
              sender: {
                id: newMessage.sender_id,
                email: '',
                full_name: selectedContact?.full_name || 'Unknown',
                role: (userRole === 'student' ? 'faculty' : 'student') as UserRole,
                avatar: selectedContact?.avatar,
                created_at: newMessage.created_at,
                updated_at: newMessage.created_at,
              }
            }];

            setTimeout(() => scrollToBottom(), 100);
            return updatedMessages;
          });

          // Show notification for incoming messages
          if (newMessage.sender_id !== user.id && notificationsEnabled) {
            showNotification(selectedContact?.full_name || 'New message', newMessage.content);
          }

          if (newMessage.sender_id !== user.id) {
            markMessagesAsRead(conversation.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          
          // Update the message in state (for read receipts, edits, deletes)
          setMessages(prev => prev.map(msg => 
            msg.id === updatedMessage.id 
              ? { ...msg, ...updatedMessage }
              : msg
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile, conversation, selectedContact, userRole, notificationsEnabled, markMessagesAsRead]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const showNotification = (title: string, body: string) => {
    // Toast notification
    toast({
      title: `💬 ${title}`,
      description: body.length > 50 ? body.substring(0, 50) + '...' : body,
      className: 'bg-[#075E54] text-white border-[#128C7E]',
    });

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'whatsapp-message',
      });
    }
  };

  const handleContactClick = async (contact: Profile) => {
    try {
      if (!user) throw new Error('User not authenticated');

      let conversationQuery = supabase.from('conversations').select('*');

      if (userRole === 'student') {
        conversationQuery = conversationQuery
          .eq('student_id', user.id)
          .eq('faculty_id', contact.id);
      } else {
        conversationQuery = conversationQuery
          .eq('faculty_id', user.id)
          .eq('student_id', contact.id);
      }

      const { data: existingConv, error: convError } = await conversationQuery.single();

      if (convError && convError.code !== 'PGRST116') throw convError;

      let currentConversation: Conversation;

      if (existingConv) {
        currentConversation = existingConv;
      } else {
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            faculty_id: userRole === 'student' ? contact.id : user.id,
            student_id: userRole === 'student' ? user.id : contact.id,
          })
          .select()
          .single();

        if (createError) throw createError;
        currentConversation = newConv;
      }

      setConversation(currentConversation);
      setSelectedContact(contact);
      setViewMode('chat');
    } catch (error) {
      toast({
        title: 'Error opening conversation',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversation || !user) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    // Handle editing existing message
    if (editingMessage) {
      try {
        const { error } = await supabase
          .from('messages')
          .update({
            content: messageContent,
            is_edited: true,
            edited_at: new Date().toISOString(),
          })
          .eq('id', editingMessage.id);

        if (error) throw error;

        setMessages(prev => prev.map(msg =>
          msg.id === editingMessage.id
            ? { ...msg, content: messageContent, is_edited: true, edited_at: new Date().toISOString() }
            : msg
        ));
        setEditingMessage(null);
        toast({
          title: '✏️ Message edited',
          className: 'bg-[#075E54] text-white',
        });
      } catch (error) {
        toast({
          title: 'Error editing message',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
        setNewMessage(messageContent);
      }
      return;
    }

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversation.id,
      sender_id: user.id,
      content: messageContent,
      message_type: 'text',
      is_read: false,
      created_at: new Date().toISOString(),
      // Only include reply data if we have a valid reply target
      ...(replyingTo?.id ? { reply_to_id: replyingTo.id, reply_to: replyingTo } : {}),
      sender: {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || 'You',
        role: userRole,
        avatar: profile?.avatar,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setReplyingTo(null);
    scrollToBottom();

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content: messageContent,
          message_type: 'text',
          reply_to_id: replyingTo?.id || null,
        })
        .select(`*, sender:profiles(*)`)
        .single();

      if (error) throw error;

      setMessages(prev => prev.map(msg =>
        msg.id === optimisticMessage.id ? data : msg
      ));

      // Update conversations list
      fetchConversationsWithDetails();
    } catch (error) {
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      toast({
        title: 'Error sending message',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      setNewMessage(messageContent);
    }
  };

  // Delete message for me only
  const deleteMessageForMe = async (message: Message) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ deleted_for_sender: true })
        .eq('id', message.id);

      if (error) throw error;

      setMessages(prev => prev.filter(msg => msg.id !== message.id));
      setShowDeleteModal(false);
      setSelectedMessage(null);
      toast({
        title: '🗑️ Message deleted for you',
        className: 'bg-[#075E54] text-white',
      });
    } catch (error) {
      toast({
        title: 'Error deleting message',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  // Delete message for everyone
  const deleteMessageForEveryone = async (message: Message) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ deleted_for_everyone: true, content: 'This message was deleted' })
        .eq('id', message.id);

      if (error) throw error;

      setMessages(prev => prev.map(msg =>
        msg.id === message.id
          ? { ...msg, deleted_for_everyone: true, content: 'This message was deleted' }
          : msg
      ));
      setShowDeleteModal(false);
      setSelectedMessage(null);
      toast({
        title: '🗑️ Message deleted for everyone',
        className: 'bg-[#075E54] text-white',
      });
    } catch (error) {
      toast({
        title: 'Error deleting message',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  // Copy message text
  const copyMessageText = (message: Message) => {
    navigator.clipboard.writeText(message.content);
    toast({
      title: '📋 Copied to clipboard',
      className: 'bg-[#075E54] text-white',
    });
  };

  // Start replying to a message
  const startReply = (message: Message) => {
    setReplyingTo(message);
    setEditingMessage(null);
  };

  // Start editing a message
  const startEdit = (message: Message) => {
    setEditingMessage(message);
    setNewMessage(message.content);
    setReplyingTo(null);
  };

  // Cancel reply or edit
  const cancelReplyOrEdit = () => {
    setReplyingTo(null);
    setEditingMessage(null);
    setNewMessage('');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    if (!file || !conversation || !user) {
      if (!conversation) {
        toast({
          title: 'No conversation selected',
          description: 'Please select a chat first',
          variant: 'destructive',
        });
      }
      return;
    }

    const messageType = file.type.startsWith('image/') ? 'image' : 'file';
    const tempId = `temp-file-${Date.now()}`;
    
    // Create optimistic file message immediately
    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: conversation.id,
      sender_id: user.id,
      content: file.name,
      message_type: messageType,
      file_url: URL.createObjectURL(file), // Local preview URL
      file_name: file.name,
      file_size: file.size,
      is_read: false,
      created_at: new Date().toISOString(),
      sender: {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || 'You',
        role: userRole,
        avatar: user.avatar,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    };

    // Show optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom();

    toast({
      title: '📤 Uploading...',
      description: file.name,
      className: 'bg-[#075E54] text-white',
    });

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `messages/${conversation.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('certificates')
        .getPublicUrl(filePath);

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content: file.name,
          message_type: messageType,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Replace optimistic message with real message
      setMessages(prev => prev.map(msg => 
        msg.id === tempId 
          ? { ...data, sender: optimisticMessage.sender } 
          : msg
      ));

      toast({
        title: '📎 File sent',
        description: file.name,
        className: 'bg-[#075E54] text-white',
      });
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      toast({
        title: 'Error uploading file',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedContact(null);
    setConversation(null);
    setMessages([]);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatLastSeen = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const getMessageGroups = () => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';

    messages.forEach(msg => {
      const msgDate = new Date(msg.created_at).toDateString();
      if (msgDate !== currentDate) {
        groups.push({ date: msg.created_at, messages: [msg] });
        currentDate = msgDate;
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  };

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const getTotalUnread = () => {
    return conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  };

  const filteredContacts = contacts.filter(contact =>
    contact.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredConversations = conversations.filter(conv =>
    conv.contact?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-[#111B21]">
        <div className="text-[#8696A0]">Loading chats...</div>
      </div>
    );
  }

  // WhatsApp Conversation List View
  if (viewMode === 'list') {
    return (
      <div className="h-[700px] rounded-xl overflow-hidden shadow-2xl border border-[#2A3942]">
        {/* WhatsApp Header */}
        <div className="bg-[#202C33] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                showAvatarPreview(profile?.avatar, profile?.full_name || 'Profile');
              }}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A884] rounded-full"
              disabled={!profile?.avatar}
            >
              <Avatar className={`h-10 w-10 border-2 border-[#00A884] ${profile?.avatar ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}>
                <AvatarImage src={profile?.avatar} className="object-cover object-center" />
                <AvatarFallback className="bg-[#00A884] text-white">
                  {profile?.full_name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
            <div>
              <h2 className="text-[#E9EDEF] font-semibold text-lg">Chats</h2>
              {getTotalUnread() > 0 && (
                <span className="text-xs text-[#00A884]">
                  {getTotalUnread()} unread message{getTotalUnread() > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-[#AEBAC1] hover:text-[#E9EDEF] hover:bg-[#374248]"
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            >
              {notificationsEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-[#AEBAC1] hover:text-[#E9EDEF] hover:bg-[#374248]">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#233138] border-[#2A3942] text-[#E9EDEF]">
                <DropdownMenuItem className="hover:bg-[#374248] cursor-pointer">
                  New chat
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-[#374248] cursor-pointer">
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#2A3942]" />
                <DropdownMenuItem className="hover:bg-[#374248] cursor-pointer text-[#EF4444]">
                  Clear all chats
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-[#111B21] px-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8696A0]" />
            <Input
              placeholder="Search or start new chat"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#202C33] border-0 text-[#E9EDEF] placeholder:text-[#8696A0] focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="bg-[#111B21] h-[calc(100%-120px)] overflow-y-auto custom-scrollbar">
          {filteredConversations.length === 0 && filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#8696A0]">
              <div className="w-20 h-20 rounded-full bg-[#202C33] flex items-center justify-center mb-4">
                <Search className="h-10 w-10" />
              </div>
              <p className="text-center px-8">
                {userRole === 'student'
                  ? 'No faculty assigned yet. Contact your administrator.'
                  : 'No students assigned yet.'}
              </p>
            </div>
          ) : (
            <>
              {/* Existing conversations */}
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => conv.contact && handleContactClick(conv.contact)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#202C33] cursor-pointer border-b border-[#2A3942] transition-colors"
                >
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        showAvatarPreview(conv.contact?.avatar, conv.contact?.full_name || 'Contact');
                      }}
                      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A884] rounded-full"
                      disabled={!conv.contact?.avatar}
                    >
                      <Avatar className={`h-12 w-12 ${conv.contact?.avatar ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}>
                        <AvatarImage src={conv.contact?.avatar} className="object-cover object-center" />
                        <AvatarFallback className="bg-[#6B7280] text-white text-lg">
                          {conv.contact?.full_name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                    {(conv.unreadCount || 0) > 0 && (
                      <span className="absolute -top-1 -right-1 bg-[#00A884] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[#E9EDEF] font-medium truncate">
                        {conv.contact?.full_name}
                      </h4>
                      <span className={`text-xs ${(conv.unreadCount || 0) > 0 ? 'text-[#00A884]' : 'text-[#8696A0]'}`}>
                        {conv.lastMessage && formatLastSeen(conv.lastMessage.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {conv.lastMessage?.sender_id === user?.id && (
                        <span className="flex-shrink-0">
                          {conv.lastMessage?.is_read ? (
                            <CheckCheck className="h-4 w-4 text-[#53BDEB]" />
                          ) : (
                            <Check className="h-4 w-4 text-[#8696A0]" />
                          )}
                        </span>
                      )}
                      <p className={`text-sm truncate ${(conv.unreadCount || 0) > 0 ? 'text-[#E9EDEF] font-medium' : 'text-[#8696A0]'}`}>
                        {conv.lastMessage?.content || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Contacts without conversations */}
              {filteredContacts
                .filter(c => !conversations.some(conv => conv.contact?.id === c.id))
                .map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => handleContactClick(contact)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[#202C33] cursor-pointer border-b border-[#2A3942] transition-colors"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        showAvatarPreview(contact.avatar, contact.full_name || 'Contact');
                      }}
                      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A884] rounded-full flex-shrink-0"
                      disabled={!contact.avatar}
                    >
                      <Avatar className={`h-12 w-12 ${contact.avatar ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}>
                        <AvatarImage src={contact.avatar} className="object-cover object-center" />
                        <AvatarFallback className="bg-[#6B7280] text-white text-lg">
                          {contact.full_name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[#E9EDEF] font-medium truncate">
                        {contact.full_name}
                      </h4>
                      <p className="text-sm text-[#8696A0]">
                        {userRole === 'student' ? 'Faculty' : `Student • Year ${contact.year_of_study || 'N/A'}`}
                      </p>
                    </div>
                    <span className="text-[#00A884] text-sm font-medium">Start chat</span>
                  </div>
                ))}
            </>
          )}
        </div>

        {/* Avatar Preview Dialog for List View */}
        <Dialog open={!!avatarPreview} onOpenChange={() => setAvatarPreview(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[70vw] lg:max-w-[60vw] p-0 bg-black/95 border-0 overflow-hidden">
            <div className="relative flex items-center justify-center min-h-[50vh] max-h-[90vh]">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 z-10 text-white hover:bg-white/20 rounded-full"
                onClick={() => setAvatarPreview(null)}
              >
                <X className="h-5 w-5" />
              </Button>
              <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-white/30">
                  <AvatarImage src={avatarPreview?.src} alt={avatarPreview?.name} className="object-cover" />
                  <AvatarFallback className="bg-[#00A884] text-white text-sm">
                    {avatarPreview?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-white font-medium text-lg drop-shadow-lg">{avatarPreview?.name}</span>
              </div>
              {avatarPreview?.src && (
                <img
                  src={avatarPreview.src}
                  alt={`${avatarPreview.name}'s profile picture`}
                  className="max-h-[80vh] max-w-full w-auto h-auto object-contain rounded-lg shadow-2xl"
                  style={{ margin: '70px 20px 20px 20px' }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // WhatsApp Chat View
  return (
    <div className="h-[700px] rounded-xl overflow-hidden shadow-2xl border border-[#2A3942] flex flex-col">
      {/* Chat Header */}
      <div className="bg-[#202C33] px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackToList}
            className="text-[#AEBAC1] hover:text-[#E9EDEF] hover:bg-[#374248] mr-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <button
            onClick={() => showAvatarPreview(selectedContact?.avatar, selectedContact?.full_name || 'Contact')}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A884] rounded-full"
            disabled={!selectedContact?.avatar}
          >
            <Avatar className={`h-10 w-10 ${selectedContact?.avatar ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}>
              <AvatarImage src={selectedContact?.avatar} className="object-cover object-center" />
              <AvatarFallback className="bg-[#6B7280] text-white">
                {selectedContact?.full_name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
          <div>
            <h4 className="text-[#E9EDEF] font-medium">{selectedContact?.full_name}</h4>
            <p className="text-xs text-[#8696A0]">
              {isTyping ? (
                <span className="text-[#00A884]">typing...</span>
              ) : (
                userRole === 'student' ? 'Faculty' : 'Student'
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-[#AEBAC1] hover:text-[#E9EDEF] hover:bg-[#374248]">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#233138] border-[#2A3942] text-[#E9EDEF] min-w-[180px] z-50">
              <DropdownMenuItem className="hover:bg-[#374248] cursor-pointer px-4 py-2">
                View contact
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-[#374248] cursor-pointer px-4 py-2">
                Search
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-[#374248] cursor-pointer px-4 py-2">
                Mute notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#2A3942]" />
              <DropdownMenuItem className="hover:bg-[#374248] cursor-pointer px-4 py-2 text-[#EF4444]">
                Clear chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages Area with WhatsApp-style background */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 custom-scrollbar"
        style={{
          backgroundColor: '#0B141A',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23182229' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="bg-[#202C33] rounded-lg px-4 py-2 text-[#8696A0] text-sm text-center max-w-xs">
              <span className="block">🔐</span>
              Messages are private between you and {selectedContact?.full_name}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {getMessageGroups().map((group, groupIndex) => (
              <div key={groupIndex}>
                {/* Date Header */}
                <div className="flex justify-center my-4">
                  <span className="bg-[#182229] text-[#8696A0] text-xs px-3 py-1 rounded-lg shadow">
                    {formatDateHeader(group.date)}
                  </span>
                </div>

                {/* Messages */}
                {group.messages.map((message, msgIndex) => {
                  const isOwn = message.sender_id === user?.id;
                  const isLastInGroup = msgIndex === group.messages.length - 1 ||
                    group.messages[msgIndex + 1]?.sender_id !== message.sender_id;
                  const isFirstInGroup = msgIndex === 0 ||
                    group.messages[msgIndex - 1]?.sender_id !== message.sender_id;
                  
                  // Get sender avatar - for own messages use user avatar, for others use sender profile or selectedContact
                  const senderAvatar = isOwn 
                    ? user?.avatar 
                    : (message.sender?.avatar || selectedContact?.avatar);
                  const senderName = isOwn 
                    ? profile?.full_name 
                    : (message.sender?.full_name || selectedContact?.full_name || 'User');

                  // Skip messages deleted for me (sender)
                  if (isOwn && message.deleted_for_sender) return null;

                  // Show deleted message placeholder for everyone
                  const isDeleted = message.deleted_for_everyone;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1 ${isFirstInGroup ? 'mt-3' : ''} group`}
                    >
                      {/* Avatar for received messages - only show on first message of a group */}
                      {!isOwn && isFirstInGroup && (
                        <button
                          onClick={() => showAvatarPreview(senderAvatar, senderName)}
                          className="mr-2 flex-shrink-0 self-end mb-1"
                        >
                          <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-[#00A884] transition-all">
                            <AvatarImage src={senderAvatar} className="object-cover object-center" />
                            <AvatarFallback className="bg-[#00A884] text-white text-xs">
                              {senderName.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                      )}
                      {/* Spacer for alignment when avatar is not shown */}
                      {!isOwn && !isFirstInGroup && <div className="w-10 flex-shrink-0" />}
                      
                      <div
                        className={`relative max-w-[75%] lg:max-w-[65%] rounded-lg shadow ${
                          isDeleted
                            ? 'bg-[#202C33]/60 text-[#8696A0] italic'
                            : isOwn
                              ? 'bg-[#005C4B] text-[#E9EDEF]'
                              : 'bg-[#202C33] text-[#E9EDEF]'
                        } ${isLastInGroup ? (isOwn ? 'rounded-tr-none' : 'rounded-tl-none') : ''}`}
                      >
                        {/* Message Context Menu */}
                        {!isDeleted && (
                          <div className={`absolute top-1 ${isOwn ? 'left-1' : 'right-1'} opacity-0 group-hover:opacity-100 transition-opacity z-10`}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1 rounded hover:bg-black/20">
                                  <MoreVertical className="h-4 w-4 text-[#8696A0]" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align={isOwn ? "start" : "end"} className="bg-[#233138] border-[#2A3942] text-[#E9EDEF] min-w-[140px] z-50">
                                <DropdownMenuItem onClick={() => startReply(message)} className="hover:bg-[#374248] cursor-pointer px-3 py-2">
                                  <Reply className="h-4 w-4 mr-2" />
                                  Reply
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => copyMessageText(message)} className="hover:bg-[#374248] cursor-pointer px-3 py-2">
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy
                                </DropdownMenuItem>
                                {isOwn && (
                                  <DropdownMenuItem onClick={() => startEdit(message)} className="hover:bg-[#374248] cursor-pointer px-3 py-2">
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator className="bg-[#2A3942]" />
                                <DropdownMenuItem 
                                  onClick={() => { setSelectedMessage(message); setShowDeleteModal(true); }}
                                  className="hover:bg-[#374248] cursor-pointer px-3 py-2 text-[#EF4444]"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}

                        {/* Message tail */}
                        {isLastInGroup && !isDeleted && (
                          <div
                            className={`absolute top-0 w-3 h-3 ${
                              isOwn
                                ? '-right-2 border-l-8 border-l-[#005C4B] border-t-8 border-t-transparent border-b-8 border-b-transparent'
                                : '-left-2 border-r-8 border-r-[#202C33] border-t-8 border-t-transparent border-b-8 border-b-transparent'
                            }`}
                            style={{ 
                              width: 0, 
                              height: 0,
                              borderStyle: 'solid',
                              borderWidth: isOwn ? '0 0 8px 8px' : '0 8px 8px 0',
                              borderColor: isOwn 
                                ? 'transparent transparent transparent #005C4B' 
                                : 'transparent #202C33 transparent transparent',
                              position: 'absolute',
                              top: 0,
                              [isOwn ? 'right' : 'left']: -8,
                            }}
                          />
                        )}

                        <div className="px-3 py-2">
                          {/* Reply preview - only show if reply_to has valid id, content, and is different from current message */}
                          {message.reply_to && message.reply_to.id && message.reply_to.content && 
                           message.reply_to.id !== message.id && !isDeleted && (
                            <div className={`mb-2 p-2 rounded border-l-4 ${isOwn ? 'bg-[#004C3F] border-[#00A884]' : 'bg-[#182229] border-[#00A884]'}`}>
                              <p className="text-xs text-[#00A884] font-medium">
                                {message.reply_to.sender_id === user?.id ? 'You' : message.reply_to.sender?.full_name || 'User'}
                              </p>
                              <p className="text-xs text-[#8696A0] truncate">{message.reply_to.content}</p>
                            </div>
                          )}

                          {/* Image message */}
                          {message.message_type === 'image' && message.file_url && !isDeleted && (
                            <div className="mb-2">
                              <img
                                src={message.file_url}
                                alt={message.file_name}
                                className="rounded-lg max-w-full h-auto max-h-64 object-cover"
                              />
                            </div>
                          )}

                          {/* File message */}
                          {message.message_type === 'file' && message.file_url && !isDeleted && (
                            <a
                              href={message.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-[#0B141A] rounded-lg p-3 mb-2 hover:bg-[#182229] transition-colors"
                            >
                              <div className="w-10 h-10 rounded-lg bg-[#00A884] flex items-center justify-center">
                                <File className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{message.file_name}</p>
                                <p className="text-xs text-[#8696A0]">
                                  {message.file_size ? `${(message.file_size / 1024).toFixed(1)} KB` : 'Document'}
                                </p>
                              </div>
                            </a>
                          )}

                          {/* Text content */}
                          <p className={`text-sm whitespace-pre-wrap break-words ${isDeleted ? 'italic' : ''}`}>
                            {isDeleted ? '🚫 This message was deleted' : message.content}
                          </p>

                          {/* Time, edited indicator, and read status */}
                          <div className={`flex items-center justify-end gap-1 mt-1`}>
                            {message.is_edited && !isDeleted && (
                              <span className="text-[10px] text-[#8696A0] italic">edited</span>
                            )}
                            <span className="text-[10px] text-[#8696A0]">
                              {formatTime(message.created_at)}
                            </span>
                            {isOwn && !isDeleted && (
                              message.is_read ? (
                                <CheckCheck className="h-4 w-4 text-[#53BDEB]" />
                              ) : (
                                <Check className="h-4 w-4 text-[#8696A0]" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Avatar for sent messages - only show on first message of a group */}
                      {isOwn && isFirstInGroup && (
                        <button
                          onClick={() => showAvatarPreview(senderAvatar, senderName)}
                          className="ml-2 flex-shrink-0 self-end mb-1"
                        >
                          <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-[#00A884] transition-all">
                            <AvatarImage src={senderAvatar} className="object-cover object-center" />
                            <AvatarFallback className="bg-[#00A884] text-white text-xs">
                              {senderName?.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                      )}
                      {/* Spacer for alignment when avatar is not shown */}
                      {isOwn && !isFirstInGroup && <div className="w-10 flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Quick Emoji Bar */}
      {showEmojiPicker && (
        <div className="bg-[#202C33] px-4 py-2 flex items-center gap-2 border-t border-[#2A3942]">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowEmojiPicker(false)}
            className="text-[#8696A0] hover:text-[#E9EDEF] hover:bg-[#374248] h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex-1 flex gap-2 overflow-x-auto">
            {quickEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => addEmoji(emoji)}
                className="text-2xl hover:scale-125 transition-transform p-1"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reply/Edit Preview Bar */}
      {(replyingTo || editingMessage) && (
        <div className="bg-[#202C33] px-4 py-2 border-t border-[#2A3942] flex items-center gap-3">
          <div className={`w-1 h-10 rounded-full ${editingMessage ? 'bg-[#53BDEB]' : 'bg-[#00A884]'}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium ${editingMessage ? 'text-[#53BDEB]' : 'text-[#00A884]'}`}>
              {editingMessage ? 'Editing message' : `Replying to ${replyingTo?.sender_id === user?.id ? 'yourself' : selectedContact?.full_name || 'User'}`}
            </p>
            <p className="text-sm text-[#8696A0] truncate">
              {editingMessage?.content || replyingTo?.content}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={cancelReplyOrEdit}
            className="text-[#8696A0] hover:text-[#E9EDEF] hover:bg-[#374248] h-8 w-8 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Message Input */}
      <div className="bg-[#202C33] px-4 py-3 flex items-center gap-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="text-[#8696A0] hover:text-[#E9EDEF] hover:bg-[#374248]"
        >
          <Smile className="h-6 w-6" />
        </Button>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
        />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-[#8696A0] hover:text-[#E9EDEF] hover:bg-[#374248]">
              <Paperclip className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="bg-[#233138] border-[#2A3942] text-[#E9EDEF] min-w-[160px] z-50">
            <DropdownMenuItem 
              onClick={() => {
                setTimeout(() => fileInputRef.current?.click(), 100);
              }}
              className="hover:bg-[#374248] cursor-pointer px-4 py-2"
            >
              <ImageIcon className="h-4 w-4 mr-3 text-[#BF59CF]" />
              Photos & Videos
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => {
                setTimeout(() => fileInputRef.current?.click(), 100);
              }}
              className="hover:bg-[#374248] cursor-pointer px-4 py-2"
            >
              <File className="h-4 w-4 mr-3 text-[#5157AE]" />
              Document
            </DropdownMenuItem>
            <DropdownMenuItem className="hover:bg-[#374248] cursor-pointer px-4 py-2">
              <Camera className="h-4 w-4 mr-3 text-[#D3396D]" />
              Camera
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Input
          placeholder="Type a message"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          className="flex-1 bg-[#2A3942] border-0 text-[#E9EDEF] placeholder:text-[#8696A0] focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg py-5"
        />

        <Button
          onClick={sendMessage}
          disabled={!newMessage.trim()}
          size="icon"
          className="bg-[#00A884] hover:bg-[#00A884]/90 text-white rounded-full h-10 w-10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #374248;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3B4A54;
        }
      `}</style>

      {/* Avatar Preview Dialog */}
      <Dialog open={!!avatarPreview} onOpenChange={() => setAvatarPreview(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[70vw] lg:max-w-[60vw] p-0 bg-black/95 border-0 overflow-hidden">
          <div className="relative flex items-center justify-center min-h-[50vh] max-h-[90vh]">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 z-10 text-white hover:bg-white/20 rounded-full"
              onClick={() => setAvatarPreview(null)}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* User info */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-white/30">
                <AvatarImage src={avatarPreview?.src} alt={avatarPreview?.name} className="object-cover" />
                <AvatarFallback className="bg-[#00A884] text-white text-sm">
                  {avatarPreview?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-white font-medium text-lg drop-shadow-lg">{avatarPreview?.name}</span>
            </div>

            {/* Full image */}
            {avatarPreview?.src && (
              <img
                src={avatarPreview.src}
                alt={`${avatarPreview.name}'s profile picture`}
                className="max-h-[80vh] max-w-full w-auto h-auto object-contain rounded-lg shadow-2xl"
                style={{ margin: '70px 20px 20px 20px' }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Message Modal */}
      <Dialog open={showDeleteModal} onOpenChange={(open) => { setShowDeleteModal(open); if (!open) setSelectedMessage(null); }}>
        <DialogContent className="bg-[#233138] border-[#2A3942] text-[#E9EDEF] max-w-sm">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Delete message?</h3>
            <div className="space-y-2">
              {selectedMessage?.sender_id === user?.id && (
                <Button
                  onClick={() => selectedMessage && deleteMessageForEveryone(selectedMessage)}
                  className="w-full bg-[#EF4444] hover:bg-[#DC2626] text-white justify-start"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete for everyone
                </Button>
              )}
              <Button
                onClick={() => selectedMessage && deleteMessageForMe(selectedMessage)}
                variant="outline"
                className="w-full border-[#2A3942] hover:bg-[#374248] text-[#E9EDEF] justify-start"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete for me
              </Button>
              <Button
                onClick={() => { setShowDeleteModal(false); setSelectedMessage(null); }}
                variant="ghost"
                className="w-full hover:bg-[#374248] text-[#8696A0]"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
