'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Edit2, Trash2, FileText, Calendar, Clock, Link as LinkIcon, X, BookOpen, Users, User } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

type Assignment = {
  id: string;
  title: string;
  description: string;
  subject_id: string;
  section_id: string;
  teacher_id: string;
  due_date: string;
  file_url: string;
  subjects?: { name: string };
  sections?: { name: string; classes?: { name: string } };
  teachers?: { users?: { full_name: string } };
};

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form Data
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState<Partial<Assignment>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          id,
          title,
          description,
          subject_id,
          section_id,
          teacher_id,
          due_date,
          file_url,
          subjects (name),
          sections (name, classes (name)),
          teachers (users (full_name))
        `)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setAssignments((data as unknown) as Assignment[] || []);
    } catch (error: any) {
      console.error('Error fetching assignments:', error);
      showNotification('error', 'حدث خطأ أثناء جلب الواجبات: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFormData = useCallback(async () => {
    try {
      const [subjectsRes, sectionsRes, teachersRes] = await Promise.all([
        supabase.from('subjects').select('id, name').order('name'),
        supabase.from('sections').select('id, name, classes(name)').order('name'),
        supabase.from('teachers').select('id, users(full_name)')
      ]);

      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (sectionsRes.data) setSections(sectionsRes.data);
      if (teachersRes.data) setTeachers(teachersRes.data);
    } catch (error) {
      console.error('Error fetching form data:', error);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
    fetchFormData();
  }, [fetchAssignments, fetchFormData]);

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAssignment.title || !currentAssignment.subject_id || !currentAssignment.section_id || !currentAssignment.teacher_id || !currentAssignment.due_date) {
      showNotification('error', 'يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: currentAssignment.title,
        description: currentAssignment.description || null,
        subject_id: currentAssignment.subject_id,
        section_id: currentAssignment.section_id,
        teacher_id: currentAssignment.teacher_id,
        due_date: new Date(currentAssignment.due_date).toISOString(),
        file_url: currentAssignment.file_url || null,
      };

      if (currentAssignment.id) {
        // Update
        const { error } = await supabase
          .from('assignments')
          .update(payload)
          .eq('id', currentAssignment.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('assignments')
          .insert([payload]);
        if (error) throw error;
      }

      await fetchAssignments();
      setIsModalOpen(false);
      setCurrentAssignment({});
      showNotification('success', 'تم حفظ الواجب بنجاح!');
    } catch (error: any) {
      console.error('Error saving assignment:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حفظ الواجب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!assignmentToDelete) return;
    
    try {
      const { error } = await supabase.from('assignments').delete().eq('id', assignmentToDelete);
      if (error) throw error;
      await fetchAssignments();
      showNotification('success', 'تم حذف الواجب بنجاح');
    } catch (error: any) {
      console.error('Error deleting assignment:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حذف الواجب');
    } finally {
      setAssignmentToDelete(null);
    }
  };

  const openAddModal = () => {
    // Set default due date to tomorrow at 8:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    
    // Format for datetime-local input (YYYY-MM-DDThh:mm)
    const formattedDate = new Date(tomorrow.getTime() - (tomorrow.getTimezoneOffset() * 60000))
      .toISOString()
      .slice(0, 16);

    setCurrentAssignment({ due_date: formattedDate });
    setIsModalOpen(true);
  };

  const openEditModal = (assignment: Assignment) => {
    // Format date for datetime-local input
    const dateObj = new Date(assignment.due_date);
    const formattedDate = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000))
      .toISOString()
      .slice(0, 16);

    setCurrentAssignment({
      ...assignment,
      due_date: formattedDate
    });
    setIsModalOpen(true);
  };

  const filteredAssignments = assignments.filter(a => 
    a.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.subjects?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.sections?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper to determine if an assignment is overdue
  const isOverdue = (dueDateStr: string) => {
    return new Date(dueDateStr) < new Date();
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
      <Dialog.Root open={!!assignmentToDelete} onOpenChange={(open) => !open && setAssignmentToDelete(null)}>
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
            <p className="text-slate-600 mb-6">هل أنت متأكد من رغبتك في حذف هذا الواجب؟ لا يمكن التراجع عن هذا الإجراء.</p>
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
          <h1 className="text-2xl font-bold text-slate-900">الواجبات المدرسية</h1>
          <p className="text-slate-500">إدارة الواجبات والمهام المسندة للطلاب</p>
        </div>
        <button 
          onClick={openAddModal}
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="mr-2 h-4 w-4 ml-2" />
          إضافة واجب جديد
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-slate-200">
        <div className="relative max-w-md">
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border-0 py-2 pr-10 pl-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            placeholder="البحث بعنوان الواجب، المادة، أو الشعبة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl shadow-sm ring-1 ring-slate-200">
          <FileText className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-lg font-medium text-slate-900">لا توجد واجبات مسجلة</h3>
          <p className="text-slate-500 mt-1">قم بإضافة واجبات جديدة للطلاب للبدء.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssignments.map((assignment) => {
            const overdue = isOverdue(assignment.due_date);
            const dueDateObj = new Date(assignment.due_date);
            
            return (
              <div key={assignment.id} className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col transition-shadow hover:shadow-md">
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                      {assignment.subjects?.name}
                    </span>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => openEditModal(assignment)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        title="تعديل الواجب"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setAssignmentToDelete(assignment.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="حذف الواجب"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2" title={assignment.title}>
                    {assignment.title}
                  </h3>
                  
                  <p className="text-sm text-slate-500 mb-4 line-clamp-3" title={assignment.description}>
                    {assignment.description || 'لا يوجد وصف'}
                  </p>
                  
                  <div className="space-y-2 mt-auto">
                    <div className="flex items-center text-sm text-slate-600 gap-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span>{assignment.sections?.classes?.name} - {assignment.sections?.name}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-600 gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <span>أ. {assignment.teachers?.users?.full_name}</span>
                    </div>
                  </div>
                </div>
                
                <div className={`px-5 py-3 border-t flex items-center justify-between ${overdue ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                  <div className={`flex items-center gap-2 text-sm font-medium ${overdue ? 'text-red-700' : 'text-slate-700'}`}>
                    <Clock className="h-4 w-4" />
                    <span dir="ltr">
                      {dueDateObj.toLocaleDateString('ar-EG')} {dueDateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  {assignment.file_url && (
                    <a 
                      href={assignment.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      <LinkIcon className="h-4 w-4" />
                      <span>المرفق</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Assignment Modal */}
      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl bg-white p-6 shadow-lg focus:outline-none max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-semibold text-slate-900">
                {currentAssignment.id ? 'تعديل الواجب' : 'إضافة واجب جديد'}
              </Dialog.Title>
              <Dialog.Close className="text-slate-400 hover:text-slate-500">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>
            
            <form onSubmit={handleSaveAssignment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">عنوان الواجب <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="مثال: حل تمارين الفصل الأول" 
                  className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  value={currentAssignment.title || ''}
                  onChange={(e) => setCurrentAssignment({...currentAssignment, title: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">الوصف والتفاصيل</label>
                <textarea 
                  rows={3}
                  placeholder="اكتب تفاصيل الواجب هنا..." 
                  className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  value={currentAssignment.description || ''}
                  onChange={(e) => setCurrentAssignment({...currentAssignment, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium leading-6 text-slate-900">المادة <span className="text-red-500">*</span></label>
                  <select 
                    required
                    className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    value={currentAssignment.subject_id || ''}
                    onChange={(e) => setCurrentAssignment({...currentAssignment, subject_id: e.target.value})}
                  >
                    <option value="">اختر المادة</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium leading-6 text-slate-900">الشعبة <span className="text-red-500">*</span></label>
                  <select 
                    required
                    className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    value={currentAssignment.section_id || ''}
                    onChange={(e) => setCurrentAssignment({...currentAssignment, section_id: e.target.value})}
                  >
                    <option value="">اختر الشعبة</option>
                    {sections.map(s => (
                      <option key={s.id} value={s.id}>{s.classes?.name} - {s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium leading-6 text-slate-900">المعلم <span className="text-red-500">*</span></label>
                  <select 
                    required
                    className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    value={currentAssignment.teacher_id || ''}
                    onChange={(e) => setCurrentAssignment({...currentAssignment, teacher_id: e.target.value})}
                  >
                    <option value="">اختر المعلم</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.users?.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium leading-6 text-slate-900">تاريخ ووقت التسليم <span className="text-red-500">*</span></label>
                  <input 
                    type="datetime-local" 
                    required
                    className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 text-left"
                    dir="ltr"
                    value={currentAssignment.due_date || ''}
                    onChange={(e) => setCurrentAssignment({...currentAssignment, due_date: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">رابط الملف المرفق (اختياري)</label>
                <div className="relative mt-2 rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <LinkIcon className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="url"
                    className="block w-full rounded-md border-0 py-2 pl-10 pr-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 text-left"
                    dir="ltr"
                    placeholder="https://..."
                    value={currentAssignment.file_url || ''}
                    onChange={(e) => setCurrentAssignment({...currentAssignment, file_url: e.target.value})}
                  />
                </div>
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
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ الواجب'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
