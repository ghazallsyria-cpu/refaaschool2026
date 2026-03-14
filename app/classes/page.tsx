'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, BookOpen, ChevronDown, ChevronUp, Search, User, GraduationCap } from 'lucide-react';

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

  useEffect(() => {
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
              <button
                onClick={() => toggleClass(cls.id)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200"
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
                {expandedClass === cls.id ? (
                  <ChevronUp className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                )}
              </button>

              {/* Sections List */}
              {expandedClass === cls.id && (
                <div className="p-4 space-y-4 bg-slate-50/50">
                  {cls.sections.length === 0 ? (
                    <p className="text-center text-slate-500 text-sm py-4">لا توجد شعب في هذا الصف</p>
                  ) : (
                    cls.sections.map((section) => (
                      <div key={section.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                        {/* Section Header */}
                        <button
                          onClick={() => toggleSection(section.id)}
                          className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
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
    </div>
  );
}
