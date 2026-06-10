export type MaterialItem = {
  id: string;
  nombre: string;
  descripcion: string | null;
  cursoId: string;
  profesorId: string;
  urlR2: string;
  tipoArchivo: string;
  tamanoBytes: string;
  creadoEn: string;
  curso: {
    id: string;
    nombre: string;
    profesorId: string;
  };
  profesor: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
  };
};

export type CourseOption = {
  id: string;
  nombre: string;
  ciclo: number;
  anio: number;
  activo: boolean;
};
