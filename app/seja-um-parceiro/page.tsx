import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PartnerInquiryForm } from "@/app/components/partner-inquiry-form";
import { LandingMotionController } from "@/app/components/landing-motion-controller";

import styles from "./page.module.css";

const r2PublicBase = "https://pub-ecc1c3f0770f4d4ebd9b8cc27c8d8bcf.r2.dev";
const r2Asset = (fileName: string) =>
  `${r2PublicBase}/${fileName
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;

const brandLogoWide = r2Asset("logo money moicano mma extenso.svg");
const heroImage = r2Asset("hero-main-v3.webp");

export const metadata: Metadata = {
  title: "Seja um parceiro | Money Moicano MMA",
  description:
    "Formulário comercial para marcas e empresas interessadas em parceria com o Money Moicano MMA."
};

export default function SejaUmParceiroPage() {
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
            Falar com a equipe
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
            <p className={styles.eyebrow}>Parcerias & patrocínio</p>
            <h1 className={styles.title}>
              Sua marca
              <span className={styles.titleAccent}>no MMMMA</span>
            </h1>
            <p className={styles.heroBody}>
              Se a sua empresa quer conversar sobre patrocínio, ativações ou presença de
              marca no evento, deixe seu contato. A equipe avalia o encaixe e retorna para
              seguir a conversa comercial.
            </p>

            <div className={styles.heroPoints}>
              <div className={styles.heroPoint}>
                <span className={styles.heroPointNumber}>01</span>
                <p>Arena, mídia e conteúdo social no mesmo ecossistema de visibilidade.</p>
              </div>
              <div className={styles.heroPoint}>
                <span className={styles.heroPointNumber}>02</span>
                <p>Espaço para patrocínio, ativação presencial, collab e ação de marca.</p>
              </div>
              <div className={styles.heroPoint}>
                <span className={styles.heroPointNumber}>03</span>
                <p>Se houver fit, a equipe retorna para discutir formato, entrega e timing.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.formSection} id="formulario">
        <div className={styles.formIntro} data-reveal>
          <p className={styles.formKicker}>Formulário comercial</p>
          <h2 className={styles.formTitle}>Deixe um contato direto e seguimos dali.</h2>
          <p className={styles.formBody}>
            Esse formulário serve para abrir a conversa. Sem briefing obrigatório, sem fricção
            desnecessária no primeiro contato.
          </p>

          <div className={styles.steps}>
            <div className={styles.step}>
              <span className={styles.stepBadge}>1</span>
              <p>Preencha os dados de quem toca ou aprova a parceria dentro da empresa.</p>
            </div>
            <div className={styles.step}>
              <span className={styles.stepBadge}>2</span>
              <p>Se quiser, deixe uma mensagem curta com o interesse da marca.</p>
            </div>
            <div className={styles.step}>
              <span className={styles.stepBadge}>3</span>
              <p>Se fizer sentido para o evento, a equipe retorna por e-mail ou WhatsApp.</p>
            </div>
          </div>
        </div>

        <div className={styles.formWrap} data-reveal>
          <PartnerInquiryForm />
        </div>
      </section>
    </main>
  );
}
