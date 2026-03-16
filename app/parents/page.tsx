'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, MoreHorizontal, Edit, Trash2, X, Key } from 'lucide-react';

export default function ParentsPage() {
  const [parents, setParents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingParent, setEditingParent] = useState<any>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [addForm, setAddForm] = useState({
    full_name: '',
    national_id: '',
    email: '',
    phone: '',
    address: '',
    job_title: ''
  });
  const [editForm, setEditForm] = useState({
    full_name: '',
    national_id: '',
    email: '',
    phone: '',
    address: '',
    job_title: ''
  });
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleResetPasswordClick = async (parent: any) => {
    if (!confirm(`هل أنت متأكد من إعادة تعيين كلمة المرور لـ ${parent.users?.full_name}؟ سيتم تعيينها إلى الرقم المدني متبوعاً بـ 123.`)) {
      return;
    }

    setResettingPassword(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: parent.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل إعادة تعيين كلمة المرور');
      }

      showNotification('success', `تم إعادة تعيين كلمة المرور بنجاح. كلمة المرور الجديدة هي: ${data.newPassword}`);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء إعادة تعيين كلمة المرور');
    } finally {
      setResettingPassword(false);
    }
  };

  const fetchParents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('parents')
        .select(`
          id,
          national_id,
          address,
          job_title,
          users (full_name, email, phone)
        `);

      if (error) throw error;
      setParents(data || []);
    } catch (error) {
      console.error('Error fetching parents:', error);
      showNotification('error', 'حدث خطأ أثناء جلب بيانات أولياء الأمور');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParents();
  }, [fetchParents]);

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
          role: 'parent',
          address: addForm.address,
          job_title: addForm.job_title
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل إنشاء حساب ولي الأمر');
      }

      showNotification('success', `تم إضافة ولي الأمر بنجاح (كلمة المرور: ${data.password})`);
      setShowAddModal(false);
      setAddForm({ full_name: '', national_id: '', email: '', phone: '', address: '', job_title: '' });
      fetchParents();
    } catch (error: any) {
      console.error('Error adding parent:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء إضافة ولي الأمر');
    }
  };

  const handleEditClick = (parent: any) => {
    setEditingParent(parent);
    setEditForm({
      full_name: parent.users?.full_name || '',
      national_id: parent.national_id || '',
      email: parent.users?.email || '',
      phone: parent.users?.phone || '',
      address: parent.address || '',
      job_title: parent.job_title || ''
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
        .eq('id', editingParent.id);

      if (userError) throw userError;

      // Update parents table
      const { error: parentError } = await supabase
        .from('parents')
        .update({
          national_id: editForm.national_id,
          address: editForm.address,
          job_title: editForm.job_title
        })
        .eq('id', editingParent.id);

      if (parentError) throw parentError;

      showNotification('success', 'تم تحديث بيانات ولي الأمر بنجاح');
      setShowEditModal(false);
      fetchParents();
    } catch (error: any) {
      console.error('Error updating parent:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء تحديث بيانات ولي الأمر');
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [parentToDelete, setParentToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setParentToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!parentToDelete) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`/api/users/delete?id=${parentToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'فشل حذف ولي الأمر');
      }

      showNotification('success', 'تم حذف ولي الأمر بنجاح');
      setShowDeleteModal(false);
      setParentToDelete(null);
      fetchParents();
    } catch (error: any) {
      console.error('Error deleting parent:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حذف ولي الأمر');
    }
  };

  const filteredParents = parents.filter(parent => 
    parent.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.national_id?.includes(searchTerm) ||
    parent.users?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {notification && (
        <div className={`p-4 rounded-md ${notification.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'} mb-4 flex justify-between items-center`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">إدارة أولياء الأمور</h1>
        <button 
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          إضافة ولي أمر
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border-0 py-2 pr-10 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            placeholder="بحث بالاسم، الرقم المدني، أو البريد الإلكتروني..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Parents Table */}
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-slate-300">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-right text-sm font-semibold text-slate-900 sm:pl-6">الاسم</th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">الرقم المدني</th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">معلومات التواصل</th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">الوظيفة</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">إجراءات</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                      </td>
                    </tr>
                  ) : filteredParents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-500">
                        لا يوجد أولياء أمور مطابقين للبحث
                      </td>
                    </tr>
                  ) : (
                    filteredParents.map((parent) => (
                      <tr key={parent.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6">
                          {parent.users?.full_name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                          {parent.national_id}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                          <div>{parent.users?.email}</div>
                          <div className="text-xs text-slate-400">{parent.users?.phone}</div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                          {parent.job_title || '-'}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleResetPasswordClick(parent)}
                              className="text-slate-400 hover:text-indigo-600 p-1"
                              title="إعادة تعيين كلمة المرور"
                              disabled={resettingPassword}
                            >
                              <Key className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleEditClick(parent)}
                              className="text-indigo-600 hover:text-indigo-900 p-1"
                              title="تعديل"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteClick(parent.id)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="حذف"
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
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">إضافة ولي أمر جديد</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">الاسم الرباعي *</label>
                <input
                  type="text"
                  value={addForm.full_name}
                  onChange={(e) => setAddForm({...addForm, full_name: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">الرقم المدني *</label>
                <input
                  type="text"
                  value={addForm.national_id}
                  onChange={(e) => setAddForm({...addForm, national_id: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">البريد الإلكتروني *</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({...addForm, email: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">رقم الهاتف</label>
                <input
                  type="text"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({...addForm, phone: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">العنوان</label>
                <input
                  type="text"
                  value={addForm.address}
                  onChange={(e) => setAddForm({...addForm, address: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">الوظيفة</label>
                <input
                  type="text"
                  value={addForm.job_title}
                  onChange={(e) => setAddForm({...addForm, job_title: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleAddSubmit}
                  className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  حفظ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">تعديل بيانات ولي الأمر</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">الاسم الرباعي *</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">الرقم المدني *</label>
                <input
                  type="text"
                  value={editForm.national_id}
                  onChange={(e) => setEditForm({...editForm, national_id: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">البريد الإلكتروني *</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">رقم الهاتف</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">العنوان</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">الوظيفة</label>
                <input
                  type="text"
                  value={editForm.job_title}
                  onChange={(e) => setEditForm({...editForm, job_title: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleEditSubmit}
                  className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  حفظ التعديلات
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
                    <h3 className="text-xl font-bold leading-6 text-slate-900">حذف ولي الأمر</h3>
                    <div className="mt-2">
                      <p className="text-sm text-slate-500">
                        هل أنت متأكد من حذف ولي الأمر هذا؟ سيتم حذف جميع البيانات المرتبطة به نهائياً. لا يمكن التراجع عن هذا الإجراء.
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
    </div>
  );
}
