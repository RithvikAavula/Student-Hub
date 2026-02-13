import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Conversation, Message, Profile, UserRole } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  Search,
  MessageCircle,
  User,
  ArrowLeft
} from 'lucide-react';

interface MessagesTabProps {
  userRole: 'student' | 'faculty';
}

export default function MessagesTab({ userRole }: MessagesTabProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [selectedContact, setSelectedContact] = useState<Profile | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'contacts' | 'chat'>('contacts');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchContacts = useCallback(async () => {
    try {
      console.log('fetchContacts called, userRole:', userRole, 'user.id:', user?.id);

      // Don't run queries until user is available
      if (!user?.id) {
        console.log('fetchContacts: no authenticated user yet, skipping');
        return;
      }

      if (userRole === 'student') {
        // Get assigned faculty
        console.log('Querying faculty_assignments for student_id:', user.id);
        const { data: assignments, error: assignError } = await supabase
          .from('faculty_assignments')
          .select('faculty_id')
          .eq('student_id', user.id);

        console.log('Assignments query result:', { data: assignments, error: assignError });

        if (assignError) {
          // More helpful error message for permission issues
          console.error('assignments fetch error:', assignError);
          if (String(assignError.message).toLowerCase().includes('permission') || String(assignError.message).toLowerCase().includes('row level')) {
            toast({
              title: 'Permission error fetching assignments',
              description: 'Database permissions may block reading faculty assignments. Check RLS policies.',
              variant: 'destructive',
            });
            setContacts([]);
            return;
          }
          throw assignError;
        }

        if (assignments && assignments.length > 0) {
          const ids = (assignments as { faculty_id?: string }[]).map(a => a.faculty_id).filter(Boolean) as string[];
          console.log('Found assignments, querying profiles for faculty ids:', ids);
          const { data: faculty, error: facultyError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', ids);

          console.log('Faculty profiles query result:', { data: faculty, error: facultyError });

          if (facultyError) {
            console.error('profiles fetch error:', facultyError);
            if (String(facultyError.message).toLowerCase().includes('permission')) {
              toast({
                title: 'Permission error fetching profiles',
                description: 'Database policies may restrict profile access. Update `profiles` RLS policies.',
                variant: 'destructive',
              });
              setContacts([]);
              return;
            }
            throw facultyError;
          }

          setContacts(faculty || []);
          console.log('Set contacts to:', faculty);
        } else {
          console.log('No assignments found');
          setContacts([]);
        }
      } else {
        // Get assigned students
        console.log('Querying faculty_assignments for faculty_id:', user.id);
        const { data: assignments, error: assignError } = await supabase
          .from('faculty_assignments')
          .select('student_id')
          .eq('faculty_id', user.id);

        console.log('Assignments query result:', { data: assignments, error: assignError });

        if (assignError) {
          console.error('assignments fetch error:', assignError);
          throw assignError;
        }

        if (assignments && assignments.length > 0) {
          const ids = (assignments as { student_id?: string }[]).map(a => a.student_id).filter(Boolean) as string[];
          console.log('Found assignments, querying profiles for student ids:', ids);
          const { data: students, error: studentsError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', ids)
            .order('full_name');

          console.log('Student profiles query result:', { data: students, error: studentsError });

          if (studentsError) throw studentsError;
          setContacts(students || []);
          console.log('Set contacts to:', students);
        } else {
          console.log('No assignments found');
          setContacts([]);
        }
      }
    } catch (error) {
      console.error('Error in fetchContacts:', error);
      toast({
        title: 'Error fetching contacts',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [userRole, user?.id, toast]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(*)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      // Scroll to bottom after loading messages
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      toast({
        title: 'Error fetching messages',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [toast]);


  const markMessagesAsRead = useCallback(async (conversationId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user?.id)
        .eq('is_read', false);
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

  const markMessageAsRead = useCallback(async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }, []);

  // Set up real-time subscription for new messages
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

          // Check if message is already in state (from optimistic update)
          setMessages(prev => {
            const messageExists = prev.some(msg => msg.id === newMessage.id);
            if (messageExists) {
              return prev; // Don't add duplicate
            }

            // Fetch the complete message with sender information
            // For now, we'll add the basic message and update it later if needed
            const updatedMessages = [...prev, {
              ...newMessage,
              sender: {
                id: newMessage.sender_id,
                email: '',
                full_name: 'Unknown User',
                role: (userRole === 'student' ? 'faculty' : 'student') as UserRole,
                created_at: newMessage.created_at,
                updated_at: newMessage.created_at,
              }
            }];

            // Scroll to bottom after adding message
            setTimeout(() => scrollToBottom(), 100);

            return updatedMessages;
          });

          // Mark as read if user is viewing the conversation
          if (newMessage.sender_id !== user.id) {
            markMessageAsRead(newMessage.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, conversation, markMessageAsRead, userRole]);

  const handleContactClick = async (contact: Profile) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('Starting conversation with contact:', contact);
      console.log('User role:', userRole, 'User ID:', user.id);

      // Find or create conversation
      let conversationQuery = supabase
        .from('conversations')
        .select('*');

      if (userRole === 'student') {
        conversationQuery = conversationQuery
          .eq('student_id', user.id)
          .eq('faculty_id', contact.id);
        console.log('Student query - student_id:', user.id, 'faculty_id:', contact.id);
      } else {
        conversationQuery = conversationQuery
          .eq('faculty_id', user.id)
          .eq('student_id', contact.id);
        console.log('Faculty query - faculty_id:', user.id, 'student_id:', contact.id);
      }

      const { data: existingConv, error: convError } = await conversationQuery.single();
      console.log('Existing conversation query result:', { data: existingConv, error: convError });

      if (convError && convError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error querying existing conversation:', convError);
        throw convError;
      }

      let currentConversation: Conversation;

      if (existingConv) {
        console.log('Using existing conversation:', existingConv);
        currentConversation = existingConv;
      } else {
        console.log('Creating new conversation...');
        // Create new conversation
        const conversationData = {
          faculty_id: userRole === 'student' ? contact.id : user.id,
          student_id: userRole === 'student' ? user.id : contact.id,
        };
        console.log('Conversation data to insert:', conversationData);

        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert(conversationData)
          .select()
          .single();

        console.log('New conversation creation result:', { data: newConv, error: createError });

        if (createError) {
          console.error('Error creating conversation:', createError);
          throw createError;
        }
        currentConversation = newConv;
      }

      console.log('Setting conversation and switching to chat view');
      setConversation(currentConversation);
      setSelectedContact(contact);
      setViewMode('chat');
    } catch (error) {
      console.error('Full error in handleContactClick:', error);
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
    setNewMessage(''); // Clear input immediately

    // Create optimistic message object
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`, // Temporary ID
      conversation_id: conversation.id,
      sender_id: user.id,
      content: messageContent,
      message_type: 'text',
      is_read: false,
      created_at: new Date().toISOString(),
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

    // Add message to UI immediately (optimistic update)
    setMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom(); // Scroll to bottom immediately

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content: messageContent,
          message_type: 'text',
        })
        .select(`
          *,
          sender:profiles(*)
        `)
        .single();

      if (error) throw error;

      // Replace optimistic message with real message from database
      setMessages(prev => prev.map(msg =>
        msg.id === optimisticMessage.id ? data : msg
      ));
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));

      toast({
        title: 'Error sending message',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });

      // Restore the message in the input if it failed
      setNewMessage(messageContent);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !conversation) return;

    try {
      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `messages/${conversation.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars') // Using existing bucket, you might want to create a separate one
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Send message with file
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user?.id,
          content: file.name,
          message_type: file.type.startsWith('image/') ? 'image' : 'file',
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
        });

      if (error) throw error;
    } catch (error) {
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

  const handleBackToContacts = () => {
    setViewMode('contacts');
    setSelectedContact(null);
    setConversation(null);
    setMessages([]);
  };

  const filteredContacts = contacts.filter((contact) =>
    contact.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading contacts...</div>
      </div>
    );
  }

  // Debug info for troubleshooting
  const debugInfo = (
    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
      <h4 className="font-semibold text-yellow-800">Debug Info:</h4>
      <p className="text-sm text-yellow-700">User ID: {user?.id || 'Not logged in'}</p>
      <p className="text-sm text-yellow-700">User Role: {userRole}</p>
      <p className="text-sm text-yellow-700">Contacts loaded: {contacts.length}</p>
      <p className="text-sm text-yellow-700">Check browser console for detailed logs</p>
    </div>
  );

  // If student and no assigned faculty, show a clear message
  if (userRole === 'student' && !loading && contacts.length === 0) {
    return (
      <div className="space-y-4">
        {debugInfo}
        <div className="flex flex-col items-center justify-center h-96">
          <User className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            No faculty assigned yet. Please contact your administrator to assign faculty.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            If you believe faculty should be assigned, check the browser console for debug logs.
          </p>
        </div>
      </div>
    );
  }

  if (viewMode === 'contacts') {
    return (
      <div className="space-y-4">
        {userRole === 'student' && debugInfo}
        <div className="flex items-center gap-3 mb-4">
          <MessageCircle className="w-6 h-6" />
          <h3 className="text-2xl font-semibold">
            {userRole === 'student' ? 'My Faculty' : 'My Students'}
          </h3>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${userRole === 'student' ? 'faculty' : 'students'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {filteredContacts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                {userRole === 'student'
                  ? 'No faculty assigned yet. Please contact your administrator.'
                  : 'No students assigned yet. Please assign students to start messaging.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredContacts.map((contact) => (
              <Card
                key={contact.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleContactClick(contact)}
              >
                <CardContent className="p-6 text-center">
                  <Avatar className="w-16 h-16 mx-auto mb-4">
                    <AvatarImage src={contact.avatar} />
                    <AvatarFallback className="text-lg">
                      {contact.full_name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h4 className="font-semibold text-lg mb-1">{contact.full_name}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {userRole === 'student' ? 'Faculty' : `Student ID: ${contact.student_id}`}
                  </p>
                  {userRole === 'faculty' && contact.year_of_study && (
                    <p className="text-sm text-muted-foreground">
                      Year {contact.year_of_study} • Section {contact.section}
                    </p>
                  )}
                  <Button className="w-full mt-4" onClick={() => handleContactClick(contact)}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Start Chat
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedContact && conversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-muted/10 flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToContacts}
                className="p-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Avatar>
                <AvatarImage src={selectedContact?.avatar} />
                <AvatarFallback>
                  {selectedContact?.full_name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-medium">{selectedContact?.full_name}</h4>
                <p className="text-sm text-muted-foreground">
                  {userRole === 'student' ? 'Faculty' : 'Student'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {message.message_type === 'image' && message.file_url && (
                        <img
                          src={message.file_url}
                          alt={message.file_name}
                          className="rounded mb-2 max-w-full h-auto"
                        />
                      )}
                      {message.message_type === 'file' && message.file_url && (
                        <a
                          href={message.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-500 hover:underline"
                        >
                          <Paperclip className="w-4 h-4" />
                          {message.file_name}
                        </a>
                      )}
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a contact to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}