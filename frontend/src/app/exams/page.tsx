import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/app/dashboard/logout-button";
import { authOptions } from "@/lib/auth";
import { backendGet, backendPatch } from "@/lib/backend";
import type { ExamListItem } from "./types";

function formatDate(value: string | null) {
  if (!value) {
    return "Sin publicar";
  }

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function publishExam(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);

  if (!session || session.user.rol !== "PROFESOR") {
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

  const data = await backendGet<{ exams: ExamListItem[] }>("/api/exams", session);
  const isProfessor = session.user.rol === "PROFESOR";

  return (
    <main className="page">
      <div className="shell dashboard">
        <header className="topbar">
          <div className="brand">
            <strong>Examenes</strong>
            <span className="muted">{session.user.email}</span>
          </div>
          <div className="toolbar">
            {isProfessor ? (
              <Link className="button" href="/exams/create">
                Nuevo examen
              </Link>
            ) : null}
            <LogoutButton />
          </div>
        </header>

        <section className="panel hero">
          <span className="badge">{session.user.rol}</span>
          <h1>Evaluaciones</h1>
          <p className="muted">
            {isProfessor
              ? "Crea, publica y revisa evaluaciones de tus cursos."
              : "Rinde las evaluaciones publicadas de tus cursos."}
          </p>
        </section>

        {data.exams.length === 0 ? (
          <section className="panel empty-state">
            <strong>No hay examenes disponibles.</strong>
            <p className="muted">Cuando exista una evaluacion para tu rol, aparecera aqui.</p>
          </section>
        ) : (
          <section className="grid" aria-label="Examenes disponibles">
            {data.exams.map((exam) => (
              <article className="panel module-card exam-card" key={exam.id}>
                <div>
                  <span className="badge">{exam.publicadoEn ? "Publicado" : "Borrador"}</span>
                  <h2>{exam.titulo}</h2>
                  <p>{exam.descripcion ?? "Sin descripcion"}</p>
                  <dl className="meta-list">
                    <div>
                      <dt>Curso</dt>
                      <dd>{exam.curso.nombre}</dd>
                    </div>
                    <div>
                      <dt>Duracion</dt>
                      <dd>{exam.duracionMinutos} min</dd>
                    </div>
                    <div>
                      <dt>Preguntas</dt>
                      <dd>{exam._count.preguntas}</dd>
                    </div>
                    <div>
                      <dt>Publicado</dt>
                      <dd>{formatDate(exam.publicadoEn)}</dd>
                    </div>
                  </dl>
                </div>

                <div className="card-actions">
                  <Link className="button secondary" href={`/exams/${exam.id}`}>
                    Abrir
                  </Link>
                  {exam._count.envios > 0 || session.user.rol !== "ESTUDIANTE" ? (
                    <Link className="button secondary" href={`/exams/${exam.id}/results`}>
                      Resultados
                    </Link>
                  ) : null}
                  {isProfessor && !exam.publicadoEn ? (
                    <form action={publishExam}>
                      <input name="examId" type="hidden" value={exam.id} />
                      <button className="button" type="submit">
                        Publicar
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
