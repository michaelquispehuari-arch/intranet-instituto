import type { configuracion as configuracionEs } from "../es/configuracion";

export const configuracion: typeof configuracionEs = {
  eyebrow: "관리",
  title: "설정",
  subtitle: "학기 전체 설정입니다.",
  loading: "불러오는 중…",
  servicesStatus: {
    title: "서비스 상태",
    ready: "준비됨",
    pending: "대기 중",
    unavailable: "백엔드 상태를 확인할 수 없습니다.",
  },
  zoomLink: {
    title: "학기 Zoom 링크",
    description: "이 링크는 학기 전체에 하나만 사용됩니다. 모든 역할이 과정 화면에서 이 링크를 볼 수 있습니다.",
    urlLabel: "Zoom 회의 URL",
    saveButton: "링크 저장",
    saving: "저장 중…",
    testLink: "링크 테스트",
    saveSuccess: "링크가 저장되었습니다.",
    saveError: "저장 중 오류가 발생했습니다. 링크를 확인하세요.",
  },
};
