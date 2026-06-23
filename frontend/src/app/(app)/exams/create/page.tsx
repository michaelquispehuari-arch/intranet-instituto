import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { backendGet } from "@/lib/backend";
import type { CourseOption } from "../types";
import { CreateExamForm } from "./create-exam-form";

export default async function CreateExamPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (!["ADMIN", "PROFESOR"].includes(session.user.rol)) {
    redirect("/dashboard");
  }

  const data = await backendGet<{ courses: CourseOption[] }>("/api/courses", session);

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Link href="/exams" style={{ fontSize: 13, color: "var(--texto-tenue)" }}>
          ← Exámenes
        </Link>
      </div>
      <div className="page-header">
        <span className="page-eyebrow">{session.user.rol}</span>
        <h1 className="page-title">Nueva evaluacion</h1>
        <p className="page-subtitle">El backend validara curso, preguntas y respuesta correcta antes de guardar.</p>
      </div>

      <CreateExamForm courses={data.courses} />
    </div>
  );
}
