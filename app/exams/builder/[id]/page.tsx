'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Save, Eye, Settings, Trash2, 
  Copy, GripVertical, Image as ImageIcon, 
  Video, FileText, ChevronDown, Check,
  X, HelpCircle, AlertCircle, ArrowRight,
  MoreVertical, Type, List, CheckSquare,
  AlignLeft, Hash, Link as LinkIcon, Clock, CheckCircle
} from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'motion/react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import * as Switch from '@radix-ui/react-switch';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

type QuestionType = 'multiple_choice' | 'true_false' | 'multi_select' | 'essay' | 'fill_in_blank' | 'matching' | 'ordering';

type Option = {
  id: string;
  content: string;
  is_correct: boolean;
};

type Question = {
  id: string;
  type: QuestionType;
  content: string;
  points: number;
  explanation?: string;
  options: Option[];
  media_url?: string;
  media_type?: 'image' | 'video' | 'pdf';
};

type ExamData = {
  id?: string;
  title: string;
  description: string;
  subject_id: string;
  section_id?: string;
  teacher_id?: string;
  duration: number;
  max_attempts: number;
  status: 'draft' | 'published';
  settings: {
    shuffle_questions: boolean;
    shuffle_options: boolean;
    show_result_immediately: boolean;
    allow_backtracking: boolean;
  };
};

export default function QuizBuilder() {
  const params = useParams();
  const router = useRouter();
  const isNew = params.id === 'new';
  
  const [exam, setExam] = useState<ExamData>({
    title: '',
    description: '',
    subject_id: '',
    duration: 30,
    max_attempts: 1,
    status: 'draft',
    settings: {
      shuffle_questions: false,
      shuffle_options: false,
      show_result_immediately: true,
      allow_backtracking: true
    }
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState<{id: string, name: string}[]>([]);
  const [sections, setSections] = useState<{id: string, name: string}[]>([]);
  const [teachers, setTeachers] = useState<{id: string, full_name: string}[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchInitialData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: teacherSectionsData } = await supabase
      .from('teacher_sections')
      .select(`
        section:sections(id, name, classes(name)),
        subject:subjects(id, name)
      `)
      .eq('teacher_id', user.id);

    const uniqueSections = Array.from(new Set((teacherSectionsData || []).map(ts => {
      const section = Array.isArray(ts.section) ? ts.section[0] : ts.section;
      return section?.id;
    }))).map(id => {
      const ts = teacherSectionsData?.find(item => {
        const section = Array.isArray(item.section) ? item.section[0] : item.section;
        return section?.id === id;
      });

      const section = Array.isArray(ts?.section) ? ts?.section[0] : ts?.section;
      if (!section) return null;

      // ✅ FIX هنا فقط
      const classes = (section as any).classes;

      const className = Array.isArray(classes) 
        ? classes[0]?.name 
        : classes?.name;

      return {
        id: section.id,
        name: className ? `${className} - ${section.name}` : section.name
      };
    }).filter(Boolean);

    setSections(uniqueSections as any);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      Builder Ready ✅
    </div>
  );
}