import type { Dictionary } from "../es";

export const auth: Dictionary["auth"] = {
  login: {
    emailLabel: "Email",
    emailPlaceholder: "email@gmail.com",
    passwordLabel: "Password",
    passwordPlaceholder: "Your password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    invalidCredentials: "Incorrect email or password.",
    signingIn: "Signing in…",
    signIn: "Sign in",
    privacyPolicy: "Privacy policy",
  },
  forgotPassword: {
    title: "Recover access",
    subtitle: "Enter your institutional email.",
    emailLabel: "Institutional email",
    sendLink: "Send link",
    sending: "Sending...",
    genericError: "The request could not be processed",
    requestProcessed: "Request processed",
    backToLogin: "Back to login",
  },
  resetPassword: {
    title: "New password",
    subtitle: "Create a secure password for your account.",
    newPasswordLabel: "New password",
    confirmPasswordLabel: "Confirm password",
    mismatchError: "Passwords do not match",
    updating: "Saving...",
    updateButton: "Update password",
    genericError: "The password could not be updated",
    tokenNotFound: "Token not found",
    backToLogin: "Back to login",
  },
};
