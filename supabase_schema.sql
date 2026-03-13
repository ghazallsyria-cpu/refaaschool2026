-- Supabase Schema for مدرسة الرفعة النموذجية

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'management', 'teacher', 'student', 'parent');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');

-- 1. Users Table (Extends auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Classes Table (الصفوف الدراسية)
CREATE TABLE public.classes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL, -- e.g., الصف الأول الإعدادي
    level INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Sections Table (الشعب)
CREATE TABLE public.sections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL, -- e.g., أ, ب, ج or 1, 2, 3
    capacity INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Subjects Table (المواد الدراسية)
CREATE TABLE public.subjects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL, -- e.g., رياضيات, لغة عربية
    code TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Parents Table (أولياء الأمور)
CREATE TABLE public.parents (
    id UUID REFERENCES public.users(id) PRIMARY KEY,
    national_id TEXT UNIQUE,
    address TEXT,
    job_title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Students Table (الطلاب)
CREATE TABLE public.students (
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

-- 7. Teachers Table (المعلمين)
CREATE TABLE public.teachers (
    id UUID REFERENCES public.users(id) PRIMARY KEY,
    national_id TEXT UNIQUE NOT NULL,
    specialization TEXT,
    hire_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. Teacher Subjects (ربط المعلم بالمواد)
CREATE TABLE public.teacher_subjects (
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    PRIMARY KEY (teacher_id, subject_id)
);

-- 9. Teacher Sections (ربط المعلم بالفصول)
CREATE TABLE public.teacher_sections (
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
    section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    PRIMARY KEY (teacher_id, section_id, subject_id)
);

-- 10. Attendance Table (الحضور والغياب)
CREATE TABLE public.attendance (
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

-- 11. Exams Table (الاختبارات)
CREATE TABLE public.exams (
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

-- 12. Grades Table (الدرجات)
CREATE TABLE public.grades (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    score NUMERIC NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(exam_id, student_id)
);

-- 13. Assignments Table (الواجبات)
CREATE TABLE public.assignments (
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

-- 14. Schedules Table (الجدول الدراسي)
CREATE TABLE public.schedules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday, etc.
    period INTEGER NOT NULL, -- 1st period, 2nd period, etc.
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(section_id, day_of_week, period),
    UNIQUE(teacher_id, day_of_week, period)
);

-- 15. Announcements Table (الإعلانات)
CREATE TABLE public.announcements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    target_role user_role, -- If null, visible to all
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 16. Messages Table (الرسائل)
CREATE TABLE public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 17. Documents Table (المستندات)
CREATE TABLE public.documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    document_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS POLICIES (Row Level Security)
-- Enable RLS on all tables
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

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Example Policies (Simplified for demonstration)
-- Users: Can read their own data, Admins can read all
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.users FOR SELECT USING (public.get_user_role() IN ('admin', 'management'));

-- Students: Admins/Management can do all, Teachers can view, Students can view own, Parents can view their children
CREATE POLICY "Admins manage students" ON public.students FOR ALL USING (public.get_user_role() IN ('admin', 'management'));
CREATE POLICY "Teachers view students" ON public.students FOR SELECT USING (public.get_user_role() = 'teacher');
CREATE POLICY "Students view own" ON public.students FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Parents view children" ON public.students FOR SELECT USING (parent_id = auth.uid());

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_modtime BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_students_modtime BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_teachers_modtime BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
-- (Add triggers for other tables as needed)
