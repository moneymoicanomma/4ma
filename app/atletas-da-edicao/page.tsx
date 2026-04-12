import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";

import { EventFighterAccessForm } from "@/app/components/event-fighter-access-form";
import { EventFighterIntakeForm } from "@/app/components/event-fighter-intake-form";
import { EventFighterLogoutButton } from "@/app/components/event-fighter-logout-button";
import { LandingMotionController } from "@/app/components/landing-motion-controller";
import { siteAsset } from "@/lib/site-assets";
import { getSessionAccountFromToken } from "@/lib/server/auth-store";
import {
  getServerEnv,
  isDatabaseConfigured,
  type ServerEnv
} from "@/lib/server/env";
import {
  EVENT_FIGHTER_SESSION_COOKIE_NAME,
  createEventFighterCredentialFingerprint,
  getEventFighterAuthConfig,
  verifyEventFighterSessionToken
} from "@/lib/event-fighter/auth";

import styles from "./page.module.css";

const brandLogoWide = siteAsset("logo money moicano mma extenso.svg");
const heroImage = siteAsset("hero-lute.webp");

export const metadata: Metadata = {
  title: "Atletas da Edição | Money Moicano MMA",
  description: "Ficha privada para atletas confirmados desta edição do Money Moicano MMA.",
  robots: {
    index: false,
    follow: false
  }
};

export const dynamic = "force-dynamic";

async function resolveAuthenticatedEmail(env: ServerEnv) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(EVENT_FIGHTER_SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  if (isDatabaseConfigured(env)) {
    const session = await getSessionAccountFromToken({
      acceptedRoles: ["fighter"],
      sessionKind: "fighter_portal",
      sessionToken
    }).catch(() => null);

    return session?.email ?? null;
  }

  const authConfig = getEventFighterAuthConfig();

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
  const env = getServerEnv();
  const portalEnabled = env.eventFighterPortalEnabled;
  const authenticatedEmail = portalEnabled ? await resolveAuthenticatedEmail(env) : null;

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
          {portalEnabled ? (
            <a
              className={styles.anchorLink}
              href={authenticatedEmail ? "#formulario" : "#acesso"}
            >
              {authenticatedEmail ? "Abrir formulário" : "Liberar acesso"}
            </a>
          ) : (
            <Link className={styles.anchorLink} href="/lute-no-mmmma">
              Formulário público
            </Link>
          )}
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
            <p className={styles.eyebrow}>
              {portalEnabled ? "Rota privada para atletas desta edição" : "Área temporariamente pausada"}
            </p>
            <h1 className={styles.title}>
              {portalEnabled ? "Ficha do" : "Portal do"}
              <span className={styles.titleAccent}>Atleta</span>
            </h1>
            <p className={styles.heroBody}>
              {portalEnabled
                ? "Esta página é exclusiva para quem já vai lutar nesta edição. A ideia é concentrar dados operacionais, material de apresentação e fotos em um só lugar, sem misturar com o formulário público de interesse."
                : "Seguramos a ficha privada dos atletas até concluir a infraestrutura com segurança. O restante do site e os formulários públicos seguem funcionando normalmente na Vercel."}
            </p>

            <div className={styles.heroPoints}>
              <div className={styles.heroPoint}>
                <span className={styles.heroPointNumber}>01</span>
                <p>
                  {portalEnabled
                    ? "Entre com o seu próprio email e preencha a ficha com esse mesmo contato."
                    : "Nenhum material privado está sendo coletado por esta rota neste momento."}
                </p>
              </div>
              <div className={styles.heroPoint}>
                <span className={styles.heroPointNumber}>02</span>
                <p>
                  {portalEnabled
                    ? "Capriche nas histórias e nos detalhes para ajudar a equipe e a transmissão."
                    : "Se você ainda não foi confirmado para esta edição, o formulário público continua aberto."}
                </p>
              </div>
              <div className={styles.heroPoint}>
                <span className={styles.heroPointNumber}>03</span>
                <p>
                  {portalEnabled
                    ? "As fotos precisam estar claras, bem enquadradas e com boa qualidade."
                    : "Assim que a infraestrutura privada estiver pronta, este acesso volta pela mesma URL."}
                </p>
              </div>
            </div>
          </div>

          <aside
            className={authenticatedEmail ? styles.authenticatedAside : styles.heroAside}
            data-reveal
            id="acesso"
          >
            {!portalEnabled ? (
              <>
                <div className={styles.accessIntro}>
                  <span className={styles.asideKicker}>Temporariamente indisponível</span>
                  <h2 className={styles.asideTitle}>Essa rota volta em breve.</h2>
                  <p className={styles.asideBody}>
                    Preferimos pausar o intake privado por alguns dias em vez de correr o risco
                    de perder envio, foto ou dado sensível no lançamento.
                  </p>
                </div>

                <ul className={styles.asideList}>
                  <li>O site público segue no ar normalmente.</li>
                  <li>Os formulários abertos continuam operando pelo novo deploy.</li>
                  <li>Quando a infraestrutura privada estabilizar, a ficha volta aqui.</li>
                </ul>
              </>
            ) : authenticatedEmail ? (
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
                    Entre com o email do atleta e a senha da conta liberada pela equipe.
                    Depois do login, a ficha completa abre logo abaixo e o envio fica protegido por sessão.
                  </p>
                </div>

                <EventFighterAccessForm />
              </>
            )}
          </aside>
        </div>
      </section>

      {portalEnabled && authenticatedEmail ? (
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

      {!portalEnabled ? (
        <section className={styles.ctaSection} data-reveal>
          <div className={styles.ctaCard}>
            <span className={styles.ctaKicker}>Quer lutar no MMMMA?</span>
            <h2 className={styles.ctaTitle}>O formulário público continua aberto.</h2>
            <p className={styles.ctaBody}>
              Se você chegou aqui sem já estar confirmado nesta edição, o caminho certo continua
              sendo a inscrição pública para entrar no radar do card.
            </p>
            <Link className={styles.ctaLink} href="/lute-no-mmmma">
              Lute no MMMMA
            </Link>
          </div>
        </section>
      ) : !authenticatedEmail ? (
        <section className={styles.ctaSection} data-reveal>
          <div className={styles.ctaCard}>
            <span className={styles.ctaKicker}>Não sabe como chegou aqui?</span>
            <h2 className={styles.ctaTitle}>Se você ainda quer lutar no MMMMA, use o formulário aberto.</h2>
            <p className={styles.ctaBody}>
              Esta rota é só para atletas já confirmados nesta edição. Se você está tentando
              entrar no radar do card, o caminho certo é o formulário público.
            </p>
            <Link className={styles.ctaLink} href="/lute-no-mmmma">
              Lute no MMMMA
            </Link>
          </div>
        </section>
      ) : null}
    </main>
  );
}
