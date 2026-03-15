export default function TeacherDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">لوحة تحكم المعلم</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold">جدول الحصص</h2>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold">إدارة الدرجات</h2>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold">تسجيل الحضور</h2>
        </div>
      </div>
    </div>
  );
}
