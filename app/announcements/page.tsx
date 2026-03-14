'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Edit2, Trash2, Megaphone, Bell, X, Users, Calendar, Filter } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

type Announcement = {
  id: string;
  title: string;
  content: string;
  target_role: string;
  created_at: string;
  author_id?: string;
  users?: { full_name: string };
};

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'الجميع' },
  { value: 'teacher', label: 'المعلمين' },
  { value: 'student', label: 'الطلاب' },
  { value: 'parent', label: 'أولياء الأمور' },
];

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('all_types');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Partial<Announcement>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          id,
          title,
          content,
          target_role,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching announcements:', error);
        showNotification('error', 'حدث خطأ أثناء جلب الإعلانات: ' + error.message);
        setAnnouncements([]);
      } else {
        setAnnouncements((data as unknown) as Announcement[] || []);
      }
    } catch (error: any) {
      console.error('Error:', error);
      showNotification('error', 'حدث خطأ غير متوقع: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAnnouncement.title || !currentAnnouncement.content || !currentAnnouncement.target_role) {
      showNotification('error', 'يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: currentAnnouncement.title,
        content: currentAnnouncement.content,
        target_role: currentAnnouncement.target_role === 'all' ? null : currentAnnouncement.target_role,
      };

      if (currentAnnouncement.id) {
        // Update
        const { data, error } = await supabase
          .from('announcements')
          .update(payload)
          .eq('id', currentAnnouncement.id)
          .select();
          
        if (error) {
          console.error('Supabase Update Error Details:', JSON.stringify(error, null, 2));
          throw error;
        }
      } else {
        // Insert
        const { data, error } = await supabase
          .from('announcements')
          .insert([payload])
          .select();
          
        if (error) {
          console.error('Supabase Insert Error Details:', JSON.stringify(error, null, 2));
          throw error;
        }
      }

      await fetchAnnouncements();
      setIsModalOpen(false);
      setCurrentAnnouncement({});
      showNotification('success', 'تم حفظ الإعلان بنجاح!');
    } catch (error: any) {
      console.error('Error saving announcement:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حفظ الإعلان');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!announcementToDelete) return;
    
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', announcementToDelete);
      if (error) throw error;
      await fetchAnnouncements();
      showNotification('success', 'تم حذف الإعلان بنجاح');
    } catch (error) {
      console.error('Error deleting announcement:', error);
      showNotification('error', 'حدث خطأ أثناء حذف الإعلان');
    } finally {
      setAnnouncementToDelete(null);
    }
  };

  const openAddModal = () => {
    setCurrentAnnouncement({ target_role: 'all' });
    setIsModalOpen(true);
  };

  const openEditModal = (announcement: Announcement) => {
    setCurrentAnnouncement(announcement);
    setIsModalOpen(true);
  };

  const filteredAnnouncements = announcements.filter(a => {
    const matchesSearch = a.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAudience = audienceFilter === 'all_types' || a.target_role === audienceFilter;
    return matchesSearch && matchesAudience;
  });

  const getAudienceLabel = (value: string) => {
    return AUDIENCE_OPTIONS.find(opt => opt.value === value)?.label || 'غير محدد';
  };

  const getAudienceColor = (value: string) => {
    switch (value) {
      case 'all': return 'bg-indigo-50 text-indigo-700 ring-indigo-600/20';
      case 'teacher': return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
      case 'student': return 'bg-blue-50 text-blue-700 ring-blue-600/20';
      case 'parent': return 'bg-amber-50 text-amber-700 ring-amber-600/20';
      default: return 'bg-slate-50 text-slate-700 ring-slate-600/20';
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 transition-all ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="font-medium">{notification.message}</div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog.Root open={!!announcementToDelete} onOpenChange={(open) => !open && setAnnouncementToDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl bg-white p-6 shadow-lg focus:outline-none" dir="rtl">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-semibold text-slate-900">
                تأكيد الحذف
              </Dialog.Title>
              <Dialog.Close className="text-slate-400 hover:text-slate-500">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>
            <p className="text-slate-600 mb-6">هل أنت متأكد من رغبتك في حذف هذا الإعلان؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex justify-end gap-3">
              <Dialog.Close asChild>
                <button className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                  إلغاء
                </button>
              </Dialog.Close>
              <button
                onClick={confirmDelete}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                تأكيد الحذف
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">الإعلانات والتعاميم</h1>
          <p className="text-slate-500">إدارة الإعلانات الموجهة للطلاب، المعلمين، وأولياء الأمور</p>
        </div>
        <button 
          onClick={openAddModal}
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="mr-2 h-4 w-4 ml-2" />
          إضافة إعلان جديد
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              className="block w-full rounded-md border-0 py-2 pr-10 pl-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              placeholder="البحث في الإعلانات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative sm:w-64">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <Filter className="h-5 w-5 text-slate-400" aria-hidden="true" />
            </div>
            <select
              className="block w-full rounded-md border-0 py-2 pr-10 pl-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value)}
            >
              <option value="all_types">جميع الفئات</option>
              {AUDIENCE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl shadow-sm ring-1 ring-slate-200">
          <Megaphone className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-lg font-medium text-slate-900">لا توجد إعلانات</h3>
          <p className="text-slate-500 mt-1">لم يتم العثور على إعلانات تطابق معايير البحث.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredAnnouncements.map((announcement) => {
            const dateObj = new Date(announcement.created_at);
            
            return (
              <div key={announcement.id} className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col sm:flex-row transition-shadow hover:shadow-md">
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getAudienceColor(announcement.target_role).split(' ')[0]}`}>
                        <Bell className={`h-6 w-6 ${getAudienceColor(announcement.target_role).split(' ')[1]}`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 leading-tight">
                          {announcement.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span dir="ltr">{dateObj.toLocaleDateString('ar-EG')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{getAudienceLabel(announcement.target_role)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      <button 
                        onClick={() => openEditModal(announcement)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        title="تعديل الإعلان"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setAnnouncementToDelete(announcement.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="حذف الإعلان"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="prose prose-sm prose-slate max-w-none text-slate-600 whitespace-pre-wrap">
                    {announcement.content}
                  </div>
                </div>
                
                <div className={`w-full sm:w-2 ${getAudienceColor(announcement.target_role).split(' ')[0]} hidden sm:block`}></div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Announcement Modal */}
      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-xl bg-white p-6 shadow-lg focus:outline-none max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-semibold text-slate-900">
                {currentAnnouncement.id ? 'تعديل الإعلان' : 'إضافة إعلان جديد'}
              </Dialog.Title>
              <Dialog.Close className="text-slate-400 hover:text-slate-500">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>
            
            <form onSubmit={handleSaveAnnouncement} className="space-y-5">
              <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">عنوان الإعلان <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="مثال: موعد اختبارات نهاية الفصل الدراسي" 
                  className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  value={currentAnnouncement.title || ''}
                  onChange={(e) => setCurrentAnnouncement({...currentAnnouncement, title: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">الفئة المستهدفة <span className="text-red-500">*</span></label>
                <select 
                  required
                  className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  value={currentAnnouncement.target_role || ''}
                  onChange={(e) => setCurrentAnnouncement({...currentAnnouncement, target_role: e.target.value})}
                >
                  {AUDIENCE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">سيظهر هذا الإعلان فقط للفئة المحددة في لوحة التحكم الخاصة بهم.</p>
              </div>

              <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">نص الإعلان <span className="text-red-500">*</span></label>
                <textarea 
                  required
                  rows={8}
                  placeholder="اكتب محتوى الإعلان هنا..." 
                  className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  value={currentAnnouncement.content || ''}
                  onChange={(e) => setCurrentAnnouncement({...currentAnnouncement, content: e.target.value})}
                />
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري النشر...' : 'نشر الإعلان'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
