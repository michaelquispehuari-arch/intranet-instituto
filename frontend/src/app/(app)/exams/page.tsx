import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { BackendRequestError, backendGet, backendPatch } from "@/lib/backend";
import type { ExamListItem } from "./types";
import { ExamsContent } from "./exams-content";

async function publishExam(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);

  if (!session || !["ADMIN", "PROFESOR"].includes(session.user.rol)) {
    redirect("/login");
  }

  const examId = String(formData.get("examId") ?? "");
  await backendPatch(`/api/exams/${examId}/publish`, session, {});
  redirect("/exams");
}

export default async function ExamsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  let exams: ExamListItem[] | null = null;
  let loadError: string | null = null;
  try {
    const data = await backendGet<{ exams: ExamListItem[] }>("/api/exams", session);
    exams = data.exams;
  } catch (err) {
    if (err instanceof BackendRequestError && err.statusCode === 401) redirect("/login");
    loadError = err instanceof Error ? err.message : "";
  }

  const canManageExams = session.user.rol === "PROFESOR" || session.user.rol === "ADMIN";

  return (
    <ExamsContent
      role={session.user.rol}
      canManageExams={canManageExams}
      exams={exams}
      loadError={loadError}
      publishExam={publishExam}
    />
  );
}
