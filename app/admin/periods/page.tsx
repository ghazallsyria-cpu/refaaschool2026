'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Clock, Plus, Trash2, X } from 'lucide-react';

type Period = {
  id: string;
  period_number: number;
  start_time: string;
  end_time: string;
};

export default function PeriodsPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPeriod, setNewPeriod] = useState({ period_number: 1, start_time: '', end_time: '' });

  const fetchPeriods = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('class_periods')
      .select('*')
      .order('period_number');
    if (error) console.error('Error fetching periods:', error);
    else setPeriods(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  const handleAddPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await supabase.from('class_periods').insert([newPeriod]);
    if (error) console.error('Error adding period:', error);
    else {
      fetchPeriods();
      setNewPeriod({ period_number: periods.length + 1, start_time: '', end_time: '' });
    }
    setIsSubmitting(false);
  };

  const handleDeletePeriod = async (id: string) => {
    const { error } = await supabase.from('class_periods').delete().eq('id', id);
    if (error) console.error('Error deleting period:', error);
    else fetchPeriods();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">إدارة توقيت الحصص</h1>
      
      <form onSubmit={handleAddPeriod} className="flex gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm">
        <input type="number" placeholder="رقم الحصة" className="border p-2 rounded" value={newPeriod.period_number} onChange={e => setNewPeriod({...newPeriod, period_number: parseInt(e.target.value)})} required />
        <input type="time" className="border p-2 rounded" value={newPeriod.start_time} onChange={e => setNewPeriod({...newPeriod, start_time: e.target.value})} required />
        <input type="time" className="border p-2 rounded" value={newPeriod.end_time} onChange={e => setNewPeriod({...newPeriod, end_time: e.target.value})} required />
        <button type="submit" disabled={isSubmitting} className="bg-indigo-600 text-white p-2 rounded">إضافة</button>
      </form>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        {loading ? <p>جاري التحميل...</p> : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-right">رقم الحصة</th>
                <th className="text-right">وقت البدء</th>
                <th className="text-right">وقت الانتهاء</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {periods.map(p => (
                <tr key={p.id}>
                  <td>{p.period_number}</td>
                  <td>{p.start_time}</td>
                  <td>{p.end_time}</td>
                  <td>
                    <button onClick={() => handleDeletePeriod(p.id)} className="text-red-500"><Trash2 /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
