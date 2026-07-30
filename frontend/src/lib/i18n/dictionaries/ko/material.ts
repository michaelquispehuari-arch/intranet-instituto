import type { material as materialEs } from "../es/material";

export const material: typeof materialEs = {
  eyebrow: "자료",
  title: "자료실",
  subtitle: "수강 중인 과정과 권한에 따라 이용 가능한 파일입니다.",
  uploadButton: "+ 자료 업로드",
  searchPlaceholder: "이름, 과정, 교수 또는 유형으로 검색…",
  filterButton: "필터",
  clearButton: "지우기",
  backToMaterial: "자료",
  fetchError: {
    title: "자료를 불러올 수 없습니다",
    description: "지금은 자료 서버를 이용할 수 없습니다. 나중에 다시 시도하세요.",
  },
  empty: {
    noResultsTitle: "검색 결과 없음",
    noMaterialTitle: "아직 자료가 없습니다",
    noResultsDescription: "해당 검색과 일치하는 파일이 없습니다.",
    canUploadDescription: "위 버튼으로 첫 파일을 업로드하세요.",
    noUploadDescription: "교수가 파일을 업로드하면 여기에 표시됩니다.",
  },
  noDescription: "설명 없음",
  download: "다운로드",
  delete: "삭제",
  subir: {
    title: "자료 업로드",
    subtitle: "PDF, 영상, 음성, 오피스 문서 및 이미지",
    courseLabel: "과정",
    selectCourse: "과정을 선택하세요",
    courseOption: "— {{ciclo}}차, {{anio}}년",
    nameLabel: "표시 이름",
    filesLabel: "파일 (여러 개 선택 가능)",
    descriptionLabel: "설명",
    submitButton: "자료 업로드",
    submitting: "업로드 중…",
    uploadError: "자료를 업로드할 수 없습니다. 파일, 과정, R2 자격 증명을 확인하세요.",
  },
};
