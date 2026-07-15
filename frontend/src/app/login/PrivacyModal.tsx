"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function PrivacyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Política de privacidad"
      onClick={onClose}
    >
      <div className="modal pop-in privacy" onClick={(e) => e.stopPropagation()}>
        <header className="privacy__head">
          <h2 className="h3">Política de Privacidad</h2>
          <button
            className="btn btn--ghost btn--sm"
            onClick={onClose}
            aria-label="Cerrar"
            type="button"
          >
            <X />
          </button>
        </header>

        <div className="privacy__body">
          <p><strong>Responsable del tratamiento:</strong> Seminario Teológico de Remanentes (PeRTS).</p>

          <p><strong>1. Datos que tratamos.</strong> Recopilamos los datos necesarios para la
          gestión académica: nombre y apellidos, correo electrónico, DNI, teléfono, los cursos
          en los que participa, calificaciones, asistencia y materiales.</p>

          <p><strong>2. Finalidad.</strong> Los datos se usan únicamente para administrar el acceso
          a la intranet, gestionar cursos, exámenes, materiales y calificaciones, y comunicar
          información académica.</p>

          <p><strong>3. Base legal y consentimiento.</strong> El tratamiento se realiza conforme a
          la Ley N° 29733, Ley de Protección de Datos Personales del Perú, y su reglamento
          (D.S. N° 003-2013-JUS). En el caso de menores de edad, el tratamiento requiere el
          consentimiento del padre, madre o tutor, recabado al momento de la inscripción.</p>

          <p><strong>4. Conservación.</strong> Los datos se conservan mientras la persona mantenga
          vínculo académico con la institución y por el plazo que exija la normativa aplicable;
          luego se eliminan o anonimizan.</p>

          <p><strong>5. Acceso y seguridad.</strong> Solo el personal autorizado accede a los datos
          según su rol. Las contraseñas se almacenan cifradas; el acceso se realiza mediante
          conexión segura (HTTPS).</p>

          <p><strong>6. Cambios.</strong> Esta política puede actualizarse; la versión vigente
          estará siempre disponible en esta misma ventana.</p>

          <p className="privacy__updated">Última actualización: julio 2026.</p>
        </div>
      </div>
    </div>
  );
}
