export type ExamListItem = {
  id: string;
  titulo: string;
  descripcion: string | null;
  cursoId: string;
  duracionMinutos: number;
  publicadoEn: string | null;
  disponibleDesde: string | null;
  disponibleHasta: string | null;
  activo: boolean;
  creadoEn: string;
  curso: {
    id: string;
    nombre: string;
    profesorId: string;
    profesor: {
      id: string;
      nombre: string;
      apellido: string;
      email: string;
    };
  };
  _count: {
    preguntas: number;
    envios: number;
  };
};

export type CourseOption = {
  id: string;
  nombre: string;
  ciclo: number;
  anio: number;
  activo: boolean;
};

export type ExamDetail = {
  id: string;
  titulo: string;
  descripcion: string | null;
  duracionMinutos: number;
  publicadoEn: string | null;
  intento?: {
    iniciadoEn: string;
    completado: boolean;
  };
  tiempoRestanteSegundos?: number;
  curso: {
    id: string;
    nombre: string;
  };
  preguntas: Array<{
    id: string;
    texto: string;
    tipo: "OPCION_MULTIPLE" | "VERDADERO_FALSO" | "ABIERTA";
    opciones: string[];
    respuestaCorrecta?: string;
    puntaje: number;
    orden: number;
  }>;
};

export type ExamResults = {
  exam: {
    id: string;
    titulo: string;
    descripcion: string | null;
    duracionMinutos: number;
    curso: {
      id: string;
      nombre: string;
    };
  };
  submissions: Array<{
    id: string;
    enviadoEn: string | null;
    puntajeTotal: number | null;
    estudiante: {
      id: string;
      nombre: string;
      apellido: string;
      email: string;
    };
    respuestas: Array<{
      id: string;
      respuesta: string;
      esCorrecta: boolean;
      puntajeObtenido: number;
      pregunta: {
        id: string;
        texto: string;
        respuestaCorrecta: string;
        puntaje: number;
      };
    }>;
  }>;
};
