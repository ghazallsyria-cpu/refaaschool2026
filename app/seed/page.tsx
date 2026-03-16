'use client';

import { useState, useEffect } from 'react';
import { schoolData } from '@/lib/seed-data';
import { Copy, Check } from 'lucide-react';

export default function SeedPage() {
  const [sql, setSql] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const generateUUID = () => {
      return crypto.randomUUID();
    };

    const generateData = () => {
      let seed = 123;
      const deterministicRandom = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
      };

      let generatedSql = `-- سكربت إعداد قاعدة البيانات وإدخال بيانات المعلمين والمواد والفصول لمدرسة الرفعة النموذجية\n\n`;

      // 0. Create Tables if they don't exist
      generatedSql += `-- 0. إنشاء الجداول الأساسية إذا لم تكن موجودة\n`;
      generatedSql += `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'management', 'teacher', 'student', 'parent', 'all');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status') THEN
        CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
    END IF;
END
$$;

-- Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Classes Table
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    level INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Sections Table
CREATE TABLE IF NOT EXISTS public.sections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    capacity INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Parents Table
CREATE TABLE IF NOT EXISTS public.parents (
    id UUID REFERENCES public.users(id) PRIMARY KEY,
    national_id TEXT UNIQUE,
    address TEXT,
    job_title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Students Table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID REFERENCES public.users(id) PRIMARY KEY,
    national_id TEXT UNIQUE NOT NULL,
    parent_id UUID REFERENCES public.parents(id) ON DELETE SET NULL,
    section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female')),
    address TEXT,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Teachers Table
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID REFERENCES public.users(id) PRIMARY KEY,
    national_id TEXT UNIQUE NOT NULL,
    specialization TEXT,
    hire_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Teacher Subjects
CREATE TABLE IF NOT EXISTS public.teacher_subjects (
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    PRIMARY KEY (teacher_id, subject_id)
);

-- Teacher Sections
CREATE TABLE IF NOT EXISTS public.teacher_sections (
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
    section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    PRIMARY KEY (teacher_id, section_id, subject_id)
);

-- Attendance Table
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    status attendance_status NOT NULL,
    notes TEXT,
    recorded_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(student_id, date)
);

-- Exams Table
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
    exam_date DATE NOT NULL,
    max_score NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Grades Table
CREATE TABLE IF NOT EXISTS public.grades (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    score NUMERIC NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(exam_id, student_id)
);

-- Assignments Table
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Schedules Table
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    period INTEGER NOT NULL,
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(section_id, day_of_week, period),
    UNIQUE(teacher_id, day_of_week, period)
);

-- Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    target_role user_role,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Documents Table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    document_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Allow all for demo purposes, restrict in production)
DO $$
BEGIN
    -- Drop existing policies if they exist to avoid errors
    DROP POLICY IF EXISTS "Allow all on users" ON public.users;
    DROP POLICY IF EXISTS "Allow all on classes" ON public.classes;
    DROP POLICY IF EXISTS "Allow all on sections" ON public.sections;
    DROP POLICY IF EXISTS "Allow all on subjects" ON public.subjects;
    DROP POLICY IF EXISTS "Allow all on parents" ON public.parents;
    DROP POLICY IF EXISTS "Allow all on students" ON public.students;
    DROP POLICY IF EXISTS "Allow all on teachers" ON public.teachers;
    DROP POLICY IF EXISTS "Allow all on teacher_subjects" ON public.teacher_subjects;
    DROP POLICY IF EXISTS "Allow all on teacher_sections" ON public.teacher_sections;
    DROP POLICY IF EXISTS "Allow all on attendance" ON public.attendance;
    DROP POLICY IF EXISTS "Allow all on exams" ON public.exams;
    DROP POLICY IF EXISTS "Allow all on grades" ON public.grades;
    DROP POLICY IF EXISTS "Allow all on assignments" ON public.assignments;
    DROP POLICY IF EXISTS "Allow all on schedules" ON public.schedules;
    DROP POLICY IF EXISTS "Allow all on announcements" ON public.announcements;
    DROP POLICY IF EXISTS "Allow all on messages" ON public.messages;
    DROP POLICY IF EXISTS "Allow all on documents" ON public.documents;
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if policies don't exist
END
$$;

CREATE POLICY "Allow all on users" ON public.users FOR ALL USING (true);
CREATE POLICY "Allow all on classes" ON public.classes FOR ALL USING (true);
CREATE POLICY "Allow all on sections" ON public.sections FOR ALL USING (true);
CREATE POLICY "Allow all on subjects" ON public.subjects FOR ALL USING (true);
CREATE POLICY "Allow all on parents" ON public.parents FOR ALL USING (true);
CREATE POLICY "Allow all on students" ON public.students FOR ALL USING (true);
CREATE POLICY "Allow all on teachers" ON public.teachers FOR ALL USING (true);
CREATE POLICY "Allow all on teacher_subjects" ON public.teacher_subjects FOR ALL USING (true);
CREATE POLICY "Allow all on teacher_sections" ON public.teacher_sections FOR ALL USING (true);
CREATE POLICY "Allow all on attendance" ON public.attendance FOR ALL USING (true);
CREATE POLICY "Allow all on exams" ON public.exams FOR ALL USING (true);
CREATE POLICY "Allow all on grades" ON public.grades FOR ALL USING (true);
CREATE POLICY "Allow all on assignments" ON public.assignments FOR ALL USING (true);
CREATE POLICY "Allow all on schedules" ON public.schedules FOR ALL USING (true);
CREATE POLICY "Allow all on announcements" ON public.announcements FOR ALL USING (true);
CREATE POLICY "Allow all on messages" ON public.messages FOR ALL USING (true);
CREATE POLICY "Allow all on documents" ON public.documents FOR ALL USING (true);

`;

      // 1. Subjects
      const subjects = new Set<string>();
      schoolData.forEach(t => t.subjects.forEach(s => subjects.add(s)));

      const subjectMap: Record<string, string> = {};
      generatedSql += `-- 1. إضافة المواد الدراسية\n`;
      Array.from(subjects).forEach(sub => {
        const id = generateUUID();
        subjectMap[sub] = id;
        generatedSql += `INSERT INTO public.subjects (id, name, code) VALUES ('${id}', '${sub}', 'SUB_${Math.floor(deterministicRandom()*1000)}');\n`;
      });
      generatedSql += `\n`;

      // 2. Classes and Sections
      const classMap: Record<string, string> = {}; 
      const sectionMap: Record<string, string> = {}; 

      const classNames: Record<string, string> = {
        6: "الصف السادس",
        7: "الصف السابع",
        8: "الصف الثامن",
        9: "الصف التاسع",
        10: "الصف العاشر",
        11: "الصف الحادي عشر",
        12: "الصف الثاني عشر"
      };

      generatedSql += `-- 2. إضافة الصفوف الدراسية\n`;
      Object.keys(classNames).forEach(level => {
        const id = generateUUID();
        classMap[level] = id;
        generatedSql += `INSERT INTO public.classes (id, name, level) VALUES ('${id}', '${classNames[level]}', ${level});\n`;
      });
      generatedSql += `\n`;

      generatedSql += `-- 3. إضافة الشعب\n`;
      const uniqueSections = new Set<string>();
      schoolData.forEach(t => t.classes.forEach(c => uniqueSections.add(c)));

      Array.from(uniqueSections).forEach(sec => {
        let level = 10;
        if (sec.includes('م')) {
          level = parseInt(sec.split('م')[0]);
        } else {
          const parts = sec.split('-');
          if (parts.length > 1) {
            if (['10', '11', '12'].includes(parts[1].replace('د', ''))) {
              level = parseInt(parts[1].replace('د', ''));
            } else if (['10', '11', '12'].includes(parts[0])) {
              level = parseInt(parts[0]);
            }
          }
        }
        
        if (!classMap[level]) {
          level = 10; // Fallback
        }

        const id = generateUUID();
        sectionMap[sec] = id;
        generatedSql += `INSERT INTO public.sections (id, class_id, name) VALUES ('${id}', '${classMap[level]}', '${sec}');\n`;
      });
      generatedSql += `\n`;

      // 3. Teachers
      generatedSql += `-- 4. إضافة المعلمين وربطهم بالمواد والفصول\n`;
      schoolData.forEach((t, i) => {
        const userId = generateUUID();
        const email = `teacher${i+1}@alrefaa.edu`;
        
        generatedSql += `-- المعلم: ${t.name}\n`;
        // Insert into auth.users
        generatedSql += `INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) 
VALUES ('${userId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '${email}', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"${t.name}"}', now(), now());\n`;

        generatedSql += `INSERT INTO public.users (id, email, full_name, role) VALUES ('${userId}', '${email}', '${t.name}', 'teacher');\n`;
        
        const nationalId = `2${Math.floor(deterministicRandom() * 90000000000) + 10000000000}`;
        generatedSql += `INSERT INTO public.teachers (id, national_id, specialization) VALUES ('${userId}', '${nationalId}', '${t.subjects.join(', ')}');\n`;

        // Teacher Subjects
        t.subjects.forEach(sub => {
          generatedSql += `INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('${userId}', '${subjectMap[sub]}');\n`;
        });

        // Teacher Sections
        t.classes.forEach(cls => {
          t.subjects.forEach(sub => {
            generatedSql += `INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('${userId}', '${sectionMap[cls]}', '${subjectMap[sub]}');\n`;
          });
        });
        
        generatedSql += `\n`;
      });

      return generatedSql;
    };

    const timer = setTimeout(() => {
      setSql(generateData());
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">استيراد بيانات الجدول الدراسي</h1>
          <p className="text-slate-500">قم بنسخ الكود التالي وتشغيله في Supabase SQL Editor لإضافة جميع المعلمين، المواد، والفصول.</p>
        </div>
        <a 
          href="/seed-students" 
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          الانتقال إلى استيراد الطلاب
        </a>
      </div>

      <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col h-[70vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-medium text-slate-700">SQL Script</h3>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-100"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'تم النسخ!' : 'نسخ الكود'}
          </button>
        </div>
        <div className="flex-1 p-4 bg-slate-950 overflow-auto">
          <pre className="text-sm text-emerald-400 font-mono whitespace-pre-wrap" dir="ltr">
            {sql}
          </pre>
        </div>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
        <h4 className="text-blue-800 font-semibold mb-2">تعليمات الاستخدام:</h4>
        <ol className="list-decimal list-inside text-blue-700 space-y-1 text-sm">
          <li>انسخ الكود أعلاه بالضغط على زر &quot;نسخ الكود&quot;.</li>
          <li>اذهب إلى لوحة تحكم Supabase الخاصة بك.</li>
          <li>اختر <strong>SQL Editor</strong> من القائمة الجانبية.</li>
          <li>قم بإنشاء استعلام جديد (New Query) والصق الكود فيه.</li>
          <li>اضغط على <strong>Run</strong> لتنفيذ الكود.</li>
          <li>بعد الانتهاء، ستجد أن جميع المعلمين (72 معلم) والمواد والفصول قد تمت إضافتها بنجاح.</li>
        </ol>
      </div>
    </div>
  );
}
