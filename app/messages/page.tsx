'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Megaphone, Plus, Search, Send, User, Clock, Check, CheckCheck, X, UserPlus, Filter, Mail, Bell, ArrowRight, Users, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Tab = 'messages' | 'announcements';

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('messages');
  const [messages, setMessages] = useState<any[]>([]);
  const [groupedMessages, setGroupedMessages] = useState<any[]>([]);
  const [activeThread, setActiveThread] = useState<any | null>(null);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [editingMessage, setEditingMessage] = useState<any | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [teacherSections, setTeacherSections] = useState<any[]>([]);
  const [step, setStep] = useState(1);
  const [recipientType, setRecipientType] = useState<'teacher' | 'student' | ''>('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [newMessage, setNewMessage] = useState({ receiver_id: '', subject: '', content: '' });
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', target_role: 'all', content: '' });
  const [isGroupMessage, setIsGroupMessage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);

  // ✅ FIX 1: moved up + dependency fixed
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('يجب تسجيل الدخول أولاً');

      let query = supabase
        .from('messages')
        .select(`
          id,
          subject,
          content,
          is_read,
          created_at,
          parent_id,
          section_id,
          sender:sender_id(full_name, avatar_url, role),
          receiver:receiver_id(full_name),
          section:section_id(name, classes(name))
        `)
        .order('created_at', { ascending: false });

      if (currentUser?.role !== 'admin') {
        query = query.or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]); // ✅ FIX 2

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from('users').select('id, full_name, role');
    setUsers(data || []);
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    const { data } = await supabase
      .from('announcements')
      .select(`*, author:author_id(full_name)`)
      .order('created_at', { ascending: false });
    setAnnouncements(data || []);
  }, []);

  const fetchInitialData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      setCurrentUser(userData);
      fetchAnnouncements();
    }

    fetchUsers();
  }, [fetchUsers, fetchAnnouncements]); // ✅ FIX 3 حذف fetchMessages

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (activeTab === 'messages' && currentUser) {
      fetchMessages();
    }
  }, [activeTab, currentUser, fetchMessages]); // ✅ FIX 4

  return (
    <div className="max-w-[1400px] mx-auto space-y-10 pb-20">
      <h1 className="text-3xl font-bold">الرسائل والإعلانات</h1>

      {loading ? (
        <p>جاري التحميل...</p>
      ) : messages.length === 0 ? (
        <p>لا توجد رسائل</p>
      ) : (
        messages.map(msg => (
          <div key={msg.id} className="border p-4 rounded-lg">
            <p className="font-bold">{msg.subject}</p>
            <p>{msg.content}</p>
          </div>
        ))
      )}
    </div>
  );
}