import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { FighterApplicationForm } from "@/app/components/fighter-application-form";
import { LandingMotionController } from "@/app/components/landing-motion-controller";
import { createPageMetadata } from "@/lib/seo";

import styles from "./page.module.css";

const r2PublicBase = "https://pub-ecc1c3f0770f4d4ebd9b8cc27c8d8bcf.r2.dev";
const r2Asset = (fileName: string) =>
  `${r2PublicBase}/${fileName
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;

const brandLogoWide = r2Asset("logo money moicano mma extenso.svg");
const heroImage = r2Asset("hero-lute.webp");

export const metadata: Metadata = createPageMetadata({
  path: "/lute-no-mmmma",
  title: "Lute no MMMMA | Money Moicano MMA",
  description:
    "Formulário oficial para atletas que querem entrar no radar do card do Money Moicano MMA e disputar vaga em uma próxima edicao.",
  keywords: ["inscricao de atleta", "selecao de lutadores", "evento de MMA em Sao Paulo"]
});

export default function LuteNoMMMMA() {
  return (
    <main className={styles.page}>
      <LandingMotionController />

      <header className={styles.topbar}>
        <Link aria-label="Voltar para a página principal do Money Moicano MMA" className={styles.brand} href="/">
          <img alt="Money Moicano MMA" src={brandLogoWide} />
        </Link>

        <div className={styles.topbarActions}>
          <Link className={styles.backLink} href="/">
            Voltar ao evento
          </Link>
          <a className={styles.anchorLink} href="#formulario">
            Preencher agora
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
            <p className={styles.eyebrow}>Seleção oficial de atletas</p>
            <h1 className={styles.title}>
              Lute no
              <span className={styles.titleAccent}>MMMMA</span>
            </h1>
            <p className={styles.heroBody}>
              Se você quer entrar no radar do card, manda uma ficha séria. A equipe
              precisa entender seu nível, sua história e o que faz você render dentro e
              fora da luta.
            </p>

            <div className={styles.heroPoints}>
              <div className={styles.heroPoint}>
                <span className={styles.heroPointNumber}>01</span>
                <p>Conta sua carreira de forma completa, não só “tenho cartel bom”.</p>
              </div>
              <div className={styles.heroPoint}>
                <span className={styles.heroPointNumber}>02</span>
                <p>Explica títulos, eventos, contexto e qualquer prova concreta do seu nível.</p>
              </div>
              <div className={styles.heroPoint}>
                <span className={styles.heroPointNumber}>03</span>
                <p>Mostra também quem você é fora da luta. Narrativa boa ajuda a vender card.</p>
              </div>
            </div>
          </div>

          <aside className={styles.heroAside} data-reveal>
            <span className={styles.asideKicker}>Importante</span>
            <h2 className={styles.asideTitle}>Responda tudo com detalhes.</h2>
            <p className={styles.asideBody}>
              Quanto mais contexto você trouxer, melhor a equipe consegue avaliar técnica,
              encaixe no evento e potencial de apresentação na transmissão.
            </p>

            <ul className={styles.asideList}>
              <li>Não deixa campo vazio.</li>
              <li>Evita resposta curta, genérica ou sem contexto.</li>
              <li>Se tiver história boa, coloca. Isso faz diferença.</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className={styles.formSection} id="formulario">
        <div className={styles.formIntro} data-reveal>
          <p className={styles.formKicker}>Ficha de inscrição</p>
          <h2 className={styles.formTitle}>Manda a melhor versão do seu caso.</h2>
          <p className={styles.formBody}>
            Esse formulário ajuda na avaliação do atleta, no matchmaking e até na forma
            de te apresentar se você entrar no radar do evento.
          </p>

          <div className={styles.steps}>
            <div className={styles.step}>
              <span className={styles.stepBadge}>1</span>
              <p>Preenche cada resposta com calma e o máximo de contexto possível.</p>
            </div>
            <div className={styles.step}>
              <span className={styles.stepBadge}>2</span>
              <p>Se tiver link, título ou resultado relevante, escreve direito e sem resumir demais.</p>
            </div>
            <div className={styles.step}>
              <span className={styles.stepBadge}>3</span>
              <p>Se o material fizer sentido para o card, a equipe entra em contato.</p>
            </div>
          </div>
        </div>

        <div className={styles.formWrap} data-reveal>
          <FighterApplicationForm />
        </div>
      </section>
    </main>
  );
}
