'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, MoreHorizontal, Edit, Trash2 } from 'lucide-react';

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          national_id,
          gender,
          users (full_name, email, phone),
          sections (name, classes (name))
        `);

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.users?.full_name?.includes(searchTerm) || 
    s.national_id?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">إدارة الطلاب</h1>
          <p className="text-slate-500">عرض وإدارة بيانات جميع الطلاب المسجلين في المدرسة</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <Plus className="mr-2 h-4 w-4 ml-2" />
          إضافة طالب جديد
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
            placeholder="البحث بالاسم أو الرقم المدني..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="py-3.5 pr-4 pl-3 text-right text-sm font-semibold text-slate-900 sm:pr-6">اسم الطالب</th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">الرقم المدني</th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">الصف والشعبة</th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">البريد الإلكتروني</th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">رقم الهاتف</th>
                <th scope="col" className="relative py-3.5 pl-4 pr-3 sm:pl-6">
                  <span className="sr-only">إجراءات</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-slate-500">
                    جاري تحميل البيانات...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-slate-500">
                    لا يوجد طلاب مطابقين للبحث
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap py-4 pr-4 pl-3 text-sm font-medium text-slate-900 sm:pr-6">
                      {student.users?.full_name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                      {student.national_id}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                      {student.sections?.classes?.name} - {student.sections?.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                      {student.users?.email}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                      {student.users?.phone || '-'}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-4 pr-3 text-left text-sm font-medium sm:pl-6">
                      <button className="text-slate-400 hover:text-indigo-600 mx-2">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="text-slate-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/75 transition-opacity" onClick={() => setShowAddModal(false)}></div>
            
            <div className="relative transform overflow-hidden rounded-xl bg-white text-right shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-xl font-semibold leading-6 text-slate-900 mb-6">إضافة طالب جديد</h3>
                
                <form className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium leading-6 text-slate-900">الاسم الرباعي</label>
                      <input type="text" className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium leading-6 text-slate-900">الرقم المدني</label>
                      <input type="text" className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium leading-6 text-slate-900">البريد الإلكتروني</label>
                      <input type="email" className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium leading-6 text-slate-900">رقم الهاتف</label>
                      <input type="text" className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium leading-6 text-slate-900">الصف الدراسي</label>
                      <select className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">
                        <option>اختر الصف</option>
                        <option>الصف العاشر</option>
                        <option>الصف الحادي عشر</option>
                        <option>الصف الثاني عشر</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium leading-6 text-slate-900">الشعبة</label>
                      <select className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">
                        <option>اختر الشعبة</option>
                        <option>1-10</option>
                        <option>2-10</option>
                      </select>
                    </div>
                  </div>
                </form>
              </div>
              <div className="bg-slate-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto"
                  onClick={() => {
                    alert('في بيئة الإنتاج، سيتم إنشاء حساب مصادقة للطالب وحفظ بياناته في قاعدة البيانات.');
                    setShowAddModal(false);
                  }}
                >
                  حفظ البيانات
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 sm:mt-0 sm:w-auto"
                  onClick={() => setShowAddModal(false)}
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
