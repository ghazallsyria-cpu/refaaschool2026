'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Save, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export default function AttendancePage() {
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchSections();
  }, []);

  useEffect(() => {
    if (selectedSection && date) {
      fetchStudentsAndAttendance();
    }
  }, [selectedSection, date]);

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('id, name, classes(name)')
        .order('name');
      
      if (error) throw error;
      setSections(data || []);
      if (data && data.length > 0) {
        setSelectedSection(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const fetchStudentsAndAttendance = async () => {
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      // Fetch students for the section
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, users(full_name)')
        .eq('section_id', selectedSection);

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Fetch existing attendance for this date and section
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('section_id', selectedSection)
        .eq('date', date);

      if (attendanceError) throw attendanceError;

      // Initialize attendance state
      const newAttendance: Record<string, AttendanceStatus> = {};
      
      // Default all to present
      studentsData?.forEach(s => {
        newAttendance[s.id] = 'present';
      });

      // Override with saved data
      attendanceData?.forEach(a => {
        newAttendance[a.student_id] = a.status as AttendanceStatus;
      });

      setAttendance(newAttendance);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const records = Object.entries(attendance).map(([studentId, status]) => ({
        student_id: studentId,
        section_id: selectedSection,
        date: date,
        status: status,
        recorded_by: user?.id || null
      }));

      // Upsert attendance records
      const { error } = await supabase
        .from('attendance')
        .upsert(records, { onConflict: 'student_id,date' });

      if (error) throw error;
      
      setMessage({ text: 'تم حفظ الغياب والحضور بنجاح', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      setMessage({ text: 'حدث خطأ أثناء الحفظ', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const markAllAs = (status: AttendanceStatus) => {
    const newAttendance = { ...attendance };
    students.forEach(s => {
      newAttendance[s.id] = status;
    });
    setAttendance(newAttendance);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">سجل الحضور والغياب</h1>
          <p className="text-slate-500">تسجيل ومتابعة حضور الطلاب اليومي</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving || students.length === 0}
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="mr-2 h-4 w-4 ml-2" />
          {saving ? 'جاري الحفظ...' : 'حفظ السجل'}
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">الفصل / الشعبة</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
            >
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.classes?.name} - {s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">التاريخ</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <Calendar className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="block w-full rounded-md border-0 py-2 pr-10 pl-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-medium text-slate-900">قائمة الطلاب</h3>
          <div className="flex gap-2">
            <button onClick={() => markAllAs('present')} className="text-xs text-emerald-600 hover:underline">الكل حاضر</button>
            <span className="text-slate-300">|</span>
            <button onClick={() => markAllAs('absent')} className="text-xs text-red-600 hover:underline">الكل غائب</button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-white">
              <tr>
                <th scope="col" className="py-3.5 pr-4 pl-3 text-right text-sm font-semibold text-slate-900 sm:pr-6">اسم الطالب</th>
                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900">حاضر</th>
                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900">غائب</th>
                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900">متأخر</th>
                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900">مستأذن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-slate-500">
                    جاري تحميل قائمة الطلاب...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-slate-500">
                    لا يوجد طلاب مسجلين في هذه الشعبة
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap py-4 pr-4 pl-3 text-sm font-medium text-slate-900 sm:pr-6">
                      {student.users?.full_name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-center">
                      <input
                        type="radio"
                        name={`status-${student.id}`}
                        checked={attendance[student.id] === 'present'}
                        onChange={() => handleStatusChange(student.id, 'present')}
                        className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-center">
                      <input
                        type="radio"
                        name={`status-${student.id}`}
                        checked={attendance[student.id] === 'absent'}
                        onChange={() => handleStatusChange(student.id, 'absent')}
                        className="h-4 w-4 border-slate-300 text-red-600 focus:ring-red-600 cursor-pointer"
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-center">
                      <input
                        type="radio"
                        name={`status-${student.id}`}
                        checked={attendance[student.id] === 'late'}
                        onChange={() => handleStatusChange(student.id, 'late')}
                        className="h-4 w-4 border-slate-300 text-amber-600 focus:ring-amber-600 cursor-pointer"
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-center">
                      <input
                        type="radio"
                        name={`status-${student.id}`}
                        checked={attendance[student.id] === 'excused'}
                        onChange={() => handleStatusChange(student.id, 'excused')}
                        className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
