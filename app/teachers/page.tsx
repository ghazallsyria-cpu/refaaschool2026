'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Filter, Edit, Trash2 } from 'lucide-react';

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teachers')
        .select(`
          *,
          users (full_name, email, phone)
        `);

      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = teachers.filter(teacher => 
    teacher.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.national_id?.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">إدارة المعلمين</h1>
          <p className="text-slate-500">عرض وإدارة بيانات الهيئة التدريسية</p>
        </div>
        <button className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
          <Plus className="mr-2 h-4 w-4 ml-2" />
          إضافة معلم جديد
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl shadow-sm ring-1 ring-slate-200">
        <div className="relative w-full sm:max-w-md">
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border-0 py-2 pr-10 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            placeholder="البحث بالاسم أو الرقم المدني..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-6 text-right text-sm font-semibold text-slate-900">اسم المعلم</th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">الرقم المدني</th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">التخصص</th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">رقم الهاتف</th>
                <th scope="col" className="relative py-3.5 pl-6 pr-4">
                  <span className="sr-only">إجراءات</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-slate-500">
                    جاري تحميل البيانات...
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-slate-500">
                    لا يوجد معلمين لعرضهم.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap py-4 pl-4 pr-6 text-sm font-medium text-slate-900">
                      {teacher.users?.full_name || 'غير محدد'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                      {teacher.national_id}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                      {teacher.specialization || 'غير محدد'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                      {teacher.users?.phone || 'غير محدد'}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-6 pr-4 text-left text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button className="text-indigo-600 hover:text-indigo-900">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-200">
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">
              جاري تحميل البيانات...
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              لا يوجد معلمين لعرضهم.
            </div>
          ) : (
            filteredTeachers.map((teacher) => (
              <div key={teacher.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-slate-900">{teacher.users?.full_name || 'غير محدد'}</h3>
                    <p className="text-xs text-slate-500">{teacher.national_id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-1 text-slate-400 hover:text-indigo-600">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="p-1 text-slate-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block">التخصص</span>
                    <span className="text-slate-700">{teacher.specialization || 'غير محدد'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">رقم الهاتف</span>
                    <span className="text-slate-700">{teacher.users?.phone || 'غير محدد'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block">البريد الإلكتروني</span>
                    <span className="text-slate-700">{teacher.users?.email || 'غير محدد'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
