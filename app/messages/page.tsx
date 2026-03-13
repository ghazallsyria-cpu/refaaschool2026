'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Megaphone, Plus, Search, Send, User, Clock, Check, CheckCheck } from 'lucide-react';

type Tab = 'messages' | 'announcements';

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('messages');
  const [messages, setMessages] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);

  useEffect(() => {
    if (activeTab === 'messages') {
      fetchMessages();
    } else {
      fetchAnnouncements();
    }
  }, [activeTab]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          subject,
          content,
          is_read,
          created_at,
          sender:sender_id(full_name, avatar_url, role)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          id,
          title,
          content,
          target_role,
          created_at,
          author:author_id(full_name, role)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = messages.filter(m => 
    m.subject?.includes(searchTerm) || 
    m.sender?.full_name?.includes(searchTerm)
  );

  const filteredAnnouncements = announcements.filter(a => 
    a.title?.includes(searchTerm) || 
    a.content?.includes(searchTerm)
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">الرسائل والإعلانات</h1>
          <p className="text-slate-500">التواصل الداخلي وإعلانات المدرسة</p>
        </div>
        <div className="flex gap-3">
          {activeTab === 'messages' ? (
            <button 
              onClick={() => setShowNewMessage(true)}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus className="mr-2 h-4 w-4 ml-2" />
              رسالة جديدة
            </button>
          ) : (
            <button 
              onClick={() => setShowNewAnnouncement(true)}
              className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
            >
              <Plus className="mr-2 h-4 w-4 ml-2" />
              إعلان جديد
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8 space-x-reverse" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('messages')}
            className={`
              whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium flex items-center gap-2
              ${activeTab === 'messages'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }
            `}
          >
            <MessageSquare className="h-5 w-5" />
            صندوق الوارد
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`
              whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium flex items-center gap-2
              ${activeTab === 'announcements'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }
            `}
          >
            <Megaphone className="h-5 w-5" />
            لوحة الإعلانات
          </button>
        </nav>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-slate-200">
        <div className="relative max-w-md">
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border-0 py-2 pr-10 pl-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            placeholder={`البحث في ${activeTab === 'messages' ? 'الرسائل' : 'الإعلانات'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-500">جاري التحميل...</div>
          </div>
        ) : activeTab === 'messages' ? (
          /* Messages List */
          <div className="divide-y divide-slate-200">
            {filteredMessages.length === 0 ? (
              <div className="p-10 text-center text-slate-500">لا توجد رسائل</div>
            ) : (
              filteredMessages.map((message) => (
                <div key={message.id} className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${!message.is_read ? 'bg-indigo-50/30' : ''}`}>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                        {message.sender?.full_name?.charAt(0) || <User className="h-5 w-5" />}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium ${!message.is_read ? 'text-slate-900' : 'text-slate-700'}`}>
                          {message.sender?.full_name || 'مستخدم غير معروف'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock className="h-3 w-3" />
                          {new Date(message.created_at).toLocaleDateString('ar-EG')}
                        </div>
                      </div>
                      <p className={`text-sm mt-1 ${!message.is_read ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                        {message.subject || 'بدون عنوان'}
                      </p>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Announcements List */
          <div className="p-6 grid grid-cols-1 gap-6">
            {filteredAnnouncements.length === 0 ? (
              <div className="p-10 text-center text-slate-500">لا توجد إعلانات</div>
            ) : (
              filteredAnnouncements.map((announcement) => (
                <div key={announcement.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-slate-900">{announcement.title}</h3>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                      {announcement.target_role === 'student' ? 'للطلاب' : 
                       announcement.target_role === 'teacher' ? 'للمعلمين' : 
                       announcement.target_role === 'parent' ? 'لأولياء الأمور' : 'للجميع'}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed mb-4 whitespace-pre-line">
                    {announcement.content}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-4 mt-4">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      <span>{announcement.author?.full_name || 'الإدارة'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{new Date(announcement.created_at).toLocaleDateString('ar-EG')}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* New Message Modal */}
      {showNewMessage && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/75 transition-opacity" onClick={() => setShowNewMessage(false)}></div>
            <div className="relative transform overflow-hidden rounded-xl bg-white text-right shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-xl font-semibold leading-6 text-slate-900 mb-6">رسالة جديدة</h3>
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium leading-6 text-slate-900">إلى</label>
                    <select className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">
                      <option>اختر المستلم...</option>
                      <option>أ. أحمد محمد (مدير المدرسة)</option>
                      <option>أ. سمير الشمري (معلم رياضيات)</option>
                      <option>ولي أمر الطالب: خالد عبدالله</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium leading-6 text-slate-900">الموضوع</label>
                    <input type="text" className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium leading-6 text-slate-900">نص الرسالة</label>
                    <textarea rows={5} className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"></textarea>
                  </div>
                </form>
              </div>
              <div className="bg-slate-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto"
                  onClick={() => {
                    alert('في بيئة الإنتاج، سيتم إرسال الرسالة للمستلم.');
                    setShowNewMessage(false);
                  }}
                >
                  <Send className="w-4 h-4 ml-2" />
                  إرسال
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 sm:mt-0 sm:w-auto"
                  onClick={() => setShowNewMessage(false)}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Announcement Modal */}
      {showNewAnnouncement && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/75 transition-opacity" onClick={() => setShowNewAnnouncement(false)}></div>
            <div className="relative transform overflow-hidden rounded-xl bg-white text-right shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-xl font-semibold leading-6 text-slate-900 mb-6">إعلان جديد</h3>
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium leading-6 text-slate-900">عنوان الإعلان</label>
                    <input type="text" className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm sm:leading-6" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium leading-6 text-slate-900">الفئة المستهدفة</label>
                    <select className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm sm:leading-6">
                      <option value="all">الجميع</option>
                      <option value="student">الطلاب</option>
                      <option value="teacher">المعلمين</option>
                      <option value="parent">أولياء الأمور</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium leading-6 text-slate-900">نص الإعلان</label>
                    <textarea rows={5} className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm sm:leading-6"></textarea>
                  </div>
                </form>
              </div>
              <div className="bg-slate-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 sm:ml-3 sm:w-auto"
                  onClick={() => {
                    alert('في بيئة الإنتاج، سيتم نشر الإعلان للفئة المحددة.');
                    setShowNewAnnouncement(false);
                  }}
                >
                  <Megaphone className="w-4 h-4 ml-2" />
                  نشر الإعلان
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 sm:mt-0 sm:w-auto"
                  onClick={() => setShowNewAnnouncement(false)}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
