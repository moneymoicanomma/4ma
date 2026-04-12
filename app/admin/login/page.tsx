import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/app/components/admin-login-form";
import {
  ADMIN_SESSION_COOKIE_NAME,
  isAdminAuthConfigured,
  resolveAdminSessionIdentity
} from "@/lib/admin/auth";
import { siteAsset } from "@/lib/site-assets";
import { getSessionAccountFromToken } from "@/lib/server/auth-store";
import { getServerEnv, isDatabaseConfigured } from "@/lib/server/env";

import styles from "./page.module.css";

const brandLogoWide = siteAsset("logo money moicano mma extenso.svg");

export const metadata: Metadata = {
  title: "Login Admin | Money Moicano MMA",
  description: "Acesso administrativo do painel do fantasy do Money Moicano MMA.",
  robots: {
    index: false,
    follow: false
  }
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const env = getServerEnv();
  const authConfigured = isAdminAuthConfigured() || isDatabaseConfigured(env);
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    if (isDatabaseConfigured(env)) {
      const session = await getSessionAccountFromToken({
        acceptedRoles: ["admin", "operator"],
        sessionKind: "backoffice",
        sessionToken
      }).catch(() => null);

      if (session) {
        redirect("/admin/fantasy");
      }
    }

    const fallbackSession = await resolveAdminSessionIdentity(sessionToken);

    if (fallbackSession) {
      redirect("/admin/fantasy");
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link
          aria-label="Voltar para a página principal do Money Moicano MMA"
          className={styles.brand}
          href="/"
        >
          <img alt="Money Moicano MMA" src={brandLogoWide} />
        </Link>

        <div className={styles.topbarActions}>
          <Link className={styles.backLink} href="/fantasy">
            Ver fantasy
          </Link>
          <Link className={styles.anchorLink} href="/">
            Voltar ao site
          </Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy} data-reveal>
          <p className={styles.eyebrow}>Área restrita</p>
          <h1 className={styles.title}>
            Login do
            <span className={styles.titleAccent}>Admin</span>
          </h1>
          <p className={styles.heroBody}>
            Acesso protegido para configurar evento, editar lutas, lançar resultados e publicar o
            leaderboard do fantasy.
          </p>
        </div>

        <div className={styles.formWrap} data-reveal>
          <AdminLoginForm authConfigured={authConfigured} />
        </div>
      </section>
    </main>
  );
}
