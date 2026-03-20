'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Megaphone, Plus, Search, Send, User, Clock, X, UserPlus, Filter, Mail, Bell, ArrowRight, Users, Trash2 } from 'lucide-react';
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

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [teacherSections, setTeacherSections] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);

  const [step, setStep] = useState(1);
  const [recipientType, setRecipientType] = useState<'teacher' | 'student' | ''>('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [newMessage, setNewMessage] = useState({ receiver_id: '', subject: '', content: '' });
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', target_role: 'all', content: '' });

  const [isGroupMessage, setIsGroupMessage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // ✅ FIXED
  const fetchThread = async (parentId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          subject,
          content,
          is_read,
          created_at,
          parent_id,
          sender:sender_id(full_name, avatar_url, role)
        `)
        .eq('parent_id', parentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setThreadMessages(data || []);
    } catch (error) {
      console.error(error);
      showNotification('error', 'خطأ في تحميل النقاش');
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });

      setMessages(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    const group = messages.reduce((acc: any, msg: any) => {
      const key = msg.subject + msg.content;
      if (!acc[key]) acc[key] = { ...msg, ids: [msg.id], count: 1 };
      else {
        acc[key].ids.push(msg.id);
        acc[key].count++;
      }
      return acc;
    }, {});
    setGroupedMessages(Object.values(group));
  }, [messages]);

  const handleSendReply = async (e: any) => {
    e.preventDefault();
    if (!replyContent || !activeThread) return;

    try {
      await supabase.from('messages').insert([{
        content: replyContent,
        parent_id: activeThread.ids[0]
      }]);

      setReplyContent('');
      fetchThread(activeThread.ids[0]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-10">

      {/* Messages */}
      {groupedMessages.map((m) => (
        <div key={m.ids[0]}>
          <p>{m.subject}</p>
          <button onClick={() => {
            setActiveThread(m);
            fetchThread(m.ids[0]);
          }}>
            فتح
          </button>
        </div>
      ))}

      {/* Thread Modal */}
      <AnimatePresence>
        {activeThread && (
          <div className="fixed inset-0 bg-black/50">
            <div className="bg-white p-6">
              <h2>{activeThread.subject}</h2>

              {threadMessages.map((msg) => (
                <p key={msg.id}>{msg.content}</p>
              ))}

              <form onSubmit={handleSendReply}>
                <input
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                />
                <button type="submit">إرسال</button>
              </form>

              <button onClick={() => setActiveThread(null)}>إغلاق</button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ✅ FIXED Modal */}
      <AnimatePresence>
        {showNewMessage && (
          <div className="fixed inset-0 bg-black/50">
            <div className="bg-white p-6">
              <h2>رسالة جديدة</h2>
              <button onClick={() => setShowNewMessage(false)}>إغلاق</button>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}