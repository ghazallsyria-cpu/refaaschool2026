'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, MoreHorizontal, Edit, Trash2, X } from 'lucide-react';

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [addForm, setAddForm] = useState({
    full_name: '',
    national_id: '',
    email: '',
    phone: '',
    section_id: '',
    parent_id: ''
  });
  const [editForm, setEditForm] = useState({
    full_name: '',
    national_id: '',
    email: '',
    phone: '',
    parent_id: ''
  });
  const [sections, setSections] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);

  useEffect(() => {
    fetchStudents();
    fetchSections();
    fetchParents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchParents = async () => {
    try {
      const { data, error } = await supabase
        .from('parents')
        .select('id, users(full_name)');
      if (error) throw error;
      setParents(data || []);
    } catch (error) {
      console.error('Error fetching parents:', error);
    }
  };

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('id, name, classes(name)');
      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const handleAddSubmit = async () => {
    try {
      if (!addForm.full_name || !addForm.national_id || !addForm.email) {
        showNotification('error', 'يرجى تعبئة الحقول الإلزامية');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: addForm.email,
          full_name: addForm.full_name,
          national_id: addForm.national_id,
          phone: addForm.phone,
          role: 'student',
          section_id: addForm.section_id || null,
          parent_id: addForm.parent_id || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل إنشاء حساب الطالب');
      }

      showNotification('success', `تم إضافة الطالب بنجاح (كلمة المرور: ${data.password})`);
      setShowAddModal(false);
      setAddForm({ full_name: '', national_id: '', email: '', phone: '', section_id: '', parent_id: '' });
      fetchStudents();
    } catch (error: any) {
      console.error('Error adding student:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء إضافة الطالب');
    }
  };

  const handleEditClick = (student: any) => {
    setEditingStudent(student);
    setEditForm({
      full_name: student.users?.full_name || '',
      national_id: student.national_id || '',
      email: student.users?.email || '',
      phone: student.users?.phone || '',
      parent_id: student.parent_id || ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    try {
      // Update users table
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: editForm.full_name,
          email: editForm.email,
          phone: editForm.phone
        })
        .eq('id', editingStudent.id);

      if (userError) throw userError;

      // Update students table
      const { error: studentError } = await supabase
        .from('students')
        .update({
          national_id: editForm.national_id,
          parent_id: editForm.parent_id || null
        })
        .eq('id', editingStudent.id);

      if (studentError) throw studentError;

      showNotification('success', 'تم تحديث بيانات الطالب بنجاح');
      setShowEditModal(false);
      fetchStudents();
    } catch (error: any) {
      console.error('Error updating student:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء تحديث بيانات الطالب');
    }
  };
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          national_id,
          gender,
          parent_id,
          users (full_name, email, phone),
          sections (name, classes (name)),
          parents (users (full_name))
        `);

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطالب؟')) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`/api/users/delete?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل حذف الطالب');
      }
      
      showNotification('success', 'تم حذف الطالب بنجاح');
      fetchStudents();
    } catch (error: any) {
      console.error('Error deleting student:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حذف الطالب');
    }
  };

  const filteredStudents = students.filter(s => 
    s.users?.full_name?.includes(searchTerm) || 
    s.national_id?.includes(searchTerm)
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
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="py-3.5 pr-4 pl-3 text-right text-sm font-semibold text-slate-900 sm:pr-6">اسم الطالب</th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">الرقم المدني</th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">الصف والشعبة</th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">ولي الأمر</th>
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
                      {student.parents?.users?.full_name || '-'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                      {student.users?.email}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                      {student.users?.phone || '-'}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-4 pr-3 text-left text-sm font-medium sm:pl-6">
                      <button 
                        onClick={() => handleEditClick(student)}
                        className="text-slate-400 hover:text-indigo-600 mx-2"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(student.id)}
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
        <div className="md:hidden divide-y divide-slate-200">
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">
              جاري تحميل البيانات...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              لا يوجد طلاب مطابقين للبحث
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div key={student.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-slate-900">{student.users?.full_name}</h3>
                    <p className="text-xs text-slate-500">{student.national_id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEditClick(student)}
                      className="p-1 text-slate-400 hover:text-indigo-600"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(student.id)}
                      className="p-1 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block">الصف والشعبة</span>
                    <span className="text-slate-700">{student.sections?.classes?.name} - {student.sections?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">رقم الهاتف</span>
                    <span className="text-slate-700">{student.users?.phone || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block">البريد الإلكتروني</span>
                    <span className="text-slate-700">{student.users?.email}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Student Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/75 transition-opacity" onClick={() => setShowEditModal(false)}></div>
            
            <div className="relative transform overflow-hidden rounded-xl bg-white text-right shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-xl font-semibold leading-6 text-slate-900 mb-6">تعديل بيانات الطالب</h3>
                
                <form className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium leading-6 text-slate-900">الاسم الرباعي</label>
                      <input 
                        type="text" 
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium leading-6 text-slate-900">الرقم المدني</label>
                      <input 
                        type="text" 
                        value={editForm.national_id}
                        onChange={(e) => setEditForm({...editForm, national_id: e.target.value})}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium leading-6 text-slate-900">البريد الإلكتروني</label>
                      <input 
                        type="email" 
                        value={editForm.email}
                        onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium leading-6 text-slate-900">رقم الهاتف</label>
                      <input 
                        type="text" 
                        value={editForm.phone}
                        onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" 
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium leading-6 text-slate-900">ولي الأمر</label>
                      <select 
                        value={editForm.parent_id}
                        onChange={(e) => setEditForm({...editForm, parent_id: e.target.value})}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                      >
                        <option value="">بدون ولي أمر</option>
                        {parents.map(parent => (
                          <option key={parent.id} value={parent.id}>
                            {parent.users?.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </form>
              </div>
              <div className="bg-slate-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto"
                  onClick={handleEditSubmit}
                >
                  حفظ التعديلات
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 sm:mt-0 sm:w-auto"
                  onClick={() => setShowEditModal(false)}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                      <input 
                        type="text" 
                        value={addForm.full_name}
                        onChange={(e) => setAddForm({...addForm, full_name: e.target.value})}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium leading-6 text-slate-900">الرقم المدني</label>
                      <input 
                        type="text" 
                        value={addForm.national_id}
                        onChange={(e) => setAddForm({...addForm, national_id: e.target.value})}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium leading-6 text-slate-900">البريد الإلكتروني</label>
                      <input 
                        type="email" 
                        value={addForm.email}
                        onChange={(e) => setAddForm({...addForm, email: e.target.value})}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium leading-6 text-slate-900">رقم الهاتف</label>
                      <input 
                        type="text" 
                        value={addForm.phone}
                        onChange={(e) => setAddForm({...addForm, phone: e.target.value})}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" 
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium leading-6 text-slate-900">الشعبة (الصف)</label>
                      <select 
                        value={addForm.section_id}
                        onChange={(e) => setAddForm({...addForm, section_id: e.target.value})}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                      >
                        <option value="">اختر الشعبة</option>
                        {sections.map(section => (
                          <option key={section.id} value={section.id}>
                            {section.classes?.name} - {section.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium leading-6 text-slate-900">ولي الأمر</label>
                      <select 
                        value={addForm.parent_id}
                        onChange={(e) => setAddForm({...addForm, parent_id: e.target.value})}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                      >
                        <option value="">بدون ولي أمر</option>
                        {parents.map(parent => (
                          <option key={parent.id} value={parent.id}>
                            {parent.users?.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </form>
              </div>
              <div className="bg-slate-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto"
                  onClick={handleAddSubmit}
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
