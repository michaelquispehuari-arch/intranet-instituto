import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { LogoutButton } from "@/app/dashboard/logout-button";

type ModuleShellProps = {
  title: string;
  description: string;
};

export async function ModuleShell({ title, description }: ModuleShellProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="page">
      <div className="shell dashboard">
        <header className="topbar">
          <div className="brand">
            <strong>{title}</strong>
            <span className="muted">{session.user.email}</span>
          </div>
          <LogoutButton />
        </header>

        <section className="panel hero">
          <span className="badge">{session.user.rol}</span>
          <h1>{title}</h1>
          <p className="muted">{description}</p>
        </section>
      </div>
    </main>
  );
}
