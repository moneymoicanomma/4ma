import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { FantasyExperience } from "@/app/components/fantasy-experience";
import { LandingMotionController } from "@/app/components/landing-motion-controller";
import {
  calculateFantasyLeaderboard,
  cloneFantasyMockEvents,
  countFantasyOfficialResults,
  getFantasyCurrentEvent,
  getLatestFinishedFantasyEvent
} from "@/lib/fantasy/mock-data";
import { siteAsset } from "@/lib/site-assets";
import { createPageMetadata } from "@/lib/seo";
import { loadFantasyEventsFromDatabase } from "@/lib/server/fantasy";

import styles from "./page.module.css";

const brandLogoWide = siteAsset("logo money moicano mma extenso.svg");
const heroImage = siteAsset("luta-boa.webp");

export const metadata: Metadata = createPageMetadata({
  path: "/fantasy",
  title: "Fantasy | Money Moicano MMA",
  description:
    "Monte seus picks por luta, escolha vencedor, metodo e round, e acompanhe o ranking oficial do fantasy do Money Moicano MMA.",
  keywords: ["fantasy card", "picks de luta", "ranking fantasy MMA"]
});

export const dynamic = "force-dynamic";

export default async function FantasyPage() {
  const databaseFantasy = await loadFantasyEventsFromDatabase();
  const events = databaseFantasy?.events.length ? databaseFantasy.events : cloneFantasyMockEvents();
  const currentEvent = getFantasyCurrentEvent(events);
  const latestFinishedEvent = getLatestFinishedFantasyEvent(events);
  const publishedLeaderboard = calculateFantasyLeaderboard(latestFinishedEvent);
  const resolvedFightCount = countFantasyOfficialResults(latestFinishedEvent);

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
          <Link className={styles.anchorLink} href="/admin/fantasy">
            Abrir admin
          </Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div aria-hidden="true" className={styles.heroMedia}>
          <Image fill alt="" className={styles.heroImage} priority sizes="100vw" src={heroImage} />
        </div>
        <div aria-hidden="true" className={styles.heroOverlay} />

        <div className={styles.heroGrid}>
          <div className={styles.heroCopy} data-reveal>
            <p className={styles.eyebrow}>{currentEvent.heroLabel}</p>
            <h1 className={styles.title}>
              Monte o seu
              <span className={styles.titleAccent}>Fantasy Card</span>
            </h1>
            <p className={styles.heroBody}>
              Escolha o vencedor, o método e o round de cada luta. Quando o card fechar,
              o ranking público sobe com a pontuação consolidada e o resto fica privado.
            </p>

            <div className={styles.heroPoints}>
              <div className={styles.heroPoint}>
                <span className={styles.heroPointNumber}>01</span>
                <p>Um pick completo por luta: atleta, método e round.</p>
              </div>
              <div className={styles.heroPoint}>
                <span className={styles.heroPointNumber}>02</span>
                <p>Nome, e-mail, WhatsApp, cidade, estado e consentimento são obrigatórios.</p>
              </div>
              <div className={styles.heroPoint}>
                <span className={styles.heroPointNumber}>03</span>
                <p>O ranking público exibe só nome público e pontuação oficial.</p>
              </div>
            </div>
          </div>

          <aside className={styles.heroAside} data-reveal>
            <span className={styles.asideKicker}>Card atual</span>
            <h2 className={styles.asideTitle}>{currentEvent.name}</h2>
            <p className={styles.asideBody}>{currentEvent.statusText}</p>

            <dl className={styles.statGrid}>
              <div className={styles.statCard}>
                <dt>Lutas abertas</dt>
                <dd>{currentEvent.fights.length}</dd>
              </div>
              <div className={styles.statCard}>
                <dt>Deadline</dt>
                <dd>30 min antes</dd>
              </div>
              <div className={styles.statCard}>
                <dt>Ranking publicado</dt>
                <dd>{latestFinishedEvent.entries.length} players</dd>
              </div>
              <div className={styles.statCard}>
                <dt>Resultados lançados</dt>
                <dd>{resolvedFightCount}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      <section className={styles.interfaceSection}>
        <div className={styles.interfaceShell} data-reveal>
          <FantasyExperience
            currentEvent={currentEvent}
            leaderboardEvent={latestFinishedEvent}
            leaderboardRows={publishedLeaderboard}
            scoringRules={currentEvent.scoringRules}
          />
        </div>
      </section>
    </main>
  );
}
