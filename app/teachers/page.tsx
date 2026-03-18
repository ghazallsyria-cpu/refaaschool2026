'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Filter, Edit, Trash2, X, Key, BookOpen } from 'lucide-react';

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('الكل');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [addForm, setAddForm] = useState({
    full_name: '',
    national_id: '',
    email: '',
    phone: '',
    specialization: '',
    zoom_link: ''
  });
  const [editForm, setEditForm] = useState({
    full_name: '',
    national_id: '',
    email: '',
    phone: '',
    specialization: '',
    zoom_link: ''
  });

  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [resetPasswordForm, setResetPasswordForm] = useState({ userId: '', newPassword: '' });

  const handleResetPasswordClick = (teacher: any) => {
    setResetPasswordForm({ userId: teacher.id, newPassword: '' });
    setShowPasswordResetModal(true);
  };

  const handleResetPasswordSubmit = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(resetPasswordForm)
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'فشل تغيير كلمة المرور');
      
      showNotification('success', `تم تغيير كلمة المرور بنجاح. كلمة المرور الجديدة: ${data.newPassword || resetPasswordForm.newPassword}`);
      setShowPasswordResetModal(false);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء تغيير كلمة المرور');
    }
  };

  const handleAddSubmit = async () => {
    try {
      if (!addForm.full_name || !addForm.national_id) {
        showNotification('error', 'يرجى تعبئة الحقول الإلزامية (الاسم والرقم المدني)');
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
          email: addForm.email || null,
          full_name: addForm.full_name,
          national_id: addForm.national_id,
          phone: addForm.phone,
          role: 'teacher',
          specialization: addForm.specialization,
          zoom_link: addForm.zoom_link,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل إنشاء حساب المعلم');
      }

      showNotification('success', `تم إضافة المعلم بنجاح (كلمة المرور: ${data.password})`);
      setShowAddModal(false);
      setAddForm({ full_name: '', national_id: '', email: '', phone: '', specialization: '', zoom_link: '' });
      fetchTeachers();
    } catch (error: any) {
      console.error('Error adding teacher:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء إضافة المعلم');
    }
  };

  const handleEditClick = (teacher: any) => {
    setEditingTeacher(teacher);
    setEditForm({
      full_name: teacher.users?.full_name || '',
      national_id: teacher.national_id || '',
      email: teacher.users?.email || '',
      phone: teacher.users?.phone || '',
      specialization: teacher.specialization || '',
      zoom_link: teacher.zoom_link || ''
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
        .eq('id', editingTeacher.id);

      if (userError) throw userError;

      // Update teachers table
      const { error: teacherError } = await supabase
        .from('teachers')
        .update({
          national_id: editForm.national_id,
          specialization: editForm.specialization,
          zoom_link: editForm.zoom_link
        })
        .eq('id', editingTeacher.id);

      if (teacherError) throw teacherError;

      showNotification('success', 'تم تحديث بيانات المعلم بنجاح');
      setShowEditModal(false);
      fetchTeachers();
    } catch (error: any) {
      console.error('Error updating teacher:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء تحديث بيانات المعلم');
    }
  };

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
          users (full_name, email, phone),
          teacher_sections (count)
        `);

      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<string | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teacherSections, setTeacherSections] = useState<any[]>([]);

  const handleAssignmentClick = async (teacher: any) => {
    setSelectedTeacher(teacher);
    const [sRes, subRes, tsRes] = await Promise.all([
      supabase.from('sections').select('id, name, classes(name)'),
      supabase.from('subjects').select('id, name'),
      supabase.from('teacher_sections').select('id, section_id, subject_id').eq('teacher_id', teacher.id)
    ]);
    if (sRes.data) setSections(sRes.data);
    if (subRes.data) setSubjects(subRes.data);
    if (tsRes.data) setTeacherSections(tsRes.data);
    setShowAssignmentModal(true);
  };

  const toggleAssignment = async (sectionId: string, subjectId: string) => {
    const existing = teacherSections.find(ts => ts.section_id === sectionId && ts.subject_id === subjectId);
    if (existing) {
      await supabase.from('teacher_sections').delete().eq('id', existing.id);
      setTeacherSections(teacherSections.filter(ts => ts.id !== existing.id));
      showNotification('success', 'تم إزالة التعيين بنجاح');
    } else {
      const { data, error } = await supabase.from('teacher_sections').insert({
        teacher_id: selectedTeacher.id,
        section_id: sectionId,
        subject_id: subjectId
      }).select().single();
      if (data) {
        setTeacherSections([...teacherSections, data]);
        showNotification('success', 'تم إضافة التعيين بنجاح');
      }
    }
  };

  const handleDeleteClick = (id: string) => {
    setTeacherToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!teacherToDelete) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`/api/users/delete?id=${teacherToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل حذف المعلم');
      }
      
      showNotification('success', 'تم حذف المعلم بنجاح');
      setShowDeleteModal(false);
      setTeacherToDelete(null);
      fetchTeachers();
    } catch (error: any) {
      console.error('Error deleting teacher:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حذف المعلم');
    }
  };

  const specializations = ['الكل', ...Array.from(new Set(teachers.map(t => t.specialization).filter(Boolean))) as string[]];

  const filteredTeachers = teachers.filter(teacher => 
    (activeTab === 'الكل' || teacher.specialization === activeTab) &&
    (teacher.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.national_id?.includes(searchQuery))
  );

  const groupedTeachers = filteredTeachers.reduce((acc, teacher) => {
    const spec = teacher.specialization || 'غير محدد';
    if (!acc[spec]) acc[spec] = [];
    acc[spec].push(teacher);
    return acc;
  }, {} as Record<string, any[]>);

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
          <h1 className="text-2xl font-bold text-slate-900">إدارة المعلمين</h1>
          <p className="text-slate-500">عرض وإدارة بيانات الهيئة التدريسية</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
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
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {specializations.map(spec => (
            <button
              key={spec}
              onClick={() => setActiveTab(spec)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${activeTab === spec ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
            >
              {spec}
            </button>
          ))}
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
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">التعيينات</th>
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
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                        {teacher.teacher_sections?.length || 0}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                      {teacher.users?.phone || 'غير محدد'}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-6 pr-4 text-left text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleAssignmentClick(teacher)}
                          className="text-slate-400 hover:text-emerald-600"
                          title="تعيين الفصول والمواد"
                        >
                          <BookOpen className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleResetPasswordClick(teacher)}
                          className="text-slate-400 hover:text-indigo-600"
                          title="إعادة تعيين كلمة المرور"
                        >
                          <Key className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleEditClick(teacher)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(teacher.id)}
                          className="text-red-600 hover:text-red-900"
                        >
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
                    <button 
                      onClick={() => handleResetPasswordClick(teacher)}
                      className="p-1 text-slate-400 hover:text-indigo-600"
                      title="إعادة تعيين كلمة المرور"
                    >
                      <Key className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleEditClick(teacher)}
                      className="p-1 text-slate-400 hover:text-indigo-600"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(teacher.id)}
                      className="p-1 text-slate-400 hover:text-red-600"
                    >
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

      {/* Edit Teacher Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/75 transition-opacity" onClick={() => setShowEditModal(false)}></div>
            
            <div className="relative transform overflow-hidden rounded-xl bg-white text-right shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-xl font-semibold leading-6 text-slate-900 mb-6">تعديل بيانات المعلم</h3>
                
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
                      <label className="block text-sm font-medium leading-6 text-slate-900">التخصص</label>
                      <select 
                        value={editForm.specialization}
                        onChange={(e) => setEditForm({...editForm, specialization: e.target.value})}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" 
                      >
                        <option value="">اختر التخصص</option>
                        {specializations.map(spec => (
                          <option key={spec} value={spec}>{spec}</option>
                        ))}
                        <option value="أخرى">أخرى</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium leading-6 text-slate-900">رابط زوم</label>
                      <input 
                        type="url" 
                        value={editForm.zoom_link}
                        onChange={(e) => setEditForm({...editForm, zoom_link: e.target.value})}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" 
                      />
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
      {/* Add Teacher Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/75 transition-opacity" onClick={() => setShowAddModal(false)}></div>
            
            <div className="relative transform overflow-hidden rounded-xl bg-white text-right shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-xl font-semibold leading-6 text-slate-900 mb-6">إضافة معلم جديد</h3>
                
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
                      <label className="block text-sm font-medium leading-6 text-slate-900">التخصص</label>
                      <select 
                        value={addForm.specialization}
                        onChange={(e) => setAddForm({...addForm, specialization: e.target.value})}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" 
                      >
                        <option value="">اختر التخصص</option>
                        {specializations.map(spec => (
                          <option key={spec} value={spec}>{spec}</option>
                        ))}
                        <option value="أخرى">أخرى</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium leading-6 text-slate-900">رابط زوم</label>
                      <input 
                        type="url" 
                        value={addForm.zoom_link}
                        onChange={(e) => setAddForm({...addForm, zoom_link: e.target.value})}
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" 
                      />
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
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" onClick={() => setShowDeleteModal(false)}></div>
            <div className="relative transform overflow-hidden rounded-2xl bg-white text-right shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start sm:flex-row-reverse">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Trash2 className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mr-4 sm:mt-0 sm:text-right">
                    <h3 className="text-xl font-bold leading-6 text-slate-900">حذف المعلم</h3>
                    <div className="mt-2">
                      <p className="text-sm text-slate-500">
                        هل أنت متأكد من حذف هذا المعلم؟ سيتم حذف جميع البيانات المرتبطة به نهائياً. لا يمكن التراجع عن هذا الإجراء.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-3">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-red-500 sm:w-auto"
                  onClick={confirmDelete}
                >
                  تأكيد الحذف
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 sm:mt-0 sm:w-auto"
                  onClick={() => setShowDeleteModal(false)}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showAssignmentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/75 transition-opacity" onClick={() => setShowAssignmentModal(false)}></div>
            <div className="relative transform overflow-hidden rounded-xl bg-white text-right shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-xl font-semibold leading-6 text-slate-900 mb-6">تعيين فصول ومواد لـ {selectedTeacher?.users?.full_name}</h3>
                <div className="space-y-4">
                  {sections.map(section => (
                    <div key={section.id} className="border p-4 rounded-lg">
                      <h4 className="font-bold mb-2">{section.classes?.name} - {section.name}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {subjects.map(subject => {
                          const isAssigned = teacherSections.some(ts => ts.section_id === section.id && ts.subject_id === subject.id);
                          return (
                            <button 
                              key={subject.id}
                              onClick={() => toggleAssignment(section.id, subject.id)}
                              className={`p-2 rounded text-sm ${isAssigned ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}
                            >
                              {subject.name} {isAssigned && '✓'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto"
                  onClick={() => setShowAssignmentModal(false)}
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showPasswordResetModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/75 transition-opacity" onClick={() => setShowPasswordResetModal(false)}></div>
            
            <div className="relative transform overflow-hidden rounded-xl bg-white text-right shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-xl font-semibold leading-6 text-slate-900 mb-6">إعادة تعيين كلمة المرور</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium leading-6 text-slate-900">كلمة المرور الجديدة</label>
                    <input 
                      type="password" 
                      value={resetPasswordForm.newPassword}
                      onChange={(e) => setResetPasswordForm({...resetPasswordForm, newPassword: e.target.value})}
                      className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" 
                    />
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={handleResetPasswordSubmit}
                  className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto"
                >
                  حفظ
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordResetModal(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 sm:mt-0 sm:w-auto"
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
