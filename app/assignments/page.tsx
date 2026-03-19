'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Edit2, Trash2, FileText, Calendar, Clock, Link as LinkIcon, X, BookOpen, Users, User, AlertCircle } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';

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
  const [userRole, setUserRole] = useState<string | null>(null);
  
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      const role = userData?.role || 'student';
      setUserRole(role);

      let query = supabase
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

      if (role === 'teacher') {
        query = query.eq('teacher_id', user.id);
      } else if (role === 'student') {
        // Get student's section_id
        const { data: studentData } = await supabase
          .from('students')
          .select('section_id')
          .eq('id', user.id)
          .single();
        
        if (studentData?.section_id) {
          query = query.eq('section_id', studentData.section_id);
        } else {
          // If student has no section, return empty
          setAssignments([]);
          return;
        }
      } else if (role === 'parent') {
        // Get parent's children's section_ids
        const { data: childrenData } = await supabase
          .from('students')
          .select('section_id')
          .eq('parent_id', user.id);
        
        const sectionIds = childrenData?.map(c => c.section_id).filter(Boolean) || [];
        if (sectionIds.length > 0) {
          query = query.in('section_id', sectionIds);
        } else {
          setAssignments([]);
          return;
        }
      }
      // admins and management see all

      const { data, error } = await query;

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
      const isAdmin = userData?.role === 'admin' || userData?.role === 'management';

      let subjectsData: any[] = [];
      let sectionsData: any[] = [];
      let teachersData: any[] = [];

      if (isAdmin) {
        const [subjectsRes, sectionsRes, teachersRes] = await Promise.all([
          supabase.from('subjects').select('id, name').order('name'),
          supabase.from('sections').select('id, name, classes(name)').order('name'),
          supabase.from('teachers').select('id, users(full_name)')
        ]);
        subjectsData = subjectsRes.data || [];
        sectionsData = (sectionsRes.data || []).map((s: any) => ({
          ...s,
          classes: Array.isArray(s.classes) ? s.classes[0] : s.classes
        }));
        teachersData = teachersRes.data || [];
      } else {
        // Fetch teacher's assigned subjects and sections
        const [subjectsRes, sectionsRes] = await Promise.all([
          supabase.from('teacher_subjects').select('subject:subjects(id, name)').eq('teacher_id', user.id),
          supabase.from('teacher_sections').select('section:sections(id, name, classes(name))').eq('teacher_id', user.id)
        ]);
        
        subjectsData = (subjectsRes.data || []).map((ts: any) => {
          const subject = Array.isArray(ts.subject) ? ts.subject[0] : ts.subject;
          return subject;
        }).filter(Boolean);

        sectionsData = (sectionsRes.data || []).map((ts: any) => {
          const section = Array.isArray(ts.section) ? ts.section[0] : ts.section;
          if (!section) return null;
          return {
            ...section,
            classes: Array.isArray(section.classes) ? section.classes[0] : section.classes
          };
        }).filter(Boolean);

        // Fallback: If no assigned subjects, fetch all subjects (to avoid empty dropdown)
        if (subjectsData.length === 0) {
          const { data: allSubjects } = await supabase.from('subjects').select('id, name').order('name');
          subjectsData = allSubjects || [];
        }

        // Fallback: If no assigned sections, fetch all sections
        if (sectionsData.length === 0) {
          const { data: allSections } = await supabase.from('sections').select('id, name, classes(name)').order('name');
          sectionsData = (allSections || []).map((s: any) => ({
            ...s,
            classes: Array.isArray(s.classes) ? s.classes[0] : s.classes
          }));
        }

        // Only the current teacher
        const { data: currentTeacher } = await supabase.from('teachers').select('id, users(full_name)').eq('id', user.id).single();
        teachersData = currentTeacher ? [currentTeacher] : [];
      }

      setSubjects(subjectsData);
      setSections(sectionsData);
      setTeachers(teachersData);
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
        const { data: newAssignment, error } = await supabase
          .from('assignments')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;

        // Send Notifications to students in the section
        try {
          const { data: students } = await supabase
            .from('students')
            .select('id')
            .eq('section_id', payload.section_id);

          if (students && students.length > 0) {
            const subjectName = subjects.find(s => s.id === payload.subject_id)?.name || 'المادة';
            const notificationPromises = students.map(student => {
              console.log(`Notification: ${student.id} - واجب جديد - تمت إضافة واجب جديد في مادة ${subjectName}: ${payload.title}`);
            });
            await Promise.all(notificationPromises);
          }
        } catch (notifErr) {
          console.error('Error sending assignment notifications:', notifErr);
        }
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

  const openAddModal = async () => {
    // Set default due date to tomorrow at 8:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    
    // Format for datetime-local input (YYYY-MM-DDThh:mm)
    const formattedDate = new Date(tomorrow.getTime() - (tomorrow.getTimezoneOffset() * 60000))
      .toISOString()
      .slice(0, 16);

    const { data: { user } } = await supabase.auth.getUser();
    
    setCurrentAssignment({ due_date: formattedDate, teacher_id: user?.id });
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
    <div className="space-y-10 max-w-7xl mx-auto pb-24">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-50 px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 transition-all animate-in fade-in slide-in-from-top-4 duration-500 ${
          notification.type === 'success' ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-red-500 text-white shadow-red-100'
        }`}>
          <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center">
            {notification.type === 'success' ? <FileText className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
          </div>
          <div className="font-black tracking-tight">{notification.message}</div>
          <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">الواجبات المدرسية</h1>
          <p className="text-lg text-slate-500 font-medium">إدارة الواجبات والمهام المسندة للطلاب</p>
        </div>
        {(userRole === 'teacher' || userRole === 'admin' || userRole === 'management') && (
          <button 
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-95 self-start md:self-end"
          >
            <Plus className="h-5 w-5" />
            إضافة واجب جديد
          </button>
        )}
      </div>

      <div className="glass-card p-6 rounded-4xl shadow-2xl shadow-slate-200/50 border border-white/60">
        <div className="relative max-w-2xl group">
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
            <Search className="h-5 w-5" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full rounded-2xl border-0 py-4 pr-12 pl-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold"
            placeholder="البحث بعنوان الواجب، المادة، أو الشعبة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center py-32 gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-slate-500 font-bold animate-pulse">جاري تحميل الواجبات...</p>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="text-center py-32 glass-card rounded-4xl border border-white/60 shadow-2xl shadow-slate-200/50">
          <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="h-12 w-12 text-slate-300" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">لا توجد واجبات مسجلة</h3>
          <p className="text-slate-500 mt-2 font-medium">قم بإضافة واجبات جديدة للطلاب للبدء.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredAssignments.map((assignment) => {
            const overdue = isOverdue(assignment.due_date);
            const dueDateObj = new Date(assignment.due_date);
            
            return (
              <div key={assignment.id} className="group glass-card rounded-4xl shadow-xl shadow-slate-200/50 border border-white/60 overflow-hidden flex flex-col transition-all hover:shadow-2xl hover:-translate-y-2">
                <div className="p-8 flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <span className="inline-flex items-center rounded-2xl bg-indigo-50 px-4 py-1.5 text-xs font-black text-indigo-700 uppercase tracking-widest border border-indigo-100 shadow-sm">
                      {assignment.subjects?.name}
                    </span>
                    {(userRole === 'teacher' || userRole === 'admin' || userRole === 'management') && (
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                        <button 
                          onClick={() => openEditModal(assignment)}
                          className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm bg-white"
                          title="تعديل الواجب"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button 
                          onClick={() => setAssignmentToDelete(assignment.id)}
                          className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm bg-white"
                          title="حذف الواجب"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-900 mb-3 line-clamp-2 group-hover:text-indigo-600 transition-colors tracking-tight leading-tight" title={assignment.title}>
                    {assignment.title}
                  </h3>
                  
                  <p className="text-slate-500 font-medium mb-6 line-clamp-3 leading-relaxed" title={assignment.description}>
                    {assignment.description || 'لا يوجد وصف'}
                  </p>
                  
                  <div className="space-y-3 mt-auto">
                    <div className="flex items-center text-sm font-bold text-slate-600 gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                      <Users className="h-5 w-5 text-indigo-500" />
                      <span>{assignment.sections?.classes?.name} - {assignment.sections?.name}</span>
                    </div>
                    <div className="flex items-center text-sm font-bold text-slate-600 gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                      <User className="h-5 w-5 text-emerald-500" />
                      <span>أ. {assignment.teachers?.users?.full_name}</span>
                    </div>
                  </div>
                </div>
                
                <div className={`px-8 py-4 border-t flex items-center justify-between ${overdue ? 'bg-red-50/50 border-red-100' : 'bg-slate-50/50 border-slate-100'}`}>
                  <div className={`flex items-center gap-2 text-sm font-black ${overdue ? 'text-red-600' : 'text-slate-700'}`}>
                    <Clock className="h-5 w-5" />
                    <span dir="ltr">
                      {dueDateObj.toLocaleDateString('ar-EG', { month: 'long', day: 'numeric' })} {dueDateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  {assignment.file_url && (
                    <a 
                      href={assignment.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="h-10 px-4 rounded-xl bg-white text-xs font-black text-indigo-600 shadow-sm border border-indigo-100 hover:bg-indigo-50 transition-all flex items-center gap-2 active:scale-95"
                    >
                      <LinkIcon className="h-4 w-4" />
                      <span>المرفق</span>
                    </a>
                  )}
                  <Link 
                    href={`/assignments/${assignment.id}`}
                    className="h-10 px-4 rounded-xl bg-indigo-600 text-xs font-black text-white shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95 mr-auto"
                  >
                    <span>{userRole === 'student' ? 'عرض وتسليم' : 'التفاصيل'}</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog.Root open={!!assignmentToDelete} onOpenChange={(open) => !open && setAssignmentToDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 animate-in fade-in duration-300" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-4xl bg-white p-8 shadow-2xl focus:outline-none animate-in zoom-in-95 duration-300" dir="rtl">
            <div className="h-16 w-16 bg-red-50 rounded-3xl flex items-center justify-center mb-6">
              <Trash2 className="h-8 w-8 text-red-500" />
            </div>
            <Dialog.Title className="text-2xl font-black text-slate-900 mb-2 tracking-tight">
              تأكيد الحذف
            </Dialog.Title>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">هل أنت متأكد من رغبتك في حذف هذا الواجب؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذفه نهائياً من النظام.</p>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Dialog.Close asChild>
                <button className="flex-1 rounded-2xl bg-slate-50 px-6 py-4 text-sm font-black text-slate-700 hover:bg-slate-100 transition-all active:scale-95">
                  إلغاء
                </button>
              </Dialog.Close>
              <button
                onClick={confirmDelete}
                className="flex-1 rounded-2xl bg-red-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-red-100 hover:bg-red-700 hover:shadow-red-200 transition-all active:scale-95"
              >
                تأكيد الحذف
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Add/Edit Assignment Modal */}
      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 animate-in fade-in duration-300" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-4xl bg-white p-8 shadow-2xl focus:outline-none max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300" dir="rtl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <Dialog.Title className="text-2xl font-black text-slate-900 tracking-tight">
                    {currentAssignment.id ? 'تعديل الواجب' : 'إضافة واجب جديد'}
                  </Dialog.Title>
                  <p className="text-sm text-slate-500 font-bold">أدخل تفاصيل الواجب والمهام المطلوبة</p>
                </div>
              </div>
              <Dialog.Close className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-400 transition-colors">
                <X className="h-6 w-6" />
              </Dialog.Close>
            </div>
            
            <form onSubmit={handleSaveAssignment} className="space-y-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2 mr-1">عنوان الواجب <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required
                    placeholder="مثال: حل تمارين الفصل الأول" 
                    className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold"
                    value={currentAssignment.title || ''}
                    onChange={(e) => setCurrentAssignment({...currentAssignment, title: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2 mr-1">الوصف والتفاصيل</label>
                  <textarea 
                    rows={4}
                    placeholder="اكتب تفاصيل الواجب هنا..." 
                    className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold resize-none"
                    value={currentAssignment.description || ''}
                    onChange={(e) => setCurrentAssignment({...currentAssignment, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-black text-slate-700 mb-2 mr-1">المادة <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <select 
                        required
                        className="block w-full rounded-2xl border-0 py-4 pr-12 pl-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold appearance-none"
                        value={currentAssignment.subject_id || ''}
                        onChange={(e) => setCurrentAssignment({...currentAssignment, subject_id: e.target.value})}
                      >
                        <option value="">اختر المادة</option>
                        {subjects.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-black text-slate-700 mb-2 mr-1">الشعبة <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                        <Users className="h-5 w-5" />
                      </div>
                      <select 
                        required
                        className="block w-full rounded-2xl border-0 py-4 pr-12 pl-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold appearance-none"
                        value={currentAssignment.section_id || ''}
                        onChange={(e) => setCurrentAssignment({...currentAssignment, section_id: e.target.value})}
                      >
                        <option value="">اختر الشعبة</option>
                        {sections.map(s => (
                          <option key={s.id} value={s.id}>{s.classes?.name} - {s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-black text-slate-700 mb-2 mr-1">المعلم <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                        <User className="h-5 w-5" />
                      </div>
                      <select 
                        required
                        className="block w-full rounded-2xl border-0 py-4 pr-12 pl-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold appearance-none"
                        value={currentAssignment.teacher_id || ''}
                        onChange={(e) => setCurrentAssignment({...currentAssignment, teacher_id: e.target.value})}
                      >
                        <option value="">اختر المعلم</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.users?.full_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-black text-slate-700 mb-2 mr-1">تاريخ ووقت التسليم <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <input 
                        type="datetime-local" 
                        required
                        className="block w-full rounded-2xl border-0 py-4 pr-12 pl-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold text-left"
                        dir="ltr"
                        value={currentAssignment.due_date || ''}
                        onChange={(e) => setCurrentAssignment({...currentAssignment, due_date: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2 mr-1">رابط الملف المرفق (اختياري)</label>
                  <div className="relative group">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                      <LinkIcon className="h-5 w-5" />
                    </div>
                    <input
                      type="url"
                      className="block w-full rounded-2xl border-0 py-4 pl-12 pr-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold text-left"
                      dir="ltr"
                      placeholder="https://..."
                      value={currentAssignment.file_url || ''}
                      onChange={(e) => setCurrentAssignment({...currentAssignment, file_url: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-2xl bg-slate-50 px-8 py-4 text-sm font-black text-slate-700 hover:bg-slate-100 transition-all active:scale-95"
                  >
                    إلغاء
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : 'حفظ الواجب'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
