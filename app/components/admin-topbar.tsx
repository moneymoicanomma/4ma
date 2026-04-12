import Link from "next/link";

import { AdminLogoutButton } from "@/app/components/admin-logout-button";
import { siteAsset } from "@/lib/site-assets";

import styles from "./admin-topbar.module.css";

const brandLogoWide = siteAsset("logo money moicano mma extenso.svg");

const adminNavigationItems = [
  {
    href: "/admin/fantasy",
    id: "fantasy",
    label: "Fantasy"
  },
  {
    href: "/admin/database",
    id: "database",
    label: "Banco"
  }
] as const;

type AdminTopbarProps = {
  active: (typeof adminNavigationItems)[number]["id"];
};

export function AdminTopbar({ active }: Readonly<AdminTopbarProps>) {
  return (
    <header className={styles.topbar}>
      <div className={styles.leftCluster}>
        <Link
          aria-label="Voltar para a página principal do Money Moicano MMA"
          className={styles.brand}
          href="/"
        >
          <img alt="Money Moicano MMA" src={brandLogoWide} />
        </Link>

        <nav aria-label="Seções do admin" className={styles.nav}>
          {adminNavigationItems.map((item) => {
            const isActive = item.id === active;

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink}
                href={item.href}
                key={item.id}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={styles.actions}>
        <Link className={styles.secondaryLink} href="/fantasy">
          Fantasy público
        </Link>
        <Link className={styles.primaryLink} href="/">
          Voltar ao site
        </Link>
        <AdminLogoutButton className={styles.logoutAction} />
      </div>
    </header>
  );
}
