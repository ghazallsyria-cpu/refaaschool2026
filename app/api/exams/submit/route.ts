import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // التحقق من هوية المستخدم
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attemptId, examId, answers } = await req.json();

    if (!attemptId || !examId || !answers) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // التحقق أن المحاولة تخص هذا الطالب
    const { data: attempt, error: attemptError } = await supabase
      .from("exam_attempts")
      .select("id, student_id, status")
      .eq("id", attemptId)
      .eq("exam_id", examId)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.student_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (attempt.status === "completed" || attempt.status === "graded") {
      return NextResponse.json({ error: "Attempt already completed" }, { status: 400 });
    }

    // جلب أسئلة الاختبار مع الإجابات الصحيحة من السيرفر
    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select("id, type, points, options:question_options(id, is_correct)")
      .eq("exam_id", examId);

    if (questionsError || !questions) {
      return NextResponse.json({ error: "Questions not found" }, { status: 404 });
    }

    // حساب الدرجة على السيرفر
    let totalScore = 0;
    const studentAnswersPayload: any[] = [];
    let hasEssay = false;

    for (const q of questions) {
      const studentAnswer = answers[q.id];
      let isCorrect = false;
      let pointsEarned = 0;

      if (q.type === "multiple_choice" || q.type === "true_false") {
        const correctOpt = (q.options as any[]).find((o) => o.is_correct);
        isCorrect = studentAnswer === correctOpt?.id;
        pointsEarned = isCorrect ? q.points : 0;
      } else if (q.type === "multi_select") {
        const correctOpts = (q.options as any[])
          .filter((o) => o.is_correct)
          .map((o) => o.id);
        const studentOpts: string[] = studentAnswer || [];
        isCorrect =
          correctOpts.length === studentOpts.length &&
          correctOpts.every((id) => studentOpts.includes(id));
        pointsEarned = isCorrect ? q.points : 0;
      } else if (q.type === "essay" || q.type === "fill_in_blank") {
        // الأسئلة المقالية تحتاج تصحيح يدوي
        hasEssay = true;
        pointsEarned = 0;
      }

      totalScore += pointsEarned;

      studentAnswersPayload.push({
        attempt_id: attemptId,
        question_id: q.id,
        selected_option_id:
          q.type === "multiple_choice" || q.type === "true_false"
            ? studentAnswer || null
            : null,
        text_answer:
          q.type === "essay" || q.type === "fill_in_blank"
            ? studentAnswer || null
            : null,
        is_correct: isCorrect,
        points_earned: pointsEarned,
      });
    }

    // تحديث المحاولة
    await supabase
      .from("exam_attempts")
      .update({
        completed_at: new Date().toISOString(),
        score: totalScore,
        status: hasEssay ? "completed" : "completed",
      })
      .eq("id", attemptId);

    // حفظ إجابات الطالب
    if (studentAnswersPayload.length > 0) {
      await supabase.from("student_answers").insert(studentAnswersPayload);
    }

    // إشعار المعلم
    const { data: examInfo } = await supabase
      .from("exams")
      .select("title, teacher_id")
      .eq("id", examId)
      .single();

    const { data: studentData } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", user.id)
      .single();

    if (examInfo?.teacher_id) {
      await supabase.from("notifications").insert([{
        user_id: examInfo.teacher_id,
        type: "exam",
        title: "تسليم اختبار جديد",
        content: `قام الطالب ${studentData?.full_name || "طالب"} بتسليم اختبار: ${examInfo.title}`,
        link: `/exams/results/${examId}`,
        is_read: false,
      }]);
    }

    return NextResponse.json({
      success: true,
      score: totalScore,
      hasEssay,
    });

  } catch (error: any) {
    console.error("Error in score calculation:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
