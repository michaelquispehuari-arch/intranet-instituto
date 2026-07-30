import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { backendGet } from "@/lib/backend";
import type { ExamResults } from "../../types";
import { ResultsContent } from "./results-content";

type ExamResultsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ studentId?: string }>;
};

export default async function ExamResultsPage({ params, searchParams }: ExamResultsPageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const { studentId } = await searchParams;
  const role = session.user.rol;

  let data: ExamResults | null = null;
  let beforeCloseAt: string | null = null;
  let notAvailable = false;

  try {
    data = await backendGet<ExamResults>(`/api/exams/${id}/results`, session);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    const match = msg.match(/BEFORE_CLOSE:(.+)/);
    if (match) beforeCloseAt = match[1];
    if (msg.includes("RESULTS_NOT_AVAILABLE")) notAvailable = true;
    data = null;
  }

  return (
    <ResultsContent
      examId={id}
      role={role}
      studentId={studentId}
      notAvailable={notAvailable}
      beforeCloseAt={beforeCloseAt}
      data={data}
    />
  );
}
