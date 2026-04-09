import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";

import { EventFighterAccessForm } from "@/app/components/event-fighter-access-form";
import { EventFighterIntakeForm } from "@/app/components/event-fighter-intake-form";
import { EventFighterLogoutButton } from "@/app/components/event-fighter-logout-button";
import { LandingMotionController } from "@/app/components/landing-motion-controller";
import {
  EVENT_FIGHTER_SESSION_COOKIE_NAME,
  createEventFighterCredentialFingerprint,
  getEventFighterAuthConfig,
  verifyEventFighterSessionToken
} from "@/lib/event-fighter/auth";

import styles from "./page.module.css";

const r2PublicBase = "https://pub-ecc1c3f0770f4d4ebd9b8cc27c8d8bcf.r2.dev";
const r2Asset = (fileName: string) =>
  `${r2PublicBase}/${fileName
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;

const brandLogoWide = r2Asset("logo money moicano mma extenso.svg");
const heroImage = r2Asset("hero-lute.webp");

export const metadata: Metadata = {
  title: "Atletas da Edição | Money Moicano MMA",
  description: "Ficha privada para atletas confirmados desta edição do Money Moicano MMA.",
  robots: {
    index: false,
    follow: false
  }
};

export const dynamic = "force-dynamic";

async function resolveAuthenticatedEmail() {
  const authConfig = getEventFighterAuthConfig();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(EVENT_FIGHTER_SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const session = verifyEventFighterSessionToken(sessionToken, authConfig.sessionSecret);

  if (!session) {
    return null;
  }

  const credentialFingerprint = createEventFighterCredentialFingerprint(
    session.sub,
    authConfig.password
  );

  if (session.cf !== credentialFingerprint) {
    return null;
  }

  return session.sub;
}

export default async function AtletasDaEdicaoPage() {
  const authenticatedEmail = await resolveAuthenticatedEmail();

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
          <a
            className={styles.anchorLink}
            href={authenticatedEmail ? "#formulario" : "#acesso"}
          >
            {authenticatedEmail ? "Abrir formulário" : "Liberar acesso"}
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
            <p className={styles.eyebrow}>Rota privada para atletas desta edição</p>
            <h1 className={styles.title}>
              Ficha do
              <span className={styles.titleAccent}>Atleta</span>
            </h1>
            <p className={styles.heroBody}>
              Esta página é exclusiva para quem já vai lutar nesta edição. A ideia é
              concentrar dados operacionais, material de apresentação e fotos em um só
              lugar, sem misturar com o formulário público de interesse.
            </p>

            <div className={styles.heroPoints}>
              <div className={styles.heroPoint}>
                <span className={styles.heroPointNumber}>01</span>
                <p>Entre com o seu próprio email e preencha a ficha com esse mesmo contato.</p>
              </div>
              <div className={styles.heroPoint}>
                <span className={styles.heroPointNumber}>02</span>
                <p>Capriche nas histórias e nos detalhes para ajudar a equipe e a transmissão.</p>
              </div>
              <div className={styles.heroPoint}>
                <span className={styles.heroPointNumber}>03</span>
                <p>As fotos precisam estar claras, bem enquadradas e com boa qualidade.</p>
              </div>
            </div>
          </div>

          <aside
            className={authenticatedEmail ? styles.authenticatedAside : styles.heroAside}
            data-reveal
            id="acesso"
          >
            {authenticatedEmail ? (
              <>
                <span className={styles.asideKicker}>Acesso liberado</span>
                <h2 className={styles.asideTitle}>Ficha pronta para preenchimento.</h2>
                <p className={styles.asideBody}>
                  Sessão ativa para <strong>{authenticatedEmail}</strong>. Se precisar
                  trocar para outro email pessoal, encerre a sessão e entre de novo.
                </p>

                <ul className={styles.asideList}>
                  <li>Preencha tudo antes de sair da página.</li>
                  <li>Separe as seis fotos pedidas antes de enviar.</li>
                  <li>Revise Pix, CPF e telefone com atenção.</li>
                </ul>

                <EventFighterLogoutButton className={styles.logoutButton} />
              </>
            ) : (
              <>
                <div className={styles.accessIntro}>
                  <span className={styles.asideKicker}>Login rápido</span>
                  <h2 className={styles.asideTitle}>Primeiro valida o acesso.</h2>
                  <p className={styles.asideBody}>
                    Entre com o email do atleta e a senha desta edição. Depois do login,
                    a ficha completa abre logo abaixo e o envio fica protegido por sessão.
                  </p>
                </div>

                <EventFighterAccessForm />
              </>
            )}
          </aside>
        </div>
      </section>

      {authenticatedEmail ? (
        <section className={styles.formSection} id="formulario">
          <div className={styles.formIntro}>
            <p className={styles.formKicker}>Ficha oficial do card</p>
            <h2 className={styles.formTitle}>Manda o material completo do atleta.</h2>
            <p className={styles.formBody}>
              Esse preenchimento já nasce pensando em operação, apresentação e comunicação.
              Quanto mais bem resolvido vier, menos idas e voltas a equipe precisa fazer.
            </p>
          </div>

          <div className={styles.formWrap}>
            <EventFighterIntakeForm authenticatedEmail={authenticatedEmail} />
          </div>
        </section>
      ) : null}

      {!authenticatedEmail ? (
        <section className={styles.ctaSection} data-reveal>
          <div className={styles.ctaCard}>
            <span className={styles.ctaKicker}>Não sabe como chegou aqui?</span>
            <h2 className={styles.ctaTitle}>Se você ainda quer lutar no MMMMA, use o formulário aberto.</h2>
            <p className={styles.ctaBody}>
              Esta rota é só para atletas já confirmados nesta edição. Se você está tentando
              entrar no radar do card, o caminho certo é o formulário público.
            </p>
            <Link className={styles.ctaLink} href="/lute-no-mmmma">
              Ir para o lute-no-mmmma
            </Link>
          </div>
        </section>
      ) : null}
    </main>
  );
}
