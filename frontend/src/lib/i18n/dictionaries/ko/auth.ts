import type { Dictionary } from "../es";

export const auth: Dictionary["auth"] = {
  login: {
    emailLabel: "이메일",
    emailPlaceholder: "email@gmail.com",
    passwordLabel: "비밀번호",
    passwordPlaceholder: "비밀번호를 입력하세요",
    showPassword: "비밀번호 표시",
    hidePassword: "비밀번호 숨기기",
    invalidCredentials: "이메일 또는 비밀번호가 올바르지 않습니다.",
    signingIn: "로그인 중…",
    signIn: "로그인",
    privacyPolicy: "개인정보 처리방침",
  },
  forgotPassword: {
    title: "비밀번호 찾기",
    subtitle: "소속 이메일을 입력하세요.",
    emailLabel: "소속 이메일",
    sendLink: "링크 보내기",
    sending: "전송 중...",
    genericError: "요청을 처리할 수 없습니다",
    requestProcessed: "요청이 처리되었습니다",
    backToLogin: "로그인으로 돌아가기",
  },
  resetPassword: {
    title: "새 비밀번호",
    subtitle: "계정에 사용할 안전한 비밀번호를 만드세요.",
    newPasswordLabel: "새 비밀번호",
    confirmPasswordLabel: "비밀번호 확인",
    mismatchError: "비밀번호가 일치하지 않습니다",
    updating: "저장 중...",
    updateButton: "비밀번호 변경",
    genericError: "비밀번호를 변경할 수 없습니다",
    tokenNotFound: "토큰을 찾을 수 없습니다",
    backToLogin: "로그인으로 돌아가기",
  },
};
