'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export default function MessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // ✅ جلب المستخدم أولاً
  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    setCurrentUser(data);
  };

  // ✅ جلب الرسائل (بدون الاعتماد على timing)
  const fetchMessages = async (userId: string, role: string) => {
    setLoading(true);

    try {
      let query = supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });

      // ✅ شرط واضح وصحيح
      if (role !== 'admin') {
        query = query.or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setMessages(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ تحميل المستخدم
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // ✅ تحميل الرسائل بعد توفر المستخدم
  useEffect(() => {
    if (currentUser) {
      fetchMessages(currentUser.id, currentUser.role);
    }
  }, [currentUser]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">الرسائل</h1>

      {loading ? (
        <p>جاري التحميل...</p>
      ) : messages.length === 0 ? (
        <p>لا توجد رسائل</p>
      ) : (
        messages.map(msg => (
          <div key={msg.id} className="border p-3 mb-2 rounded">
            <p className="font-bold">{msg.subject}</p>
            <p>{msg.content}</p>
          </div>
        ))
      )}
    </div>
  );
}