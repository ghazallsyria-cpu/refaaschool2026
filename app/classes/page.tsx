'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, BookOpen, ChevronDown, ChevronUp, Search, User, GraduationCap, Edit, Trash2, Plus, X } from 'lucide-react';

type Student = {
  id: string;
  national_id: string;
  user: {
    full_name: string;
    email: string;
  };
};

type Section = {
  id: string;
  name: string;
  class_id: string;
  students: Student[];
};

type ClassData = {
  id: string;
  name: string;
  level: number;
  sections: Section[];
};

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: 'addClass' | 'editClass' | 'deleteClass' | 'addSection' | 'editSection' | 'deleteSection' | null;
    title: string;
    data: any;
  }>({ isOpen: false, type: null, title: '', data: null });
  const [inputValue, setInputValue] = useState('');
  const [inputLevel, setInputLevel] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (userData?.role === 'admin' || userData?.role === 'management' || user.email === 'ghazallsyria@gmail.com') {
          setIsAdmin(true);
        }
      }
    };
    checkAdmin();
    fetchClassesData();
  }, []);

  const fetchClassesData = async () => {
    try {
      setLoading(true);
      
      // Fetch classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .order('level');
        
      if (classesError) throw classesError;

      // Fetch sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('*')
        .order('name');
        
      if (sectionsError) throw sectionsError;

      // Fetch students with user details
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          national_id,
          section_id,
          users (
            full_name,
            email
          )
        `);
        
      if (studentsError) throw studentsError;

      // Organize data
      const organizedClasses: ClassData[] = classesData.map((cls: any) => {
        const classSections = sectionsData
          .filter((sec: any) => sec.class_id === cls.id)
          .map((sec: any) => {
            const sectionStudents = studentsData
              .filter((stu: any) => stu.section_id === sec.id)
              .map((stu: any) => ({
                id: stu.id,
                national_id: stu.national_id,
                user: stu.users
              }));
              
            return {
              ...sec,
              students: sectionStudents
            };
          });
          
        return {
          ...cls,
          sections: classSections
        };
      });

      setClasses(organizedClasses);
      
      // Expand first class by default if exists
      if (organizedClasses.length > 0) {
        setExpandedClass(organizedClasses[0].id);
        if (organizedClasses[0].sections.length > 0) {
          setExpandedSection(organizedClasses[0].sections[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching classes data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleClass = (classId: string) => {
    if (expandedClass === classId) {
      setExpandedClass(null);
    } else {
      setExpandedClass(classId);
      // Automatically expand first section of this class
      const cls = classes.find(c => c.id === classId);
      if (cls && cls.sections.length > 0) {
        setExpandedSection(cls.sections[0].id);
      }
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const handleModalSubmit = async () => {
    if (!modalConfig.type) return;
    setIsSubmitting(true);
    try {
      if (modalConfig.type === 'addClass') {
        const { error } = await supabase.from('classes').insert([{ name: inputValue, level: inputLevel }]);
        if (error) throw error;
      } else if (modalConfig.type === 'editClass') {
        const { error } = await supabase.from('classes').update({ name: inputValue, level: inputLevel }).eq('id', modalConfig.data.id);
        if (error) throw error;
      } else if (modalConfig.type === 'deleteClass') {
        const { error } = await supabase.from('classes').delete().eq('id', modalConfig.data.id);
        if (error) throw error;
      } else if (modalConfig.type === 'addSection') {
        const { error } = await supabase.from('sections').insert([{ name: inputValue, class_id: modalConfig.data.classId }]);
        if (error) throw error;
      } else if (modalConfig.type === 'editSection') {
        const { error } = await supabase.from('sections').update({ name: inputValue }).eq('id', modalConfig.data.id);
        if (error) throw error;
      } else if (modalConfig.type === 'deleteSection') {
        const { error } = await supabase.from('sections').delete().eq('id', modalConfig.data.id);
        if (error) throw error;
      }
      
      await fetchClassesData();
      closeModal();
    } catch (error: any) {
      console.error('Error in modal action:', error);
      // In a real app, show a toast notification here
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setModalConfig({ isOpen: false, type: null, title: '', data: null });
    setInputValue('');
    setInputLevel(1);
  };

  const openModal = (type: any, title: string, data: any = null) => {
    setModalConfig({ isOpen: true, type, title, data });
    if (type === 'editClass') {
      setInputValue(data.name);
      setInputLevel(data.level);
    } else if (type === 'editSection') {
      setInputValue(data.name);
    } else {
      setInputValue('');
      setInputLevel(1);
    }
  };

  const filteredClasses = classes.map(cls => {
    if (!searchTerm) return cls;
    
    // Filter sections and students based on search term
    const filteredSections = cls.sections.map(sec => {
      const filteredStudents = sec.students.filter(stu => 
        stu.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stu.national_id.includes(searchTerm)
      );
      return { ...sec, students: filteredStudents };
    }).filter(sec => sec.students.length > 0 || sec.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return { ...cls, sections: filteredSections };
  }).filter(cls => cls.sections.length > 0 || cls.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">إدارة الفصول والشعب</h1>
          <p className="text-slate-500">
            تنظيم وعرض الطلاب حسب صفوفهم وشعبهم الدراسية 
            ({classes.reduce((acc, cls) => acc + cls.sections.reduce((sAcc, sec) => sAcc + sec.students.length, 0), 0)} طالب)
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="ابحث عن طالب أو رقم مدني..."
              className="block w-full sm:w-80 rounded-md border-0 py-2 pr-10 pl-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {isAdmin && (
            <button
              onClick={() => openModal('addClass', 'إضافة صف جديد')}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <Plus className="h-4 w-4" />
              إضافة صف
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {filteredClasses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <GraduationCap className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-2 text-sm font-semibold text-slate-900">لا توجد نتائج</h3>
            <p className="mt-1 text-sm text-slate-500">لم يتم العثور على طلاب أو فصول تطابق بحثك.</p>
          </div>
        ) : (
          filteredClasses.map((cls) => (
            <div key={cls.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              {/* Class Header */}
              <div className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200">
                <button
                  onClick={() => toggleClass(cls.id)}
                  className="flex-1 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="text-right">
                      <h2 className="text-lg font-bold text-slate-900">{cls.name}</h2>
                      <p className="text-sm text-slate-500">
                        {cls.sections.length} شعب | {cls.sections.reduce((acc, sec) => acc + sec.students.length, 0)} طالب
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {expandedClass === cls.id ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </button>
                
                {isAdmin && (
                  <div className="flex items-center gap-2 mr-4 border-r border-slate-200 pr-4">
                    <button onClick={() => openModal('addSection', 'إضافة شعبة جديدة', { classId: cls.id })} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md" title="إضافة شعبة">
                      <Plus className="h-4 w-4" />
                    </button>
                    <button onClick={() => openModal('editClass', 'تعديل الصف', cls)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md" title="تعديل">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button onClick={() => openModal('deleteClass', 'حذف الصف', cls)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md" title="حذف">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Sections List */}
              {expandedClass === cls.id && (
                <div className="p-4 space-y-4 bg-slate-50/50">
                  {cls.sections.length === 0 ? (
                    <p className="text-center text-slate-500 text-sm py-4">لا توجد شعب في هذا الصف</p>
                  ) : (
                    cls.sections.map((section) => (
                      <div key={section.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                        {/* Section Header */}
                        <div className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                          <button
                            onClick={() => toggleSection(section.id)}
                            className="flex-1 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <div className="bg-emerald-100 p-1.5 rounded text-emerald-600">
                                <Users className="h-4 w-4" />
                              </div>
                              <h3 className="font-semibold text-slate-800">شعبة {section.name}</h3>
                              <span className="bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full text-xs font-medium mr-2">
                                {section.students.length} طالب
                              </span>
                            </div>
                            {expandedSection === section.id ? (
                              <ChevronUp className="h-4 w-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            )}
                          </button>
                          
                          {isAdmin && (
                            <div className="flex items-center gap-2 mr-4 border-r border-slate-200 pr-4">
                              <button onClick={() => openModal('editSection', 'تعديل الشعبة', section)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md" title="تعديل">
                                <Edit className="h-4 w-4" />
                              </button>
                              <button onClick={() => openModal('deleteSection', 'حذف الشعبة', section)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md" title="حذف">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Students List */}
                        {expandedSection === section.id && (
                          <div className="border-t border-slate-100">
                            {section.students.length === 0 ? (
                              <p className="text-center text-slate-500 text-sm py-6">لا يوجد طلاب في هذه الشعبة</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                  <thead className="bg-slate-50">
                                    <tr>
                                      <th scope="col" className="py-3 pl-4 pr-6 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        م
                                      </th>
                                      <th scope="col" className="py-3 px-6 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        اسم الطالب
                                      </th>
                                      <th scope="col" className="py-3 px-6 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        الرقم المدني (اسم المستخدم)
                                      </th>
                                      <th scope="col" className="py-3 px-6 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        الإجراءات
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-slate-200">
                                    {section.students.map((student, index) => (
                                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3 pl-4 pr-6 whitespace-nowrap text-sm text-slate-500">
                                          {index + 1}
                                        </td>
                                        <td className="py-3 px-6 whitespace-nowrap">
                                          <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 ml-3 flex-shrink-0">
                                              <User className="h-4 w-4" />
                                            </div>
                                            <div className="font-medium text-slate-900">
                                              {student.user?.full_name || 'بدون اسم'}
                                            </div>
                                          </div>
                                        </td>
                                        <td className="py-3 px-6 whitespace-nowrap">
                                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-sm font-medium text-slate-800 font-mono">
                                            {student.national_id}
                                          </span>
                                        </td>
                                        <td className="py-3 px-6 whitespace-nowrap text-sm text-slate-500">
                                          <button className="text-indigo-600 hover:text-indigo-900 font-medium">
                                            عرض الملف
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">{modalConfig.title}</h3>
              <button 
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-500 hover:bg-slate-100 p-2 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {modalConfig.type?.includes('delete') ? (
                <p className="text-slate-600">
                  هل أنت متأكد من رغبتك في حذف 
                  <span className="font-bold text-slate-900 mx-1">
                    {modalConfig.data?.name}
                  </span>؟
                  <br />
                  <span className="text-red-500 text-sm mt-2 block">
                    تحذير: هذا الإجراء لا يمكن التراجع عنه وقد يؤثر على الطلاب المرتبطين.
                  </span>
                </p>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      الاسم (مثال: {modalConfig.type?.includes('Class') ? 'الصف الأول' : 'أ'})
                    </label>
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="w-full rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="أدخل الاسم..."
                      autoFocus
                    />
                  </div>
                  
                  {modalConfig.type?.includes('Class') && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        المستوى (رقم للترتيب)
                      </label>
                      <input
                        type="number"
                        value={inputLevel}
                        onChange={(e) => setInputLevel(parseInt(e.target.value) || 1)}
                        className="w-full rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                        min="1"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleModalSubmit}
                disabled={isSubmitting || (!modalConfig.type?.includes('delete') && !inputValue.trim())}
                className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors flex items-center gap-2
                  ${modalConfig.type?.includes('delete') 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-indigo-600 hover:bg-indigo-700'} 
                  disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>}
                {modalConfig.type?.includes('delete') ? 'تأكيد الحذف' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
