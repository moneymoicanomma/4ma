import type { Metadata } from "next";
import Link from "next/link";

import { AdminLoginForm } from "@/app/components/admin-login-form";
import { isAdminAuthConfigured } from "@/lib/admin/auth";

import styles from "./page.module.css";

const r2PublicBase = "https://pub-ecc1c3f0770f4d4ebd9b8cc27c8d8bcf.r2.dev";
const r2Asset = (fileName: string) =>
  `${r2PublicBase}/${fileName
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;

const brandLogoWide = r2Asset("logo money moicano mma extenso.svg");

export const metadata: Metadata = {
  title: "Login Admin | Money Moicano MMA",
  description: "Acesso administrativo do painel do fantasy do Money Moicano MMA."
};

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  const authConfigured = isAdminAuthConfigured();

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
