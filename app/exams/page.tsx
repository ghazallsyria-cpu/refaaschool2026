'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Edit, Trash2, FileText, CheckCircle, X, Save, AlertCircle } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

type Exam = {
  id: string;
  title: string;
  exam_date: string;
  max_score: number;
  subject_id: string;
  section_id: string;
  teacher_id: string;
  subjects?: { name: string };
  sections?: { name: string; classes?: { name: string } };
  teachers?: { users?: { full_name: string } };
};

type Student = {
  id: string;
  national_id: string;
  users: { full_name: string };
};

type Grade = {
  id?: string;
  student_id: string;
  exam_id: string;
  score: number | string;
  notes?: string;
};

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form Data
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGradesModal, setShowGradesModal] = useState(false);
  
  // Add/Edit Exam State
  const [currentExam, setCurrentExam] = useState<Partial<Exam>>({
    max_score: 20,
    exam_date: new Date().toISOString().split('T')[0]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Grading State
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Record<string, Grade>>({});
  const [loadingGrades, setLoadingGrades] = useState(false);

  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [examToDelete, setExamToDelete] = useState<string | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    fetchExams();
    fetchFormData();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exams')
        .select(`
          id,
          title,
          exam_date,
          max_score,
          subject_id,
          section_id,
          teacher_id,
          subjects (name),
          sections (name, classes (name)),
          teachers (users (full_name))
        `)
        .order('exam_date', { ascending: false });

      if (error) throw error;
      setExams((data as unknown) as Exam[] || []);
    } catch (error: any) {
      console.error('Error fetching exams:', error);
      showNotification('error', 'حدث خطأ أثناء جلب الاختبارات: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async () => {
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
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentExam.title || !currentExam.subject_id || !currentExam.section_id || !currentExam.teacher_id || !currentExam.exam_date || !currentExam.max_score) {
      showNotification('error', 'يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    setIsSubmitting(true);
    try {
      if (currentExam.id) {
        // Update
        const { error } = await supabase
          .from('exams')
          .update({
            title: currentExam.title,
            subject_id: currentExam.subject_id,
            section_id: currentExam.section_id,
            teacher_id: currentExam.teacher_id,
            exam_date: currentExam.exam_date,
            max_score: currentExam.max_score
          })
          .eq('id', currentExam.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('exams')
          .insert([{
            title: currentExam.title,
            subject_id: currentExam.subject_id,
            section_id: currentExam.section_id,
            teacher_id: currentExam.teacher_id,
            exam_date: currentExam.exam_date,
            max_score: currentExam.max_score
          }]);
        if (error) throw error;
      }

      await fetchExams();
      setShowAddModal(false);
      setCurrentExam({ max_score: 20, exam_date: new Date().toISOString().split('T')[0] });
      showNotification('success', 'تم حفظ الاختبار بنجاح!');
    } catch (error: any) {
      console.error('Error saving exam:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حفظ الاختبار');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!examToDelete) return;
    
    try {
      const { error } = await supabase.from('exams').delete().eq('id', examToDelete);
      if (error) throw error;
      await fetchExams();
      showNotification('success', 'تم حذف الاختبار بنجاح');
    } catch (error: any) {
      console.error('Error deleting exam:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حذف الاختبار');
    } finally {
      setExamToDelete(null);
    }
  };

  const openGradesModal = async (exam: Exam) => {
    setSelectedExam(exam);
    setShowGradesModal(true);
    setLoadingGrades(true);
    setGrades({});
    setStudents([]);

    try {
      // Fetch students in this section
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          national_id,
          users (full_name)
        `)
        .eq('section_id', exam.section_id);

      if (studentsError) throw studentsError;
      setStudents((studentsData as unknown) as Student[] || []);

      // Fetch existing grades for this exam
      const { data: gradesData, error: gradesError } = await supabase
        .from('grades')
        .select('*')
        .eq('exam_id', exam.id);

      if (gradesError) throw gradesError;

      // Map grades to student IDs
      const gradesMap: Record<string, Grade> = {};
      gradesData?.forEach(g => {
        gradesMap[g.student_id] = g;
      });
      setGrades(gradesMap);

    } catch (error: any) {
      console.error('Error fetching grades data:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء جلب بيانات الطلاب والدرجات');
    } finally {
      setLoadingGrades(false);
    }
  };

  const handleGradeChange = (studentId: string, value: string) => {
    const numValue = value === '' ? '' : Number(value);
    
    // Validate max score
    if (numValue !== '' && selectedExam && Number(numValue) > selectedExam.max_score) {
      return; // Don't allow values higher than max score
    }
    if (numValue !== '' && Number(numValue) < 0) {
      return; // Don't allow negative values
    }

    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        student_id: studentId,
        exam_id: selectedExam!.id,
        score: numValue
      }
    }));
  };

  const handleSaveGrades = async () => {
    if (!selectedExam) return;
    setIsSubmitting(true);

    try {
      const gradesToUpsert = Object.values(grades).filter(g => g.score !== '').map(g => ({
        id: g.id, // Will be undefined for new grades
        exam_id: selectedExam.id,
        student_id: g.student_id,
        score: Number(g.score),
        notes: g.notes || null
      }));

      if (gradesToUpsert.length > 0) {
        const { error } = await supabase
          .from('grades')
          .upsert(gradesToUpsert, { onConflict: 'exam_id, student_id' });

        if (error) throw error;
      }

      showNotification('success', 'تم حفظ الدرجات بنجاح');
      setShowGradesModal(false);
    } catch (error: any) {
      console.error('Error saving grades:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حفظ الدرجات');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredExams = exams.filter(e => 
    e.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.subjects?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <Dialog.Root open={!!examToDelete} onOpenChange={(open) => !open && setExamToDelete(null)}>
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
            <p className="text-slate-600 mb-6">هل أنت متأكد من حذف هذا الاختبار؟ سيتم حذف جميع الدرجات المرتبطة به. لا يمكن التراجع عن هذا الإجراء.</p>
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
          <h1 className="text-2xl font-bold text-slate-900">الاختبارات والدرجات</h1>
          <p className="text-slate-500">إدارة الاختبارات ورصد درجات الطلاب</p>
        </div>
        <button 
          onClick={() => {
            setCurrentExam({ max_score: 20, exam_date: new Date().toISOString().split('T')[0] });
            setShowAddModal(true);
          }}
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="mr-2 h-4 w-4 ml-2" />
          إضافة اختبار جديد
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
            placeholder="البحث باسم الاختبار أو المادة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="py-3.5 pr-4 pl-3 text-right text-sm font-semibold text-slate-900 sm:pr-6">عنوان الاختبار</th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">المادة</th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">الفصل / الشعبة</th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">المعلم</th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">تاريخ الاختبار</th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">الدرجة القصوى</th>
                <th scope="col" className="relative py-3.5 pl-4 pr-3 sm:pl-6 text-left">
                  <span className="sr-only">إجراءات</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-slate-500">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredExams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-slate-500">
                    لا توجد اختبارات مسجلة
                  </td>
                </tr>
              ) : (
                filteredExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap py-4 pr-4 pl-3 text-sm font-medium text-slate-900 sm:pr-6">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-indigo-500" />
                        {exam.title}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                      {exam.subjects?.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                      {exam.sections?.classes?.name} - {exam.sections?.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                      {exam.teachers?.users?.full_name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                      {new Date(exam.exam_date).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 font-medium">
                      {exam.max_score}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-4 pr-3 text-left text-sm font-medium sm:pl-6">
                      <button 
                        onClick={() => openGradesModal(exam)}
                        className="text-emerald-600 hover:text-emerald-900 mx-3 flex items-center gap-1 inline-flex"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>رصد الدرجات</span>
                      </button>
                      <button 
                        onClick={() => {
                          setCurrentExam(exam);
                          setShowAddModal(true);
                        }}
                        className="text-slate-400 hover:text-indigo-600 mx-2"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setExamToDelete(exam.id)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden divide-y divide-slate-200">
          {loading ? (
            <div className="py-10 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              لا توجد اختبارات مسجلة
            </div>
          ) : (
            filteredExams.map((exam) => (
              <div key={exam.id} className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600 mt-1">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{exam.title}</h3>
                      <p className="text-sm text-slate-500">{exam.subjects?.name}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setCurrentExam(exam);
                        setShowAddModal(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => setExamToDelete(exam.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">الفصل / الشعبة</span>
                    <span className="text-slate-700 font-medium">{exam.sections?.classes?.name} - {exam.sections?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">تاريخ الاختبار</span>
                    <span className="text-slate-700 font-medium">{new Date(exam.exam_date).toLocaleDateString('ar-EG')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">المعلم</span>
                    <span className="text-slate-700 font-medium">{exam.teachers?.users?.full_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">الدرجة القصوى</span>
                    <span className="text-slate-700 font-bold text-indigo-600">{exam.max_score}</span>
                  </div>
                </div>

                <button 
                  onClick={() => openGradesModal(exam)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-50 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                  رصد الدرجات
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Exam Modal */}
      <Dialog.Root open={showAddModal} onOpenChange={setShowAddModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl bg-white p-6 shadow-lg focus:outline-none" dir="rtl">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-semibold text-slate-900">
                {currentExam.id ? 'تعديل الاختبار' : 'إضافة اختبار جديد'}
              </Dialog.Title>
              <Dialog.Close className="text-slate-400 hover:text-slate-500">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>
            
            <form onSubmit={handleSaveExam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">عنوان الاختبار</label>
                <input 
                  type="text" 
                  required
                  placeholder="مثال: اختبار منتصف الفصل الدراسي الأول" 
                  className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  value={currentExam.title || ''}
                  onChange={(e) => setCurrentExam({...currentExam, title: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium leading-6 text-slate-900">المادة</label>
                  <select 
                    required
                    className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    value={currentExam.subject_id || ''}
                    onChange={(e) => setCurrentExam({...currentExam, subject_id: e.target.value})}
                  >
                    <option value="">اختر المادة</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium leading-6 text-slate-900">الشعبة</label>
                  <select 
                    required
                    className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    value={currentExam.section_id || ''}
                    onChange={(e) => setCurrentExam({...currentExam, section_id: e.target.value})}
                  >
                    <option value="">اختر الشعبة</option>
                    {sections.map(s => (
                      <option key={s.id} value={s.id}>{s.classes?.name} - {s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium leading-6 text-slate-900">المعلم</label>
                  <select 
                    required
                    className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    value={currentExam.teacher_id || ''}
                    onChange={(e) => setCurrentExam({...currentExam, teacher_id: e.target.value})}
                  >
                    <option value="">اختر المعلم</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.users?.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium leading-6 text-slate-900">تاريخ الاختبار</label>
                  <input 
                    type="date" 
                    required
                    className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    value={currentExam.exam_date || ''}
                    onChange={(e) => setCurrentExam({...currentExam, exam_date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium leading-6 text-slate-900">الدرجة القصوى</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    value={currentExam.max_score || ''}
                    onChange={(e) => setCurrentExam({...currentExam, max_score: Number(e.target.value)})}
                  />
                </div>
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
                  disabled={isSubmitting}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ الاختبار'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Grades Modal */}
      <Dialog.Root open={showGradesModal} onOpenChange={setShowGradesModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-3xl translate-x-[-50%] translate-y-[-50%] rounded-xl bg-white p-6 shadow-lg focus:outline-none flex flex-col max-h-[90vh]" dir="rtl">
            <div className="flex items-center justify-between mb-5 flex-shrink-0">
              <div>
                <Dialog.Title className="text-lg font-semibold text-slate-900">
                  رصد الدرجات: {selectedExam?.title}
                </Dialog.Title>
                <Dialog.Description className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                  <span>المادة: {selectedExam?.subjects?.name}</span>
                  <span>•</span>
                  <span>الشعبة: {selectedExam?.sections?.classes?.name} - {selectedExam?.sections?.name}</span>
                  <span>•</span>
                  <span className="font-medium text-indigo-600">الدرجة القصوى: {selectedExam?.max_score}</span>
                </Dialog.Description>
              </div>
              <Dialog.Close className="text-slate-400 hover:text-slate-500">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 -mr-2 mb-6">
              {loadingGrades ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
                  <AlertCircle className="mx-auto h-10 w-10 text-slate-400 mb-2" />
                  <p className="text-slate-600">لا يوجد طلاب مسجلين في هذه الشعبة.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className="py-3 px-4 text-right text-sm font-semibold text-slate-900 w-16">م</th>
                      <th scope="col" className="py-3 px-4 text-right text-sm font-semibold text-slate-900">اسم الطالب</th>
                      <th scope="col" className="py-3 px-4 text-right text-sm font-semibold text-slate-900">الرقم المدني</th>
                      <th scope="col" className="py-3 px-4 text-right text-sm font-semibold text-slate-900 w-32">الدرجة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {students.map((student, index) => (
                      <tr key={student.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap py-3 px-4 text-sm text-slate-500">
                          {index + 1}
                        </td>
                        <td className="whitespace-nowrap py-3 px-4 text-sm font-medium text-slate-900">
                          {student.users?.full_name}
                        </td>
                        <td className="whitespace-nowrap py-3 px-4 text-sm text-slate-500 font-mono">
                          {student.national_id}
                        </td>
                        <td className="whitespace-nowrap py-3 px-4 text-sm">
                          <input
                            type="number"
                            min="0"
                            max={selectedExam?.max_score}
                            step="0.5"
                            className="block w-full rounded-md border-0 py-1.5 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 text-center"
                            value={grades[student.id]?.score ?? ''}
                            onChange={(e) => handleGradeChange(student.id, e.target.value)}
                            placeholder="-"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                onClick={handleSaveGrades}
                disabled={isSubmitting || students.length === 0}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ الدرجات'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
