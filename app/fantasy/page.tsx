import type { Metadata } from "next";
import Image from "next/image";

import { FantasyExperience } from "@/app/components/fantasy-experience";
import { LandingMotionController } from "@/app/components/landing-motion-controller";
import { LandingTopbar } from "@/app/components/landing-topbar";
import {
  calculateFantasyLeaderboard,
  cloneFantasyMockEvents,
  getFantasyCurrentEvent,
  getLatestFinishedFantasyEvent
} from "@/lib/fantasy/mock-data";
import { siteAsset } from "@/lib/site-assets";
import { createPageMetadata } from "@/lib/seo";
import { loadFantasyEventsFromDatabase } from "@/lib/server/fantasy";

import styles from "./page.module.css";

const brandLogo = siteAsset("logo money moicano mma.svg");
const heroImage = siteAsset("hero-main-v5.webp");
const fighterSignupUrl = "https://mma.moicano.tv/";
const fighterSignupLogo =
  "https://assets.moneymoicanomma.com.br/rinha-de-inscritos.svg";

const navItems = [
  { label: "O Evento", href: "/#evento", sectionId: "evento" },
  { label: "A Transmissão", href: "/#transmissao", sectionId: "transmissao" },
  {
    label: "Lute no MMMMA",
    href: "/lute-no-mmmma",
    sectionId: "lute-no-mmmma"
  },
  { label: "Ingressos", href: "/#ingressos", sectionId: "ingressos" },
  { label: "Público", href: "/#publico", sectionId: "publico" }
];

export const metadata: Metadata = createPageMetadata({
  path: "/fantasy",
  title: "Fantasy | Money Moicano MMA",
  description:
    "Monte seus picks por luta, escolha vencedor, metodo e round, e acompanhe o ranking oficial do fantasy do Money Moicano MMA.",
  keywords: ["fantasy card", "picks de luta", "ranking fantasy MMA"]
});

export const dynamic = "force-dynamic";

function stripFantasyEventEntries(event: ReturnType<typeof getFantasyCurrentEvent>) {
  const { entries: _entries, ...safeEvent } = event;
  return safeEvent;
}

export default async function FantasyPage() {
  const databaseFantasy = await loadFantasyEventsFromDatabase();
  const events = databaseFantasy?.events.length ? databaseFantasy.events : cloneFantasyMockEvents();
  const currentEvent = getFantasyCurrentEvent(events);
  const latestFinishedEvent = getLatestFinishedFantasyEvent(events);
  const publishedLeaderboard = calculateFantasyLeaderboard(latestFinishedEvent);
  const publicCurrentEvent = stripFantasyEventEntries(currentEvent);
  const publicLeaderboardEvent = stripFantasyEventEntries(latestFinishedEvent);

  return (
    <main className={styles.page}>
      <LandingMotionController />
      <LandingTopbar
        brandLogo={brandLogo}
        navItems={navItems}
        ctaHref={fighterSignupUrl}
        ctaLabel="Lute na Rinha de Inscritos"
        ctaLogoSrc={fighterSignupLogo}
      />

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
              Escolha o vencedor, método e round de cada luta. Acompanhe os resultados em tempo
              real. Finja entender de MMA.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.interfaceSection}>
        <div className={styles.interfaceShell}>
          <FantasyExperience
            currentEvent={publicCurrentEvent}
            leaderboardEvent={publicLeaderboardEvent}
            leaderboardRows={publishedLeaderboard}
            scoringRules={currentEvent.scoringRules}
            initialEntrantCount={currentEvent.entries.length}
          />
        </div>
      </section>
    </main>
  );
}
