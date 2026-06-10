import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/app/dashboard/logout-button";
import { authOptions } from "@/lib/auth";
import { backendGet } from "@/lib/backend";
import type { CourseOption } from "../types";
import { CreateExamForm } from "./create-exam-form";

export default async function CreateExamPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.rol !== "PROFESOR") {
    redirect("/dashboard");
  }

  const data = await backendGet<{ courses: CourseOption[] }>("/api/courses", session);

  return (
    <main className="page">
      <div className="shell dashboard">
        <header className="topbar">
          <div className="brand">
            <strong>Crear examen</strong>
            <span className="muted">{session.user.email}</span>
          </div>
          <LogoutButton />
        </header>

        <section className="panel hero">
          <span className="badge">PROFESOR</span>
          <h1>Nueva evaluacion</h1>
          <p className="muted">El backend validara curso, preguntas y respuesta correcta antes de guardar.</p>
        </section>

        <CreateExamForm courses={data.courses} />
      </div>
    </main>
  );
}
