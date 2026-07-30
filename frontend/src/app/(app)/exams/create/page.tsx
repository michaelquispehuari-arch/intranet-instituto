import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { backendGet } from "@/lib/backend";
import type { CourseOption } from "../types";
import { CreateExamPageContent } from "./create-exam-page-content";

export default async function CreateExamPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (!["ADMIN", "PROFESOR"].includes(session.user.rol)) {
    redirect("/dashboard");
  }

  const data = await backendGet<{ courses: CourseOption[] }>("/api/courses", session);

  return <CreateExamPageContent role={session.user.rol} courses={data.courses} />;
}
