import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="page">
      <section className="shell stack legal-page">
        <div className="panel hero">
          <h1>Politica de privacidad</h1>
          <p className="muted">
            Esta intranet trata datos academicos y personales bajo la Ley N 29733.
          </p>
        </div>

        <article className="panel legal-content">
          <h2>Datos tratados</h2>
          <p>
            El sistema puede registrar nombres, apellidos, correos institucionales,
            roles, cursos, inscripciones, materiales, examenes, notas y asistencia.
          </p>

          <h2>Finalidad</h2>
          <p>
            Los datos se usan para gestionar acceso, clases, evaluaciones, materiales
            educativos, calificaciones, asistencia y soporte administrativo del instituto.
          </p>

          <h2>Acceso</h2>
          <p>
            Los administradores gestionan usuarios y configuracion. Los profesores
            acceden a informacion de sus cursos. Los estudiantes acceden a sus propios
            materiales, examenes, notas y asistencia.
          </p>

          <h2>Seguridad</h2>
          <p>
            Las contrasenas se almacenan como hash con bcrypt. Los permisos se validan
            en el backend y los archivos privados se entregan mediante enlaces temporales.
          </p>

          <h2>Menores de edad</h2>
          <p>
            Cuando corresponda, el instituto debe documentar el consentimiento del padre,
            madre o tutor antes de registrar datos personales de estudiantes menores.
          </p>

          <h2>Conservacion</h2>
          <p>
            Los datos se conservan durante la relacion academica y el tiempo necesario
            para cumplir obligaciones administrativas, legales o historicas del instituto.
          </p>
        </article>

        <Link className="button secondary legal-back-link" href="/login">
          Volver al login
        </Link>
      </section>
    </main>
  );
}
