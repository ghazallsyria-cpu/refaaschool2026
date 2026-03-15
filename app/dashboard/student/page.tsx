export default function StudentDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">لوحة تحكم الطالب</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold">جدولي الدراسي</h2>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold">درجاتي</h2>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold">واجباتي</h2>
        </div>
      </div>
    </div>
  );
}
