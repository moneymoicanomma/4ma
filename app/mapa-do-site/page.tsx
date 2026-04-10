import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { LandingMotionController } from "@/app/components/landing-motion-controller";
import {
  homepageSectionLinks,
  publicSiteRoutes,
  restrictedAreaNotes,
  siteUrl
} from "@/lib/site";

import styles from "./page.module.css";

const r2PublicBase = "https://pub-ecc1c3f0770f4d4ebd9b8cc27c8d8bcf.r2.dev";
const r2Asset = (fileName: string) =>
  `${r2PublicBase}/${fileName
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;

const brandLogoWide = r2Asset("logo money moicano mma extenso.svg");
const heroImage = r2Asset("hero-main-v3.webp");
const publicEntryPoints = publicSiteRoutes.filter((route) => route.href !== "/mapa-do-site");

export const metadata: Metadata = {
  title: "Mapa do Site | Money Moicano MMA",
  description:
    "Índice público com os principais acessos e seções navegáveis do Money Moicano MMA.",
  alternates: {
    canonical: "/mapa-do-site"
  }
};

export default function SiteMapPage() {
  return (
    <main className={styles.page}>
      <LandingMotionController />

      <header className={styles.topbar}>
        <Link
          aria-label="Voltar para a página principal do Money Moicano MMA"
          className={styles.brand}
          href="/"
        >
          <img alt="Money Moicano MMA" src={brandLogoWide} />
        </Link>

        <div className={styles.topbarActions}>
          <Link className={styles.backLink} href="/">
            Voltar ao evento
          </Link>
          <a className={styles.anchorLink} href="#paginas">
            Ver acessos
          </a>
        </div>
      </header>

      <section className={styles.hero}>
        <div aria-hidden="true" className={styles.heroMedia}>
          <Image
            fill
            alt=""
            className={styles.heroImage}
            priority
            sizes="100vw"
            src={heroImage}
          />
        </div>
        <div aria-hidden="true" className={styles.heroOverlay} />

        <div className={styles.heroGrid}>
          <div className={styles.heroCopy} data-reveal>
            <p className={styles.eyebrow}>Índice público do projeto</p>
            <h1 className={styles.title}>
              Mapa do
              <span className={styles.titleAccent}>Site</span>
            </h1>
            <p className={styles.heroBody}>
              Esta página concentra os acessos públicos do Money Moicano MMA para
              facilitar navegação, descoberta de conteúdo e leitura do projeto por
              pessoas e buscadores.
            </p>

            <div className={styles.heroActions}>
              <a className={styles.anchorLink} href="#paginas">
                Abrir indice
              </a>
              <Link className={styles.backLink} href="/#ingressos">
                Ir para ingressos
              </Link>
            </div>
          </div>

          <aside className={styles.heroAside} data-reveal>
            <span className={styles.asideKicker}>Cobertura do índice</span>

            <dl className={styles.statGrid}>
              <div className={styles.statCard}>
                <dt>Páginas públicas</dt>
                <dd>{publicEntryPoints.length}</dd>
              </div>
              <div className={styles.statCard}>
                <dt>Atalhos da home</dt>
                <dd>{homepageSectionLinks.length}</dd>
              </div>
              <div className={styles.statCard}>
                <dt>Arquivos técnicos</dt>
                <dd>2</dd>
              </div>
              <div className={styles.statCard}>
                <dt>Domínio canônico</dt>
                <dd>1</dd>
              </div>
            </dl>

            <p className={styles.asideBody}>
              Rotas privadas, operacionais e administrativas ficam fora deste mapa
              para manter a indexação pública limpa.
            </p>
          </aside>
        </div>
      </section>

      <section className={styles.catalogSection} id="paginas">
        <div className={styles.catalogGrid}>
          <div className={styles.catalogColumn} data-reveal>
            <p className={styles.sectionKicker}>Acessos principais</p>
            <h2 className={styles.sectionTitle}>Páginas públicas</h2>

            <ol className={styles.routeList}>
              {publicEntryPoints.map((route, index) => (
                <li className={styles.routeItem} key={route.href}>
                  <span className={styles.routeIndex}>{String(index + 1).padStart(2, "0")}</span>

                  <div className={styles.routeBody}>
                    <div className={styles.routeHeader}>
                      <h3>{route.title}</h3>
                      <span>{route.href}</span>
                    </div>
                    <p>{route.description}</p>
                  </div>

                  <Link className={styles.routeLink} href={route.href}>
                    Abrir
                  </Link>
                </li>
              ))}
            </ol>
          </div>

          <div className={styles.catalogColumn} data-reveal>
            <p className={styles.sectionKicker}>Atalhos da landing</p>
            <h2 className={styles.sectionTitle}>Seções da home</h2>

            <ul className={styles.sectionList}>
              {homepageSectionLinks.map((section) => (
                <li className={styles.sectionItem} key={section.href}>
                  <Link className={styles.sectionLink} href={section.href}>
                    <span className={styles.sectionLabel}>{section.label}</span>
                    <span className={styles.sectionDescription}>{section.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.technicalSection}>
        <div className={styles.technicalGrid}>
          <div className={styles.technicalCopy} data-reveal>
            <p className={styles.sectionKicker}>Indexação técnica</p>
            <h2 className={styles.sectionTitle}>Descoberta organizada para busca</h2>
            <p className={styles.technicalBody}>
              O site agora expõe um mapa público visível, um <code>sitemap.xml</code> com
              as rotas abertas e um <code>robots.txt</code> que bloqueia áreas privadas.
              Isso deixa a navegação mais clara sem misturar público com operação interna.
            </p>
            <p className={styles.technicalMeta}>Domínio canônico: {siteUrl}</p>
          </div>

          <aside className={styles.technicalPanel} data-reveal>
            <span className={styles.panelKicker}>Arquivos técnicos</span>

            <div className={styles.technicalLinks}>
              <Link className={styles.technicalLink} href="/sitemap.xml">
                Abrir sitemap.xml
              </Link>
              <Link className={styles.technicalLink} href="/robots.txt">
                Abrir robots.txt
              </Link>
            </div>

            <div className={styles.noteList}>
              {restrictedAreaNotes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
