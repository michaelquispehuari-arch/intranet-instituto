import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/app/dashboard/logout-button";
import { authOptions } from "@/lib/auth";
import { backendGet } from "@/lib/backend";
import type { CourseOption } from "../types";
import { UploadContentForm } from "./upload-content-form";

export default async function UploadContentPage() {
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
            <strong>Subir material</strong>
            <span className="muted">{session.user.email}</span>
          </div>
          <LogoutButton />
        </header>

        <section className="panel hero">
          <span className="badge">PROFESOR</span>
          <h1>Nuevo archivo</h1>
          <p className="muted">PDF, videos, audios, documentos Office e imagenes permitidas.</p>
        </section>

        <UploadContentForm courses={data.courses} />
      </div>
    </main>
  );
}
