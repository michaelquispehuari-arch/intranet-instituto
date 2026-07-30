import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { BackendRequestError, backendGet } from "@/lib/backend";
import type { ExamDetail } from "../types";
import { ExamDetailContent } from "./exam-detail-content";

type ExamPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ExamPage({ params }: ExamPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  let exam: ExamDetail | null = null;
  let loadError: { message: string; isForbidden: boolean } | null = null;
  try {
    const data = await backendGet<{ exam: ExamDetail }>(`/api/exams/${id}`, session);
    exam = data.exam;
  } catch (error) {
    const isForbidden = error instanceof BackendRequestError && error.statusCode === 403;
    loadError = {
      isForbidden,
      message: error instanceof Error ? error.message : "",
    };
  }

  const canTakeExam = session.user.rol === "ESTUDIANTE";

  return <ExamDetailContent exam={exam} loadError={loadError} canTakeExam={canTakeExam} />;
}
