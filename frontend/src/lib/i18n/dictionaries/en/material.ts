import type { material as materialEs } from "../es/material";

export const material: typeof materialEs = {
  eyebrow: "Resources",
  title: "Material Library",
  subtitle: "Files available according to your courses and permissions",
  uploadButton: "+ Upload material",
  searchPlaceholder: "Search by name, course, teacher or type…",
  filterButton: "Filter",
  clearButton: "Clear",
  backToMaterial: "Material",
  fetchError: {
    title: "Could not load material",
    description: "The resource server is not available right now. Try again later.",
  },
  empty: {
    noResultsTitle: "No results",
    noMaterialTitle: "No material yet",
    noResultsDescription: "No files match that search.",
    canUploadDescription: "Upload the first file using the button above.",
    noUploadDescription: "Files will appear here once a teacher uploads them.",
  },
  noDescription: "No description",
  download: "Download",
  delete: "Delete",
  subir: {
    title: "Upload material",
    subtitle: "PDF, videos, audio, Office documents and images",
    courseLabel: "Course",
    selectCourse: "Select a course",
    courseOption: "— cycle {{ciclo}}, {{anio}}",
    nameLabel: "Display name",
    filesLabel: "Files (you can select several)",
    descriptionLabel: "Description",
    submitButton: "Upload material",
    submitting: "Uploading…",
    uploadError: "Could not upload the material. Check the file, course and R2 credentials.",
  },
};
