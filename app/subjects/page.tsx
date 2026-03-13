'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BookOpen, Plus, Search, Edit2, Trash2, Users, X, Check, User } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

type Teacher = {
  id: string;
  national_id: string;
  specialization: string;
  user: {
    full_name: string;
    email: string;
  };
};

type Subject = {
  id: string;
  name: string;
  code: string;
  teachers: Teacher[];
};

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  
  // Form state
  const [currentSubject, setCurrentSubject] = useState<Partial<Subject>>({});
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<string | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .order('name');
        
      if (subjectsError) throw subjectsError;

      // Fetch teachers with user details
      const { data: teachersData, error: teachersError } = await supabase
        .from('teachers')
        .select(`
          id,
          national_id,
          specialization,
          users (
            full_name,
            email
          )
        `);
        
      if (teachersError) throw teachersError;

      // Fetch teacher-subject mappings
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('teacher_subjects')
        .select('*');
        
      if (mappingsError) throw mappingsError;

      // Format teachers
      const formattedTeachers = teachersData.map((t: any) => ({
        id: t.id,
        national_id: t.national_id,
        specialization: t.specialization,
        user: t.users
      }));
      
      setAllTeachers(formattedTeachers);

      // Organize subjects with their teachers
      const organizedSubjects: Subject[] = subjectsData.map((sub: any) => {
        const assignedTeacherIds = mappingsData
          .filter((m: any) => m.subject_id === sub.id)
          .map((m: any) => m.teacher_id);
          
        const assignedTeachers = formattedTeachers.filter(t => assignedTeacherIds.includes(t.id));
          
        return {
          ...sub,
          teachers: assignedTeachers
        };
      });

      setSubjects(organizedSubjects);
    } catch (error: any) {
      console.error('Error fetching subjects data:', error);
      showNotification('error', 'حدث خطأ أثناء جلب البيانات: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSubject.name || !currentSubject.code) return;
    
    setIsSubmitting(true);
    try {
      if (currentSubject.id) {
        // Update
        const { error } = await supabase
          .from('subjects')
          .update({ name: currentSubject.name, code: currentSubject.code })
          .eq('id', currentSubject.id);
          
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('subjects')
          .insert([{ name: currentSubject.name, code: currentSubject.code }]);
          
        if (error) throw error;
      }
      
      await fetchData();
      setIsSubjectModalOpen(false);
      setCurrentSubject({});
      showNotification('success', 'تم حفظ المادة بنجاح!');
    } catch (error: any) {
      console.error('Error saving subject:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حفظ المادة الدراسية. قد يكون رمز المادة مستخدماً بالفعل.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!subjectToDelete) return;
    
    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectToDelete);
        
      if (error) throw error;
      await fetchData();
      showNotification('success', 'تم حذف المادة بنجاح');
    } catch (error: any) {
      console.error('Error deleting subject:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حذف المادة.');
    } finally {
      setSubjectToDelete(null);
    }
  };

  const openAssignModal = (subject: Subject) => {
    setSelectedSubjectId(subject.id);
    setSelectedTeacherIds(subject.teachers.map(t => t.id));
    setIsAssignModalOpen(true);
  };

  const toggleTeacherSelection = (teacherId: string) => {
    setSelectedTeacherIds(prev => 
      prev.includes(teacherId) 
        ? prev.filter(id => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const handleSaveAssignments = async () => {
    if (!selectedSubjectId) return;
    
    setIsSubmitting(true);
    try {
      // First, delete existing assignments for this subject
      const { error: deleteError } = await supabase
        .from('teacher_subjects')
        .delete()
        .eq('subject_id', selectedSubjectId);
        
      if (deleteError) throw deleteError;
      
      // Then, insert new assignments if any
      if (selectedTeacherIds.length > 0) {
        const newAssignments = selectedTeacherIds.map(teacherId => ({
          subject_id: selectedSubjectId,
          teacher_id: teacherId
        }));
        
        const { error: insertError } = await supabase
          .from('teacher_subjects')
          .insert(newAssignments);
          
        if (insertError) throw insertError;
      }
      
      await fetchData();
      setIsAssignModalOpen(false);
      showNotification('success', 'تم حفظ تعيينات المعلمين بنجاح!');
    } catch (error: any) {
      console.error('Error saving assignments:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حفظ تعيينات المعلمين.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSubjects = subjects.filter(sub => 
    sub.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    sub.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

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
      <Dialog.Root open={!!subjectToDelete} onOpenChange={(open) => !open && setSubjectToDelete(null)}>
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
            <p className="text-slate-600 mb-6">هل أنت متأكد من حذف هذه المادة؟ سيتم إزالة جميع ارتباطات المعلمين بها. لا يمكن التراجع عن هذا الإجراء.</p>
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
          <h1 className="text-2xl font-bold text-slate-900">إدارة المواد الدراسية</h1>
          <p className="text-slate-500">إضافة المواد وتعيين المعلمين لتدريسها</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="ابحث عن مادة..."
              className="block w-full sm:w-64 rounded-md border-0 py-2 pr-10 pl-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button
            onClick={() => {
              setCurrentSubject({});
              setIsSubjectModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            إضافة مادة
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSubjects.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-slate-200">
            <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-2 text-sm font-semibold text-slate-900">لا توجد مواد دراسية</h3>
            <p className="mt-1 text-sm text-slate-500">قم بإضافة مواد دراسية جديدة للبدء في تعيين المعلمين.</p>
          </div>
        ) : (
          filteredSubjects.map((subject) => (
            <div key={subject.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
              <div className="p-5 border-b border-slate-100 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-600">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">{subject.name}</h3>
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 font-mono mt-1">
                        {subject.code}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => {
                        setCurrentSubject(subject);
                        setIsSubjectModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                      title="تعديل المادة"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => setSubjectToDelete(subject.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="حذف المادة"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    المعلمون المعينون ({subject.teachers.length})
                  </h4>
                  
                  {subject.teachers.length > 0 ? (
                    <div className="space-y-2">
                      {subject.teachers.map(teacher => (
                        <div key={teacher.id} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded-md border border-slate-100">
                          <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 flex-shrink-0">
                            <User className="h-3 w-3" />
                          </div>
                          <span className="font-medium truncate">{teacher.user?.full_name || 'بدون اسم'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic bg-slate-50 p-3 rounded-md border border-slate-100 border-dashed text-center">
                      لم يتم تعيين معلمين لهذه المادة
                    </p>
                  )}
                </div>
              </div>
              <div className="bg-slate-50 p-3 border-t border-slate-100">
                <button
                  onClick={() => openAssignModal(subject)}
                  className="w-full flex items-center justify-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-indigo-600 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-colors"
                >
                  <Users className="h-4 w-4" />
                  إدارة المعلمين
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Subject Modal */}
      <Dialog.Root open={isSubjectModalOpen} onOpenChange={setIsSubjectModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl bg-white p-6 shadow-lg focus:outline-none" dir="rtl">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-semibold text-slate-900">
                {currentSubject.id ? 'تعديل مادة دراسية' : 'إضافة مادة دراسية جديدة'}
              </Dialog.Title>
              <Dialog.Close className="text-slate-400 hover:text-slate-500">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>
            
            <form onSubmit={handleSaveSubject} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                  اسم المادة
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  className="block w-full rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  placeholder="مثال: رياضيات"
                  value={currentSubject.name || ''}
                  onChange={(e) => setCurrentSubject({...currentSubject, name: e.target.value})}
                />
              </div>
              
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-slate-700 mb-1">
                  رمز المادة
                </label>
                <input
                  type="text"
                  id="code"
                  required
                  className="block w-full rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 text-left"
                  dir="ltr"
                  placeholder="مثال: MATH101"
                  value={currentSubject.code || ''}
                  onChange={(e) => setCurrentSubject({...currentSubject, code: e.target.value})}
                />
                <p className="mt-1 text-xs text-slate-500">يجب أن يكون الرمز فريداً باللغة الإنجليزية.</p>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
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
                  disabled={isSubmitting || !currentSubject.name || !currentSubject.code}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ المادة'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Assign Teachers Modal */}
      <Dialog.Root open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl bg-white p-6 shadow-lg focus:outline-none flex flex-col max-h-[85vh]" dir="rtl">
            <div className="flex items-center justify-between mb-5 flex-shrink-0">
              <div>
                <Dialog.Title className="text-lg font-semibold text-slate-900">
                  تعيين المعلمين
                </Dialog.Title>
                <Dialog.Description className="text-sm text-slate-500 mt-1">
                  اختر المعلمين الذين يقومون بتدريس مادة {subjects.find(s => s.id === selectedSubjectId)?.name}
                </Dialog.Description>
              </div>
              <Dialog.Close className="text-slate-400 hover:text-slate-500">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-2 mb-6">
              {allTeachers.length === 0 ? (
                <p className="text-center text-slate-500 py-8">لا يوجد معلمين مسجلين في النظام.</p>
              ) : (
                allTeachers.map(teacher => {
                  const isSelected = selectedTeacherIds.includes(teacher.id);
                  return (
                    <div 
                      key={teacher.id}
                      onClick={() => toggleTeacherSelection(teacher.id)}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-indigo-50 border-indigo-200' 
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className={`font-medium ${isSelected ? 'text-indigo-900' : 'text-slate-900'}`}>
                            {teacher.user?.full_name || 'بدون اسم'}
                          </h4>
                          <p className={`text-xs ${isSelected ? 'text-indigo-700' : 'text-slate-500'}`}>
                            {teacher.specialization || 'بدون تخصص'} | {teacher.national_id}
                          </p>
                        </div>
                      </div>
                      <div className={`h-5 w-5 rounded border flex items-center justify-center ${
                        isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                      }`}>
                        {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="flex justify-end gap-3 flex-shrink-0 pt-4 border-t border-slate-100">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </Dialog.Close>
              <button
                onClick={handleSaveAssignments}
                disabled={isSubmitting}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ التعيينات'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
