import { useState } from "react";

const problems = [
  {
    id: 1,
    severity: "critical",
    category: "الأدوار والصلاحيات",
    icon: "🔴",
    title: "دور management موجود في DB لكن غير موجود في Middleware",
    current: `// في middleware.ts لا يوجد أي توجيه لدور management
if (user.role === 'admin') → /dashboard
if (user.role === 'teacher') → /dashboard/teacher
if (user.role === 'student') → /dashboard/student
if (user.role === 'parent') → /dashboard/parent
// ❌ management → لا شيء! يبقى عالقاً`,
    fix: `// يجب إضافة:
if (user.role === 'management') 
  return NextResponse.redirect(new URL('/dashboard/management', request.url));

// وإنشاء صلحيات خاصة:
// management: يرى كل شيء لكن لا يعدّل إعدادات النظام`,
    impact: "مستخدم management لا يستطيع تسجيل الدخول بشكل صحيح"
  },
  {
    id: 2,
    severity: "critical",
    category: "الحضور والغياب",
    icon: "🔴",
    title: "UNIQUE على (student_id, date) يكسر منطق تسجيل الحضور",
    current: `UNIQUE(student_id, date)
-- ❌ طالب لديه 6 حصص يومياً
-- لكن لا يمكن تسجيل إلا حضور واحد في اليوم!
-- معلم الرياضيات سيمسح حضور معلم العربي`,
    fix: `-- الصحيح منطقياً:
UNIQUE(student_id, section_id, subject_id, date, period)
-- أو على الأقل:
UNIQUE(student_id, date, period)
-- كل حصة = سجل منفصل`,
    impact: "استحالة تسجيل حضور حقيقي لأكثر من مادة في اليوم"
  },
  {
    id: 3,
    severity: "critical",
    category: "الاختبارات",
    icon: "🔴",
    title: "الطالب يرى اختبارات كل الشعب وليس شعبته فقط",
    current: `-- سياسة RLS الحالية:
CREATE POLICY "Students can view published exams"
  ON public.exams FOR SELECT
  USING (status = 'published');
-- ❌ طالب في الصف 10/أ يرى اختبارات 10/ب و10/ج!`,
    fix: `-- الصحيح:
CREATE POLICY "Students can view their section exams"
  ON public.exams FOR SELECT
  USING (
    status = 'published'
    AND section_id = (
      SELECT section_id FROM public.students 
      WHERE id = auth.uid()
    )
    AND NOW() BETWEEN start_at AND end_at
  );`,
    impact: "خرق أمني: طالب يطّلع على أسئلة فصل آخر"
  },
  {
    id: 4,
    severity: "critical",
    category: "ولي الأمر",
    icon: "🔴",
    title: "ولي الأمر لا يرى درجات ولا حضور أبنائه",
    current: `-- لا توجد سياسة RLS لولي الأمر على:
-- ❌ جدول attendance (الحضور)
-- ❌ جدول grades (الدرجات)
-- ❌ جدول exam_attempts (محاولات الاختبار)
-- ❌ جدول assignments (الواجبات)
-- ولي الأمر يرى فقط بيانات الطالب الأساسية`,
    fix: `-- يجب إضافة:
CREATE POLICY "Parent views child attendance"
  ON public.attendance FOR SELECT USING (
    student_id IN (
      SELECT id FROM public.students 
      WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "Parent views child grades"
  ON public.grades FOR SELECT USING (
    student_id IN (
      SELECT id FROM public.students 
      WHERE parent_id = auth.uid()
    )
  );`,
    impact: "ولي الأمر عاجز تماماً — النظام بلا قيمة له"
  },
  {
    id: 5,
    severity: "critical",
    category: "الدرجات",
    icon: "🔴",
    title: "لا توجد سياسة لرؤية الطالب لدرجاته الخاصة!",
    current: `-- جدول grades في complete_system_schema.sql
-- RLS مفعّل لكن لا يوجد SELECT policy للطلاب
-- ❌ الطالب لا يستطيع رؤية علاماته في جدول grades
-- يوجد فقط: exam_attempts.score لكن grades منفصل`,
    fix: `CREATE POLICY "Students view own grades"
  ON public.grades FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Teachers view section grades"
  ON public.grades FOR SELECT USING (
    exam_id IN (
      SELECT id FROM public.exams 
      WHERE teacher_id = auth.uid()
    )
  );`,
    impact: "الطالب محروم من رؤية نتائجه الرسمية"
  },
  {
    id: 6,
    severity: "high",
    category: "المعلم",
    icon: "🟠",
    title: "المعلم يسجّل حضور أي طالب في أي فصل",
    current: `-- سياسة الحضور الحالية:
CREATE POLICY "Teachers can manage attendance"
  ON public.attendance FOR ALL
  USING (get_user_role() IN ('admin','management','teacher'));
-- ❌ أي معلم يسجّل غياب طالب في فصل لا يدرّسه`,
    fix: `CREATE POLICY "Teachers manage own sections attendance"
  ON public.attendance FOR ALL
  USING (
    get_user_role() IN ('admin','management')
    OR section_id IN (
      SELECT section_id FROM public.teacher_sections
      WHERE teacher_id = auth.uid()
    )
  );`,
    impact: "معلم الرياضيات يعدّل غياب حصة العربي"
  },
  {
    id: 7,
    severity: "high",
    category: "الاختبارات",
    icon: "🟠",
    title: "لا يوجد تحقق من وقت الاختبار عند الدخول",
    current: `-- طالب يمكنه إنشاء exam_attempt حتى لو:
-- ❌ الاختبار لم يبدأ بعد (قبل start_at)
-- ❌ انتهى وقت الاختبار (بعد end_at)
-- ❌ استنفد عدد المحاولات (max_attempts)
CREATE POLICY "Students can create their own attempts"
  ON public.exam_attempts FOR INSERT
  WITH CHECK (student_id = auth.uid()); -- فقط!`,
    fix: `WITH CHECK (
  student_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = exam_id
    AND e.status = 'published'
    AND NOW() BETWEEN e.start_at AND e.end_at
    AND (
      SELECT COUNT(*) FROM public.exam_attempts
      WHERE exam_id = e.id AND student_id = auth.uid()
    ) < e.max_attempts
  )
);`,
    impact: "طلاب يدخلون الاختبار خارج وقته أو يكررونه"
  },
  {
    id: 8,
    severity: "high",
    category: "الواجبات",
    icon: "🟠",
    title: "الطالب لا يرى الواجبات المخصصة لشعبته",
    current: `-- لا توجد SELECT policy للطلاب على جدول assignments
-- ❌ الطالب لا يرى واجباته
-- لا توجد أي policy لـ assignments تخص الطالب في
-- complete_system_schema.sql أو exams_rls_schema.sql`,
    fix: `CREATE POLICY "Students view section assignments"
  ON public.assignments FOR SELECT USING (
    section_id = (
      SELECT section_id FROM public.students
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Teachers manage own assignments"
  ON public.assignments FOR ALL USING (
    teacher_id = auth.uid()
    OR get_user_role() IN ('admin','management')
  );`,
    impact: "الطالب لا يعلم بالواجبات المطلوبة منه"
  },
  {
    id: 9,
    severity: "high",
    category: "الرسائل",
    icon: "🟠",
    title: "أي مستخدم يرسل رسالة لأي مستخدم آخر",
    current: `CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());
-- ❌ طالب يرسل لمدير آخر في مدرسة أخرى
-- ❌ لا قيود على من يمكن مراسلته
-- ❌ طالب يرسل لطالب آخر من فصل مختلف`,
    fix: `-- يجب تحديد قواعد المراسلة:
-- طالب ← معلمو فصله فقط
-- معلم ← طلاب فصوله + إدارة
-- ولي أمر ← معلمو ابنه + إدارة
-- إدارة ← الجميع
-- + إضافة rate limiting`,
    impact: "فوضى في التواصل وخصوصية منعدمة"
  },
  {
    id: 10,
    severity: "medium",
    category: "قاعدة البيانات",
    icon: "🟡",
    title: "لا يوجد مفهوم السنة الدراسية / الفصل الدراسي",
    current: `-- كل البيانات بلا سياق زمني:
-- ❌ الجداول، الحضور، الدرجات كلها بلا academic_year
-- ❌ لا يمكن أرشفة سنة وبدء سنة جديدة
-- ❌ إحصائيات 2024 مختلطة مع 2025 و2026`,
    fix: `CREATE TABLE public.academic_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- "2025-2026"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT FALSE
);
-- ثم إضافة academic_year_id لكل الجداول المهمة`,
    impact: "استحالة الأرشفة والمقارنة بين السنوات"
  },
  {
    id: 11,
    severity: "medium",
    category: "الأمان",
    icon: "🟡",
    title: "getSession() مهجور وغير آمن في Server-side",
    current: `// middleware.ts
const { data: { session } } = 
  await supabase.auth.getSession();
// ⚠️ getSession() يقرأ من cookies بدون تحقق JWT
// ⚠️ يمكن تزوير الجلسة نظرياً`,
    fix: `// الصحيح:
const { data: { user }, error } = 
  await supabase.auth.getUser();
// getUser() يتحقق من JWT مع Supabase server
// آمن تماماً للاستخدام في Middleware`,
    impact: "ثغرة أمنية محتملة في التحقق من الجلسات"
  },
  {
    id: 12,
    severity: "medium",
    category: "الأداء",
    icon: "🟡",
    title: "استعلام DB في كل request يُبطّئ التطبيق",
    current: `// كل طلب HTTP يستدعي:
const { data: user } = await supabase
  .from('users')
  .select('role, must_reset_password')
  .eq('id', session.user.id)
  .single();
// = N طلبات DB في الثانية!`,
    fix: `// الحل: تخزين الدور في JWT custom claims
// في Supabase → Auth → Hooks:
// custom_access_token_hook يضيف role في JWT
// ثم في middleware:
const role = user.user_metadata?.role;
// = 0 استعلامات إضافية!`,
    impact: "بطء ملحوظ عند زيادة المستخدمين"
  },
  {
    id: 13,
    severity: "low",
    category: "قاعدة البيانات",
    icon: "🔵",
    title: "ENUM 'all' كدور مستخدم لا منطق له",
    current: `CREATE TYPE user_role AS ENUM (
  'admin', 'management', 'teacher', 
  'student', 'parent', 'all' -- ❓ ما هذا؟
);
-- 'all' يُستخدم في announcements.target_role
-- لكن ليس كدور لمستخدم حقيقي`,
    fix: `-- فصل الـ ENUM إلى نوعين:
CREATE TYPE user_role AS ENUM (
  'admin','management','teacher','student','parent'
);
CREATE TYPE announcement_target AS ENUM (
  'admin','management','teacher','student','parent','all'
);`,
    impact: "تشويش في منطق الأدوار"
  }
];

const architecture = [
  {
    role: "مدير النظام",
    emoji: "👑",
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fca5a5",
    can: [
      "إنشاء وتعديل وحذف جميع المستخدمين",
      "إدارة الصفوف والشعب والمواد",
      "تعيين المعلمين للفصول",
      "الإعلانات لجميع الأدوار",
      "رؤية كل التقارير والإحصائيات",
      "إدارة السنة الدراسية",
      "الوصول الكامل لكل البيانات",
    ],
    cannot: [
      "تسجيل حضور (دور المعلم)",
      "إنشاء اختبارات (دور المعلم)",
    ]
  },
  {
    role: "الإدارة / management",
    emoji: "🏫",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#c4b5fd",
    can: [
      "رؤية تقارير الحضور والغياب",
      "رؤية نتائج جميع الطلاب",
      "إرسال إعلانات لفئات محددة",
      "رؤية جداول المعلمين والفصول",
      "مراسلة المعلمين وأولياء الأمور",
      "رؤية إحصائيات المدرسة",
    ],
    cannot: [
      "حذف مستخدمين (صلاحية Admin)",
      "تعديل إعدادات النظام",
      "إنشاء اختبارات",
    ]
  },
  {
    role: "المعلم",
    emoji: "📚",
    color: "#0369a1",
    bg: "#f0f9ff",
    border: "#7dd3fc",
    can: [
      "تسجيل حضور طلاب فصوله فقط",
      "إنشاء اختبارات لفصوله فقط",
      "إضافة وتصحيح الواجبات",
      "رؤية درجات طلاب فصوله فقط",
      "مراسلة الإدارة وأولياء أمور طلابه",
      "إدارة المحتوى التعليمي لمواده",
    ],
    cannot: [
      "رؤية بيانات فصول لا يدرّسها",
      "تعديل بيانات معلمين آخرين",
      "تعديل درجات اختبارات معلم آخر",
    ]
  },
  {
    role: "الطالب",
    emoji: "🎒",
    color: "#15803d",
    bg: "#f0fdf4",
    border: "#86efac",
    can: [
      "رؤية جدوله الدراسي الخاص",
      "أداء اختبارات شعبته في وقتها فقط",
      "رؤية درجاته ونتائجه",
      "رؤية واجبات شعبته",
      "رؤية حضوره وغيابه",
      "مراسلة معلميه فقط",
    ],
    cannot: [
      "رؤية اختبارات فصول أخرى",
      "رؤية درجات زملائه",
      "التعديل على إجاباته بعد التسليم",
      "أداء الاختبار خارج وقته",
    ]
  },
  {
    role: "ولي الأمر",
    emoji: "👨‍👩‍👧",
    color: "#b45309",
    bg: "#fffbeb",
    border: "#fcd34d",
    can: [
      "رؤية حضور وغياب أبنائه فقط",
      "رؤية درجات ونتائج أبنائه",
      "رؤية جدول أبنائه الدراسي",
      "رؤية واجبات أبنائه",
      "مراسلة معلمي أبنائه فقط",
      "استقبال إعلانات المدرسة",
    ],
    cannot: [
      "رؤية بيانات طلاب آخرين",
      "التواصل مع طلاب مباشرة",
      "تعديل أي بيانات في النظام",
    ]
  }
];

const missingFeatures = [
  { icon: "📅", title: "السنة الدراسية", desc: "academic_years table — ضروري للأرشفة" },
  { icon: "📬", title: "الإشعارات", desc: "notifications table — لتنبيهات الحضور والدرجات" },
  { icon: "📋", title: "تسليم الواجبات", desc: "assignment_submissions — ملف SQL موجود لكن غير مدمج" },
  { icon: "📊", title: "التقارير", desc: "views/functions للإحصائيات — لا تُحسب من الكود" },
  { icon: "🔔", title: "تنبيه ولي الأمر", desc: "عند غياب الطالب أو انخفاض الدرجات" },
  { icon: "🗓️", title: "الفصل الدراسي", desc: "semester — لتقسيم النتائج بشكل صحيح" },
];

const severityColors = {
  critical: { bg: "#fef2f2", border: "#fca5a5", badge: "#dc2626", label: "حرجة" },
  high: { bg: "#fff7ed", border: "#fdba74", badge: "#ea580c", label: "عالية" },
  medium: { bg: "#fefce8", border: "#fde047", badge: "#ca8a04", label: "متوسطة" },
  low: { bg: "#eff6ff", border: "#93c5fd", badge: "#2563eb", label: "منخفضة" },
};

export default function SchoolAnalysis() {
  const [activeTab, setActiveTab] = useState("problems");
  const [expandedId, setExpandedId] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState("all");

  const filtered = filterSeverity === "all"
    ? problems
    : problems.filter(p => p.severity === filterSeverity);

  const counts = {
    critical: problems.filter(p => p.severity === "critical").length,
    high: problems.filter(p => p.severity === "high").length,
    medium: problems.filter(p => p.severity === "medium").length,
    low: problems.filter(p => p.severity === "low").length,
  };

  return (
    <div dir="rtl" style={{ fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)", padding: "32px 24px", color: "white" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 32 }}>🏫</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>تقرير تدقيق — مدرسة الرفعة النموذجية</h1>
              <p style={{ margin: "4px 0 0", opacity: 0.7, fontSize: 13 }}>refaaschool2026 · تحليل منطق النظام المدرسي</p>
            </div>
          </div>

          {/* Summary counts */}
          <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
            {[
              { label: "مشاكل حرجة", count: counts.critical, color: "#ef4444" },
              { label: "مشاكل عالية", count: counts.high, color: "#f97316" },
              { label: "مشاكل متوسطة", count: counts.medium, color: "#eab308" },
              { label: "مشاكل منخفضة", count: counts.low, color: "#3b82f6" },
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 18px", textAlign: "center", minWidth: 110 }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.count}</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
            <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 18px", textAlign: "center", minWidth: 110 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#a78bfa" }}>{missingFeatures.length}</div>
              <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>ميزات مفقودة</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", gap: 0 }}>
          {[
            { id: "problems", label: "🔍 المشاكل المكتشفة" },
            { id: "roles", label: "👥 منطق الأدوار الصحيح" },
            { id: "missing", label: "➕ ميزات مفقودة" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "14px 20px", border: "none", background: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600, color: activeTab === tab.id ? "#1e3a5f" : "#64748b",
                borderBottom: activeTab === tab.id ? "3px solid #1e3a5f" : "3px solid transparent",
                transition: "all 0.2s", fontFamily: "inherit"
              }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>

        {/* PROBLEMS TAB */}
        {activeTab === "problems" && (
          <div>
            {/* Filter */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#64748b", alignSelf: "center", marginLeft: 4 }}>فلترة:</span>
              {["all", "critical", "high", "medium", "low"].map(s => (
                <button key={s} onClick={() => setFilterSeverity(s)}
                  style={{
                    padding: "6px 14px", borderRadius: 20, border: "1px solid",
                    borderColor: filterSeverity === s ? "#1e3a5f" : "#e2e8f0",
                    background: filterSeverity === s ? "#1e3a5f" : "white",
                    color: filterSeverity === s ? "white" : "#64748b",
                    cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit"
                  }}>
                  {s === "all" ? "الكل" : severityColors[s].label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filtered.map(problem => {
                const sc = severityColors[problem.severity];
                const isOpen = expandedId === problem.id;
                return (
                  <div key={problem.id}
                    style={{ background: "white", borderRadius: 12, border: `1px solid #e2e8f0`, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                    <div onClick={() => setExpandedId(isOpen ? null : problem.id)}
                      style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 12, borderRight: `4px solid ${sc.badge}` }}>
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{problem.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                          <span style={{ background: sc.badge, color: "white", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{sc.label}</span>
                          <span style={{ background: "#f1f5f9", color: "#475569", borderRadius: 6, padding: "2px 8px", fontSize: 11 }}>{problem.category}</span>
                          <span style={{ fontSize: 12, color: "#94a3b8" }}>#{problem.id}</span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#1e293b", lineHeight: 1.4 }}>{problem.title}</div>
                        <div style={{ fontSize: 12, color: "#ef4444", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                          <span>⚡</span> <span>{problem.impact}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: 18, color: "#94a3b8", flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
                    </div>

                    {isOpen && (
                      <div style={{ padding: "0 20px 20px", borderTop: "1px solid #f1f5f9" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
                              ❌ الكود الحالي (المشكلة)
                            </div>
                            <pre style={{
                              background: "#1e1e2e", color: "#cdd6f4", borderRadius: 8, padding: 14,
                              fontSize: 11, overflow: "auto", margin: 0, lineHeight: 1.6,
                              border: "1px solid #ef4444", direction: "ltr", textAlign: "left"
                            }}>{problem.current}</pre>
                          </div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
                              ✅ الكود المقترح (الإصلاح)
                            </div>
                            <pre style={{
                              background: "#1e1e2e", color: "#a6e3a1", borderRadius: 8, padding: 14,
                              fontSize: 11, overflow: "auto", margin: 0, lineHeight: 1.6,
                              border: "1px solid #16a34a", direction: "ltr", textAlign: "left"
                            }}>{problem.fix}</pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ROLES TAB */}
        {activeTab === "roles" && (
          <div>
            <div style={{ background: "white", borderRadius: 12, padding: "16px 20px", marginBottom: 20, border: "1px solid #e2e8f0", borderRight: "4px solid #1e3a5f" }}>
              <div style={{ fontWeight: 700, color: "#1e3a5f", marginBottom: 6 }}>🧠 مبدأ أساسي في المنطق المدرسي</div>
              <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.7 }}>
                كل دور يرى <strong>فقط ما يخصه</strong>. المعلم لا يرى فصولاً غير فصوله، والطالب لا يرى شعباً غير شعبته، وولي الأمر لا يرى سوى أبنائه المسجلين. هذا المبدأ يجب أن ينعكس في كل سياسة RLS.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {architecture.map(role => (
                <div key={role.role} style={{ background: "white", borderRadius: 12, border: `1px solid ${role.border}`, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <div style={{ background: role.bg, padding: "14px 20px", borderBottom: `1px solid ${role.border}`, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 28 }}>{role.emoji}</span>
                    <div style={{ fontWeight: 700, fontSize: 16, color: role.color }}>{role.role}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: 20, gap: 20 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", marginBottom: 10 }}>✅ يمكنه</div>
                      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                        {role.can.map((item, i) => (
                          <li key={i} style={{ fontSize: 13, color: "#374151", padding: "5px 0", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "flex-start", gap: 6 }}>
                            <span style={{ color: "#16a34a", flexShrink: 0, marginTop: 1 }}>•</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", marginBottom: 10 }}>🚫 لا يمكنه</div>
                      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                        {role.cannot.map((item, i) => (
                          <li key={i} style={{ fontSize: 13, color: "#374151", padding: "5px 0", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "flex-start", gap: 6 }}>
                            <span style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }}>×</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* RLS Matrix */}
            <div style={{ marginTop: 24, background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontWeight: 700, fontSize: 14, color: "#1e293b" }}>
                📊 مصفوفة الصلاحيات المقترحة (RLS Matrix)
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#1e3a5f", color: "white" }}>
                      <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600 }}>الجدول</th>
                      {["مدير", "إدارة", "معلم", "طالب", "ولي أمر"].map(r => (
                        <th key={r} style={{ padding: "10px 14px", textAlign: "center", fontWeight: 600 }}>{r}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { table: "users", perms: ["CRUD", "R", "R(self)", "R(self)", "R(self)"] },
                      { table: "students", perms: ["CRUD", "R", "R(section)", "R(self)", "R(children)"] },
                      { table: "teachers", perms: ["CRUD", "R", "R(self)", "R(own)", "R(own)"] },
                      { table: "attendance", perms: ["CRUD", "R", "CRU(section)", "R(self)", "R(children)"] },
                      { table: "exams", perms: ["CRUD", "R", "CRUD(own)", "R(section+time)", "—"] },
                      { table: "grades", perms: ["CRUD", "R", "CRUD(own)", "R(self)", "R(children)"] },
                      { table: "assignments", perms: ["CRUD", "R", "CRUD(own)", "R(section)", "R(children)"] },
                      { table: "messages", perms: ["CRUD", "CRUD", "CRU(rules)", "CRU(rules)", "CRU(rules)"] },
                      { table: "announcements", perms: ["CRUD", "CRU", "R", "R", "R"] },
                    ].map((row, i) => (
                      <tr key={row.table} style={{ background: i % 2 === 0 ? "white" : "#f8fafc" }}>
                        <td style={{ padding: "9px 14px", fontFamily: "monospace", color: "#1e3a5f", fontWeight: 600 }}>{row.table}</td>
                        {row.perms.map((p, j) => (
                          <td key={j} style={{ padding: "9px 14px", textAlign: "center" }}>
                            <span style={{
                              display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                              background: p === "CRUD" ? "#dcfce7" : p === "—" ? "#f1f5f9" : "#fef9c3",
                              color: p === "CRUD" ? "#15803d" : p === "—" ? "#94a3b8" : "#854d0e"
                            }}>{p}</span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: "10px 14px", fontSize: 11, color: "#64748b", borderTop: "1px solid #e2e8f0" }}>
                  CRUD = إنشاء+قراءة+تعديل+حذف | R = قراءة فقط | (section) = فصوله فقط | (self) = بياناته فقط | (children) = أبناؤه فقط | (rules) = بقواعد محددة
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MISSING FEATURES TAB */}
        {activeTab === "missing" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              {missingFeatures.map((f, i) => (
                <div key={i} style={{ background: "white", borderRadius: 12, padding: "18px 20px", border: "1px solid #e2e8f0", display: "flex", gap: 14, alignItems: "flex-start", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <span style={{ fontSize: 28, flexShrink: 0 }}>{f.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", marginBottom: 4 }}>{f.title}</div>
                    <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Priority roadmap */}
            <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontWeight: 700, fontSize: 14 }}>
                🗺️ خارطة طريق الإصلاح المقترحة
              </div>
              <div style={{ padding: 20 }}>
                {[
                  {
                    phase: "المرحلة 1 — حرجة (أسبوع 1)",
                    color: "#dc2626", bg: "#fef2f2",
                    items: [
                      "إصلاح UNIQUE في جدول attendance → (student_id, subject_id, date, period)",
                      "إضافة RLS لولي الأمر على attendance + grades + assignments",
                      "إضافة SELECT policy للطالب على جدول grades",
                      "تقييد الطالب برؤية اختبارات شعبته فقط + التحقق من الوقت",
                      "تقييد المعلم بتسجيل حضور فصوله فقط",
                    ]
                  },
                  {
                    phase: "المرحلة 2 — عالية (أسبوع 2)",
                    color: "#ea580c", bg: "#fff7ed",
                    items: [
                      "إضافة dashboard للـ management + توجيه Middleware",
                      "تقييد الرسائل بقواعد العلاقات (معلم↔طالب فصله فقط)",
                      "استبدال getSession() بـ getUser() في middleware",
                      "إضافة SELECT policy للطالب على assignments",
                      "التحقق من max_attempts في RLS الاختبارات",
                    ]
                  },
                  {
                    phase: "المرحلة 3 — تحسين (أسبوع 3-4)",
                    color: "#ca8a04", bg: "#fefce8",
                    items: [
                      "إنشاء جدول academic_years وربطه بكل الجداول",
                      "نقل الدور إلى JWT custom claims (Supabase Hook)",
                      "دمج assignment_submissions_schema.sql",
                      "إنشاء جدول notifications",
                      "إضافة مفهوم الفصل الدراسي (semester)",
                    ]
                  },
                  {
                    phase: "المرحلة 4 — تنظيف (أسبوع 4)",
                    color: "#2563eb", bg: "#eff6ff",
                    items: [
                      "حذف firebase-tools و@google/genai من package.json",
                      "فصل ENUM user_role عن announcement_target",
                      "توحيد ملفات SQL المتفرقة في migration واحد منظّم",
                      "إنشاء database functions للإحصائيات والتقارير",
                    ]
                  },
                ].map(phase => (
                  <div key={phase.phase} style={{ marginBottom: 16, background: phase.bg, borderRadius: 10, padding: "14px 18px", border: `1px solid ${phase.color}30` }}>
                    <div style={{ fontWeight: 700, color: phase.color, marginBottom: 10, fontSize: 14 }}>{phase.phase}</div>
                    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                      {phase.items.map((item, i) => (
                        <li key={i} style={{ fontSize: 13, color: "#374151", padding: "4px 0", display: "flex", alignItems: "flex-start", gap: 8 }}>
                          <span style={{ color: phase.color, flexShrink: 0 }}>→</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}