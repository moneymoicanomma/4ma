import Image from "next/image";

import { LandingMotionController } from "./components/landing-motion-controller";
import { LandingTopbar } from "./components/landing-topbar";
import { NewsletterSignupForm } from "./components/newsletter-signup-form";

const r2PublicBase = "https://pub-ecc1c3f0770f4d4ebd9b8cc27c8d8bcf.r2.dev";
const r2Asset = (fileName: string) =>
  `${r2PublicBase}/${fileName
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;

const heroImage = r2Asset("hero-main-v4.webp");
const brandLogo = r2Asset("logo money moicano mma.svg");
const brandLogoWide = r2Asset("logo money moicano mma extenso.svg");
const streamIcon = r2Asset("Video-Game-Logo-Streamplay--Streamline-Ultimate.svg");
const fightsIcon = r2Asset("Fists-Crashing-Conflict--Streamline-Ultimate.svg");
const stadiumIcon = r2Asset("Stadium-Classic-2--Streamline-Ultimate.svg");
const microphoneIcon = r2Asset("Microphone-Podcast-2--Streamline-Ultimate.svg");
const cornermanIcon = r2Asset("cornerman.svg");
const cornermanSloganLogo = r2Asset("cornerman - slogan.svg");
const cabmmaLogo = r2Asset("cabmma.svg");
const joyaGearLogo = r2Asset("joyagear.svg");
const instagramIcon = r2Asset("instagram_logo.svg");
const youtubeIcon = r2Asset("youtube_logo.svg");
const xIcon = r2Asset("x_logo.svg.svg");
const ticketBackgroundImage = r2Asset("ingressos-bg.webp");
const transmissionOverlayImage = "https://moneymoicanomma.com.br/transmissao-overlay.webp";
const cornermanUrl = "https://cornerman.com.br/";
const cabmmaUrl = "https://www.instagram.com/cab_mma/";
const transmissionUrl = "https://www.youtube.com/@RenatoMoneyMoicano";
const joyaGearUrl = "https://joyagear.com/";
const fighterSignupUrl = "https://mma.moicano.tv/";

const navItems = [
  { label: "O Evento", href: "#evento", sectionId: "evento" },
  { label: "A Transmissão", href: "#transmissao", sectionId: "transmissao" },
  { label: "Lute no MMMMA", href: "/lute-no-mmmma", sectionId: "lute-no-mmmma" },
  { label: "Ingressos", href: "#ingressos", sectionId: "ingressos" },
  { label: "Público", href: "#publico", sectionId: "publico" }
];

const eventFacts = [
  { label: "Data do Evento", value: "23 Maio 2026" },
  {
    label: "Localização",
    value: "Cornerman, São Paulo",
    icon: cornermanIcon,
    href: cornermanUrl
  },
  {
    label: "Transmissão",
    value: "Canal Money Moicano",
    href: transmissionUrl
  }
];

const featureCards = [
  {
    icon: fightsIcon,
    title: "Lutas que Valem Assistir",
    copy:
      "Confrontos casados com critério técnico real. Nada de enchimento de card, nada de luta fácil. Cada combate tem história, tem nível e tem motivo pra estar no card."
  },
  {
    icon: streamIcon,
    title: "Transmissão que Não Escapa Nada",
    copy:
      "Replay, estatísticas, câmeras no cage e comentários ao vivo. Você assiste de casa e sente que está na arena (só que sem levar porrada)."
  },
  {
    icon: stadiumIcon,
    title: "Atmosfera de Evento Grande",
    copy:
      "Arena, estrutura profissional, pesagem, entrada dos atletas e toda a cerimônia que transforma uma luta em um espetáculo de verdade."
  },
  {
    icon: microphoneIcon,
    title: "Comentários Nada Relevantes",
    copy:
      "Análise nada técnica misturada com humor duvidoso e opiniões que nenhuma transmissão corporativa teria coragem de dar."
  }
];

const transmissionTiles = [
  {
    title: "Comentários nada técnicos",
    image: transmissionOverlayImage,
    className: "transmission-tile transmission-tile--comments",
    sizes: "(max-width: 780px) 72vw, (min-width: 1600px) 18vw, 319px"
  },
  {
    title: "Torcida maluca",
    image: r2Asset("torcida-maluca.webp"),
    className: "transmission-tile transmission-tile--crowd",
    sizes: "(max-width: 780px) 72vw, (min-width: 1600px) 18vw, 319px"
  },
  {
    title: "Certeza de luta boa",
    titleSecondary: "(Isso realmente aconteceu)",
    image: r2Asset("luta-boa.webp"),
    className: "transmission-tile transmission-tile--fight",
    sizes: "(max-width: 780px) 74vw, (min-width: 1600px) 24vw, 299px"
  }
];

const casterCards = [
  {
    name: "Renato Money Moicano",
    copy: "Dono dessa parada, lutador do UFC, cansado e calvo.",
    image: r2Asset("caster-renato-moicano.webp"),
    imagePosition: "center 24%"
  },
  {
    name: "Tiago Pamplona",
    copy: "Amigo do Moicano, comentarista do UFC e tem um podcast fracassado.",
    image: r2Asset("caster-tiago-pamplona.webp"),
    imagePosition: "center 18%"
  }
];

const ticketTiers = [
  {
    label: "Pra quem tá liso",
    name: "VIP Fighting",
    description: "Experiência VIP para ver a luta de perto e sentir a energia de cada golpe.",
    price: "R$ 300",
    features: [],
    buttonLabel: "Em breve",
    comingSoon: true
  },
  {
    label: "Pra quem tá rico e quer uma experiência f#d@",
    name: "VIP Networking",
    description:
      "Experiência VIP para assistir colado na grade, com visão privilegiada e acesso ao lounge exclusivo com empresários, influencers e lutadores.",
    price: "R$ 800",
    features: [],
    buttonLabel: "Em breve",
    comingSoon: true,
    featured: true
  }
];

const footerLinks = [
  { label: "Lute no MMMMA", href: "/lute-no-mmmma" },
  { label: "Imprensa", href: "/imprensa" },
  { label: "Termos de Uso", href: "/termos-de-uso" },
  { label: "Política de Privacidade", href: "/politica-de-privacidade" },
  { label: "Contato", href: "/contato" }
];

const socialLinks = [
  { label: "X", href: "https://x.com/MoneyMoicanoMMA", icon: xIcon },
  {
    label: "Instagram",
    href: "https://www.instagram.com/moneymoicano.mma/",
    icon: instagramIcon
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@RenatoMoneyMoicano",
    icon: youtubeIcon
  }
];

const partners = [
  {
    name: "Cornerman",
    logo: cornermanSloganLogo,
    href: cornermanUrl,
    className: "partner-logo partner-logo--cornerman"
  },
  {
    name: "CABMMA",
    logo: cabmmaLogo,
    href: cabmmaUrl,
    className: "partner-logo partner-logo--cabmma"
  },
  {
    name: "Joya Gear",
    logo: joyaGearLogo,
    href: joyaGearUrl,
    className: "partner-logo partner-logo--joyagear"
  }
];

type ButtonVariant = "primary" | "secondary" | "nav" | "light";
type ButtonSize = "medium" | "large";
type AssetImageProps = React.ComponentPropsWithoutRef<"img"> & {
  lazy?: boolean;
};

function AssetImage({
  lazy = true,
  decoding = "async",
  loading,
  ...props
}: Readonly<AssetImageProps>) {
  return <img {...props} decoding={decoding} loading={lazy ? loading ?? "lazy" : loading} />;
}

function LandingButton({
  children,
  href,
  size = "medium",
  variant = "primary"
}: Readonly<{
  children: React.ReactNode;
  href: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
}>) {
  const className = [
    "landing-button",
    `landing-button--${variant}`,
    variant === "nav" ? null : `landing-button--${size}`
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <a className={className} href={href}>
      {children}
    </a>
  );
}

function MobileRailShell({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="mobile-rail-shell">{children}</div>;
}

function BrandMark({
  wide = false,
  className = "",
  lazy = false
}: Readonly<{
  wide?: boolean;
  className?: string;
  lazy?: boolean;
}>) {
  return (
    <div
      aria-label="Money Moicano MMA"
      className={wide ? `brand-mark brand-mark--wide ${className}`.trim() : `brand-mark ${className}`.trim()}
    >
      <AssetImage
        alt="Money Moicano MMA"
        lazy={lazy}
        src={wide ? brandLogoWide : brandLogo}
      />
    </div>
  );
}

function SectionEyebrow({
  children,
  centered = false
}: Readonly<{
  children: React.ReactNode;
  centered?: boolean;
}>) {
  return (
    <div className={centered ? "section-eyebrow section-eyebrow--centered" : "section-eyebrow"}>
      <span className="section-eyebrow__line" />
      <span>{children}</span>
      {centered ? <span className="section-eyebrow__line" /> : null}
    </div>
  );
}

export default function Home() {
  return (
    <main className="page-shell">
      <LandingMotionController />
      <LandingTopbar
        brandLogo={brandLogo}
        navItems={navItems}
        ctaHref={fighterSignupUrl}
        ctaLabel="Lute na Rinha de Inscritos"
      />

      <section className="hero" data-nav-section="evento" id="evento">
        <div className="hero__image-shell" aria-hidden="true">
          <Image
            fill
            className="hero__image"
            alt=""
            priority
            sizes="(max-width: 780px) 100vw, (min-width: 1600px) 80vw, 1273px"
            src={heroImage}
          />
        </div>
        <div className="hero__scrim" />

        <div className="hero__content">
          <SectionEyebrow>O evento que o MMA brasileiro precisava</SectionEyebrow>

          <h1 className="hero__title">
            <span>Porrada</span>
            <span>Sincera</span>
            <span className="is-highlight">sem filtro.</span>
          </h1>

          <p className="body-copy hero__copy">
            O Money Moicano MMA é um evento profissional de MMA comandado por Renato
            Moicano, atleta do UFC, comentarista sem filtro e dono do canal que
            explodiu o YouTube Brasil. Lutas reais. Transmissão ao vivo. Sem
            paciência pra choro.
          </p>

          <div className="hero__actions">
            {/* Reativar o CTA de ingressos no hero quando o link oficial estiver disponível. */}
            <LandingButton href="#transmissao" size="large" variant="secondary">
              Saiba mais
            </LandingButton>
          </div>
        </div>

        <div className="event-bar" data-reveal>
          <div className="event-bar__facts" data-rail>
            {eventFacts.map((fact) => (
              fact.href ? (
                <a
                  className="event-fact event-fact--link"
                  data-rail-item
                  href={fact.href}
                  key={fact.label}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="event-fact__label">{fact.label}</span>
                  <span className="event-fact__value">
                    {fact.icon ? (
                      <AssetImage className="event-fact__value-icon" lazy={false} src={fact.icon} alt="" />
                    ) : null}
                    <span>{fact.value}</span>
                  </span>
                </a>
              ) : (
                <div className="event-fact" data-rail-item key={fact.label}>
                  <span className="event-fact__label">{fact.label}</span>
                  <span className="event-fact__value">
                    {fact.icon ? (
                      <AssetImage className="event-fact__value-icon" lazy={false} src={fact.icon} alt="" />
                    ) : null}
                    <span>{fact.value}</span>
                  </span>
                </div>
              )
            ))}
          </div>

          <div className="event-bar__icon">
            <AssetImage lazy={false} src={streamIcon} alt="" />
          </div>
        </div>
      </section>

      <section className="section section--proof" data-nav-section="evento">
        <div className="section__headline section__headline--centered" data-reveal>
          <SectionEyebrow centered>Não é mais um eventinho de MMA</SectionEyebrow>

          <h2 className="display-title display-title--proof">
            <span>Estrutura profissional,</span>
            <span>
              <span className="is-highlight">humor duvidoso</span> &amp;
            </span>
            <span>lutas reais.</span>
          </h2>

          <p className="body-copy body-copy--lead">
            Lutas reais e estrutura profissional chancelados pela Comissão Atlética
            Brasileira de MMA (CABMMA). E uma transmissão que mistura análise técnica
            com o humor sem filtro que o MMA nunca teve.
          </p>
        </div>

        <MobileRailShell>
          <div className="feature-grid" data-rail>
            {featureCards.map((feature) => (
              <article className="feature-card" data-rail-item data-reveal key={feature.title}>
                <AssetImage className="feature-card__icon" src={feature.icon} alt="" />
                <h3 className="feature-card__title">{feature.title}</h3>
                <p className="feature-card__copy">{feature.copy}</p>
              </article>
            ))}
          </div>
        </MobileRailShell>

        {/* Reativar o CTA de ingressos desta seção quando o link oficial estiver disponível. */}
      </section>

      <section className="section section--transmission" data-nav-section="transmissao" id="transmissao">
        <div className="transmission-copy" data-reveal>
          <SectionEyebrow>Produção de evento internacional</SectionEyebrow>

          <h2 className="display-title display-title--closing">
            <span>Uma pegada</span>
            <span>que não existe</span>
            <span>em mais</span>
            <span className="is-highlight">lugar nenhum.</span>
          </h2>

          <p className="body-copy body-copy--muted">
            Tudo extremamente profissional (menos o conteúdo proferido pelos
            comentaristas)
          </p>
        </div>

        <MobileRailShell>
          <div className="transmission-gallery" aria-label="Momentos da transmissão" data-rail>
            {transmissionTiles.map((tile) => (
              <article className={tile.className} data-rail-item data-reveal key={tile.title}>
                <div className="transmission-tile__media">
                  <Image
                    alt=""
                    className="transmission-tile__image"
                    fill
                    sizes={tile.sizes}
                    src={tile.image}
                  />
                  <span className="transmission-tile__overlay" />
                </div>
                <h3 className="transmission-tile__title">
                  <span>{tile.title}</span>
                  {tile.titleSecondary ? (
                    <span className="transmission-tile__title-secondary">
                      {tile.titleSecondary}
                    </span>
                  ) : null}
                </h3>
              </article>
            ))}
          </div>
        </MobileRailShell>
      </section>

      <section className="section section--casters" data-nav-section="transmissao" id="casters">
        <div className="section__headline section__headline--centered" data-reveal>
          <SectionEyebrow centered>Nossos casters</SectionEyebrow>
          <h2 className="display-title display-title--secondary">
            Conheça os responsáveis por essa parada
          </h2>
        </div>

        <MobileRailShell>
          <div className="casters-grid" data-rail>
            {casterCards.map((caster) => (
              <article className="caster-card" data-rail-item data-reveal key={caster.name}>
                <div className="caster-card__visual">
                  <Image
                    alt={caster.name}
                    className="caster-card__image"
                    fill
                    sizes="(max-width: 780px) 72vw, (min-width: 1600px) 32vw, 352px"
                    src={caster.image}
                    style={{ objectPosition: caster.imagePosition }}
                  />
                </div>
                <div className="caster-card__copy">
                  <h3 className="caster-card__name">{caster.name}</h3>
                  <p className="caster-card__text">{caster.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </MobileRailShell>
      </section>

      <section
        className="section section--tickets"
        data-nav-section="ingressos"
        id="ingressos"
        style={{ "--tickets-bg-image": `url("${ticketBackgroundImage}")` } as React.CSSProperties}
      >
        <div className="section__headline section__headline--centered" data-reveal>
          <SectionEyebrow centered>Ingressos</SectionEyebrow>

          <h2 className="display-title display-title--proof">Moicano wants money!!!</h2>

          <p className="body-copy body-copy--lead">
            Meu brother, esse evento tá muito caro e o agiota já tá me cobrando
            aqui. Ajuda nois comprando teu ingresso.
          </p>
        </div>

        <MobileRailShell>
          <div className="ticket-grid" data-rail>
            {ticketTiers.map((tier) => (
              <article
                data-rail-item
                data-reveal
                className={tier.featured ? "ticket-card ticket-card--featured" : "ticket-card"}
                key={tier.name}
              >
                <span className="ticket-card__label">{tier.label}</span>

                <div className="ticket-card__price-block">
                  <h3 className="ticket-card__name">{tier.name}</h3>
                  <p className="ticket-card__description">{tier.description}</p>
                  <p className="ticket-card__price">{tier.price}</p>
                </div>

                {tier.features.length ? (
                  <ul className="ticket-card__list">
                    {tier.features.map((feature) => (
                      <li className="ticket-card__item" key={feature}>
                        {feature}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {/* Reativar o botão com o link oficial de ingressos aqui quando ele existir. */}
                {tier.comingSoon ? (
                  <span
                    aria-disabled="true"
                    className={`landing-button landing-button--${tier.featured ? "light" : "secondary"} landing-button--large landing-button--disabled`}
                  >
                    {tier.buttonLabel}
                  </span>
                ) : (
                  <LandingButton
                    href="#evento"
                    size="large"
                    variant={tier.featured ? "light" : "secondary"}
                  >
                    {tier.buttonLabel}
                  </LandingButton>
                )}
              </article>
            ))}
          </div>
        </MobileRailShell>
      </section>

      <section className="section section--audience" data-nav-section="publico" id="publico">
        <div className="audience-media" data-reveal>
          <Image
            alt="Audiência internacional do Money Moicano MMA"
            className="audience-media__image"
            fill
            sizes="(max-width: 980px) 100vw, (min-width: 1600px) 42vw, 535px"
            src={r2Asset("audiencia-internacional.webp")}
          />
        </div>

        <div className="audience-copy" data-reveal>
          <SectionEyebrow>Audiência internacional</SectionEyebrow>

          <h2 className="display-title display-title--audience">
            <span>Até os gringos vão</span>
            <span>ver o que é evento</span>
            <span className="display-title__line">
              de <span className="display-title__accent">qualidade</span>
            </span>
          </h2>

          <p className="body-copy audience-copy__body">
            O Money Moicano MMA rompeu fronteiras. Nossa transmissão atinge o mundo
            todo e quem for gringo e quiser ouvir o que o Moicano tem a dizer se
            prepare, você tem até o dia 23 de maio pra aprender português brasileiro.
          </p>

          {/* Reativar o CTA de ingressos desta seção quando o link oficial estiver disponível. */}
        </div>
      </section>

      <section className="section section--cta" data-nav-section="publico">
        <div className="newsletter-panel" data-reveal>
          <div className="newsletter-panel__copy">
            <SectionEyebrow centered>Newsletter</SectionEyebrow>
            <h2 className="display-title display-title--newsletter">
              Se vai cobrir, faz direito.
            </h2>
            <p className="body-copy newsletter-panel__text">
              Se você é jornalista, criador de conteúdo ou um veículo de comunicação,
              inscreva-se para receber press kit, histórico dos atletas, novidades
              exclusivas e atualizações direto no e-mail.
            </p>
          </div>

          <NewsletterSignupForm />
        </div>
      </section>

      <section
        aria-labelledby="sponsors-title"
        className="section section--sponsors"
        data-nav-section="publico"
      >
        <h2 className="sponsors__heading" data-reveal id="sponsors-title">
          Nossos parceiros:
        </h2>

        <div className="partners-row" aria-label="Parceiros do evento" data-reveal>
          {partners.map((partner) => (
            <a
              className={partner.className}
              data-reveal
              href={partner.href}
              key={partner.name}
              rel="noreferrer"
              target="_blank"
            >
              <AssetImage src={partner.logo} alt={partner.name} />
            </a>
          ))}
        </div>

        <LandingButton href="/seja-um-parceiro" size="large" variant="secondary">
          Quero ser um parceiro
        </LandingButton>
      </section>

      <footer className="footer" data-nav-section="publico">
        <div className="footer__row" data-reveal>
          <BrandMark lazy />

          <nav className="footer__nav" aria-label="Footer">
            {footerLinks.map((item) => (
              <a className="footer__link" href={item.href} key={item.label}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="footer__social" aria-label="Redes sociais">
            {socialLinks.map((item) => (
              <a
                className="footer__social-link"
                href={item.href}
                key={item.label}
                target="_blank"
                rel="noreferrer"
                aria-label={item.label}
              >
                <AssetImage src={item.icon} alt={item.label} />
              </a>
            ))}
          </div>
        </div>

        <BrandMark className="footer__wordmark" lazy wide />
      </footer>

      {/* Reativar o sticky CTA de ingressos no mobile quando o link oficial estiver disponível. */}
    </main>
  );
}
