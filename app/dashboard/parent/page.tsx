export default function ParentDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">لوحة تحكم ولي الأمر</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold">متابعة الأبناء</h2>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold">الدرجات والتقارير</h2>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold">الرسائل</h2>
        </div>
      </div>
    </div>
  );
}
