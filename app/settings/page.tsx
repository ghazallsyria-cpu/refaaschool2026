'use client';

import { useState } from 'react';
import { 
  Building2, 
  User, 
  Bell, 
  Shield, 
  Save, 
  Upload, 
  Camera 
} from 'lucide-react';

type Tab = 'school' | 'profile' | 'notifications' | 'security';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('school');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleSave = () => {
    setSaving(true);
    setMessage({ text: '', type: '' });
    
    // Simulate API call
    setTimeout(() => {
      setSaving(false);
      setMessage({ text: 'تم حفظ الإعدادات بنجاح', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">الإعدادات</h1>
          <p className="text-slate-500">إدارة تفضيلات النظام والملف الشخصي</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save className="mr-2 h-4 w-4 ml-2" />
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex flex-col space-y-1">
            <button
              onClick={() => setActiveTab('school')}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'school' 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Building2 className={`h-5 w-5 ${activeTab === 'school' ? 'text-indigo-700' : 'text-slate-400'}`} />
              إعدادات المدرسة
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'profile' 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <User className={`h-5 w-5 ${activeTab === 'profile' ? 'text-indigo-700' : 'text-slate-400'}`} />
              الملف الشخصي
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'notifications' 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Bell className={`h-5 w-5 ${activeTab === 'notifications' ? 'text-indigo-700' : 'text-slate-400'}`} />
              الإشعارات
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'security' 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Shield className={`h-5 w-5 ${activeTab === 'security' ? 'text-indigo-700' : 'text-slate-400'}`} />
              الأمان وكلمة المرور
            </button>
          </nav>
        </aside>

        {/* Content Area */}
        <div className="flex-1">
          <div className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden">
            
            {/* School Settings */}
            {activeTab === 'school' && (
              <div className="p-6 space-y-8">
                <div>
                  <h3 className="text-lg font-medium leading-6 text-slate-900">المعلومات الأساسية للمدرسة</h3>
                  <p className="mt-1 text-sm text-slate-500">تحديث اسم المدرسة، الشعار، وبيانات التواصل الرسمية.</p>
                </div>

                <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-6">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-slate-900">شعار المدرسة</label>
                    <div className="mt-2 flex items-center gap-x-3">
                      <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                        <Building2 className="h-8 w-8 text-slate-300" />
                      </div>
                      <button type="button" className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                        تغيير الشعار
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-slate-900">اسم المدرسة</label>
                    <input type="text" defaultValue="مدرسة الرفعة النموذجية" className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium leading-6 text-slate-900">العام الدراسي الحالي</label>
                    <select className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">
                      <option>2025 - 2026</option>
                      <option>2026 - 2027</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium leading-6 text-slate-900">الفصل الدراسي</label>
                    <select className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">
                      <option>الفصل الدراسي الأول</option>
                      <option>الفصل الدراسي الثاني</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-slate-900">العنوان</label>
                    <input type="text" defaultValue="شارع الملك فهد، حي الياسمين، الرياض" className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium leading-6 text-slate-900">رقم الهاتف الرسمي</label>
                    <input type="text" defaultValue="0112345678" className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium leading-6 text-slate-900">البريد الإلكتروني الرسمي</label>
                    <input type="email" defaultValue="info@alrifaa.edu" className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                  </div>
                </div>
              </div>
            )}

            {/* Profile Settings */}
            {activeTab === 'profile' && (
              <div className="p-6 space-y-8">
                <div>
                  <h3 className="text-lg font-medium leading-6 text-slate-900">الملف الشخصي</h3>
                  <p className="mt-1 text-sm text-slate-500">تحديث بياناتك الشخصية وصورتك الرمزية.</p>
                </div>

                <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-6">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-slate-900">الصورة الشخصية</label>
                    <div className="mt-2 flex items-center gap-x-3">
                      <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl">
                        أ
                      </div>
                      <button type="button" className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        تغيير الصورة
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-slate-900">الاسم الكامل</label>
                    <input type="text" defaultValue="أحمد محمد" className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium leading-6 text-slate-900">البريد الإلكتروني</label>
                    <input type="email" defaultValue="admin@alrifaa.edu" className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium leading-6 text-slate-900">رقم الهاتف</label>
                    <input type="text" defaultValue="0501234567" className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Settings */}
            {activeTab === 'notifications' && (
              <div className="p-6 space-y-8">
                <div>
                  <h3 className="text-lg font-medium leading-6 text-slate-900">تفضيلات الإشعارات</h3>
                  <p className="mt-1 text-sm text-slate-500">اختر متى وكيف تريد أن تتلقى الإشعارات.</p>
                </div>

                <div className="space-y-6">
                  <fieldset>
                    <legend className="text-sm font-semibold leading-6 text-slate-900">إشعارات البريد الإلكتروني</legend>
                    <div className="mt-4 space-y-4">
                      <div className="flex items-start">
                        <div className="flex h-6 items-center">
                          <input id="comments" name="comments" type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                        </div>
                        <div className="mr-3 text-sm leading-6">
                          <label htmlFor="comments" className="font-medium text-slate-900">الرسائل الجديدة</label>
                          <p className="text-slate-500">استلام بريد إلكتروني عند وصول رسالة جديدة في النظام.</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <div className="flex h-6 items-center">
                          <input id="candidates" name="candidates" type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                        </div>
                        <div className="mr-3 text-sm leading-6">
                          <label htmlFor="candidates" className="font-medium text-slate-900">الإعلانات الهامة</label>
                          <p className="text-slate-500">استلام بريد إلكتروني عند نشر تعميم إداري جديد.</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <div className="flex h-6 items-center">
                          <input id="offers" name="offers" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                        </div>
                        <div className="mr-3 text-sm leading-6">
                          <label htmlFor="offers" className="font-medium text-slate-900">التقارير الأسبوعية</label>
                          <p className="text-slate-500">استلام ملخص أسبوعي عن أداء المدرسة والحضور.</p>
                        </div>
                      </div>
                    </div>
                  </fieldset>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="p-6 space-y-8">
                <div>
                  <h3 className="text-lg font-medium leading-6 text-slate-900">الأمان وكلمة المرور</h3>
                  <p className="mt-1 text-sm text-slate-500">تحديث كلمة المرور الخاصة بك وتأمين حسابك.</p>
                </div>

                <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-6">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-slate-900">كلمة المرور الحالية</label>
                    <input type="password" placeholder="••••••••" className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-slate-900">كلمة المرور الجديدة</label>
                    <input type="password" placeholder="••••••••" className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-slate-900">تأكيد كلمة المرور الجديدة</label>
                    <input type="password" placeholder="••••••••" className="mt-2 block w-full rounded-md border-0 py-1.5 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                  </div>
                </div>
                
                <div className="pt-4 border-t border-slate-200">
                  <button type="button" className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                    تسجيل الخروج من جميع الأجهزة الأخرى
                  </button>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
