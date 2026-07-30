import { ResetPasswordContent } from "./reset-password-content";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;

  return (
    <main className="login-page">
      <ResetPasswordContent token={token} />
    </main>
  );
}
