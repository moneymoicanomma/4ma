import Image from "next/image";

import { LandingTopbar } from "./components/landing-topbar";
import { NewsletterSignupForm } from "./components/newsletter-signup-form";

const heroImage =
  "https://www.figma.com/api/mcp/asset/83fa3342-e3d2-442b-be31-facae874d567";
const brandLogo = "/assets/landing/logo money moicano mma.svg";
const brandLogoWide = "/assets/landing/logo money moicano mma extenso.svg";
const streamIcon =
  "/assets/landing/Video-Game-Logo-Streamplay--Streamline-Ultimate.svg";
const fightsIcon =
  "/assets/landing/Fists-Crashing-Conflict--Streamline-Ultimate.svg";
const stadiumIcon =
  "/assets/landing/Stadium-Classic-2--Streamline-Ultimate.svg";
const microphoneIcon =
  "/assets/landing/Microphone-Podcast-2--Streamline-Ultimate.svg";
const cornermanIcon = "/assets/landing/cornerman.svg";
const cornermanSloganLogo = "/assets/landing/cornerman%20-%20slogan.svg";
const joyaGearLogo = "/assets/landing/joyagear.svg";
const esportesDaSorteLogo = "/assets/landing/esportes-da-sorte.svg";
const instagramIcon = "/assets/landing/instagram_logo.svg";
const youtubeIcon = "/assets/landing/youtube_logo.svg";
const xIcon = "/assets/landing/x_logo.svg.svg";

const navItems = [
  { label: "O Evento", href: "#evento", sectionId: "evento" },
  { label: "A Transmissão", href: "#transmissao", sectionId: "transmissao" },
  { label: "Ingressos", href: "#ingressos", sectionId: "ingressos" },
  { label: "Público", href: "#publico", sectionId: "publico" }
];

const eventFacts = [
  { label: "Data do Evento", value: "30 Maio 2026" },
  { label: "Localização", value: "Cornerman, São Paulo", icon: cornermanIcon },
  { label: "Transmissão", value: "Canal Money Moicano" }
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
    image: "/assets/landing/figma/transmissao-overlay.png",
    className: "transmission-tile transmission-tile--comments",
    sizes: "(max-width: 780px) 100vw, 319px"
  },
  {
    title: "Torcida maluca",
    image: "/assets/landing/figma/torcida-maluca.png",
    className: "transmission-tile transmission-tile--crowd",
    sizes: "(max-width: 780px) 100vw, 319px"
  },
  {
    title: "Certeza de luta boa",
    titleSecondary: "(Isso realmente aconteceu)",
    image: "/assets/landing/figma/luta-boa.png",
    className: "transmission-tile transmission-tile--fight",
    sizes: "(max-width: 780px) 100vw, 299px"
  }
];

const casterCards = [
  {
    name: "Tiago Pamplona",
    copy: "Amigo do Moicano, comentarista do UFC e tem um podcast fracassado.",
    image: "/assets/landing/figma/caster-tiago-pamplona.png",
    imagePosition: "center 18%"
  },
  {
    name: "Renato Money Moicano",
    copy: "Dono dessa parada, lutador do UFC, cansado e calvo.",
    image: "/assets/landing/figma/caster-renato-moicano.png",
    imagePosition: "center 24%"
  }
];

const ticketTiers = [
  {
    label: "Pra quem tá liso",
    name: "VIP Fighting",
    price: "R$ 300",
    features: ["Acesso ao setor pista", "Bares exclusivos", "Visão frontal"],
    buttonLabel: "Garantir Ingresso"
  },
  {
    label: "Pra quem tá rico e quer uma experiência f#d@",
    name: "VIP Networking",
    price: "R$ 800",
    features: [
      "Cadeira ao lado da grade",
      "Open bar (cerveja & água)",
      "Kit Moicano exclusivo",
      "Entrada sem fila"
    ],
    buttonLabel: "Garantir Ingresso",
    featured: true
  }
];

const footerLinks = [
  { label: "Imprensa", href: "#" },
  { label: "Termos de Uso", href: "#" },
  { label: "Política de Privacidade", href: "#" },
  { label: "Contato", href: "#" }
];

const socialLinks = [
  { label: "X", href: "#", icon: xIcon },
  { label: "Instagram", href: "#", icon: instagramIcon },
  { label: "YouTube", href: "#", icon: youtubeIcon }
];

const partners = [
  {
    name: "Cornerman",
    logo: cornermanSloganLogo,
    className: "partner-logo partner-logo--cornerman"
  },
  {
    name: "Joya Gear",
    logo: joyaGearLogo,
    className: "partner-logo partner-logo--joyagear"
  },
  {
    name: "Esportes da Sorte",
    logo: esportesDaSorteLogo,
    className: "partner-logo partner-logo--esportes"
  }
];

type ButtonVariant = "primary" | "secondary" | "nav" | "light";
type ButtonSize = "medium" | "large";

function LandingButton({
  children,
  href,
  id,
  size = "medium",
  variant = "primary"
}: Readonly<{
  children: React.ReactNode;
  href: string;
  id?: string;
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
    <a className={className} href={href} id={id}>
      {children}
    </a>
  );
}

function BrandMark({
  wide = false,
  className = ""
}: Readonly<{
  wide?: boolean;
  className?: string;
}>) {
  return (
    <div
      aria-label="Money Moicano MMA"
      className={wide ? `brand-mark brand-mark--wide ${className}`.trim() : `brand-mark ${className}`.trim()}
    >
      <img src={wide ? brandLogoWide : brandLogo} alt="Money Moicano MMA" />
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
      <LandingTopbar
        brandLogo={brandLogo}
        ctaHref="#ingressos"
        ctaLabel="Comprar Ingressos"
        navItems={navItems}
      />

      <section className="hero" data-nav-section="evento" id="evento">
        <div className="hero__image-shell" aria-hidden="true">
          <img
            className="hero__image"
            src={heroImage}
            alt=""
            decoding="async"
            fetchPriority="high"
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
            <LandingButton href="#ingressos" size="large">
              Garantir Ingresso
            </LandingButton>
            <LandingButton href="#transmissao" size="large" variant="secondary">
              Saiba mais
            </LandingButton>
          </div>
        </div>

        <div className="event-bar">
          <div className="event-bar__facts">
            {eventFacts.map((fact) => (
              <div className="event-fact" key={fact.label}>
                <span className="event-fact__label">{fact.label}</span>
                <span className="event-fact__value">
                  {fact.icon ? (
                    <img className="event-fact__value-icon" src={fact.icon} alt="" />
                  ) : null}
                  <span>{fact.value}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="event-bar__icon">
            <img src={streamIcon} alt="" />
          </div>
        </div>
      </section>

      <section className="section section--proof" data-nav-section="evento">
        <div className="section__headline section__headline--centered">
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

        <div className="feature-grid">
          {featureCards.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <img className="feature-card__icon" src={feature.icon} alt="" />
              <h3 className="feature-card__title">{feature.title}</h3>
              <p className="feature-card__copy">{feature.copy}</p>
            </article>
          ))}
        </div>

        <LandingButton href="#ingressos" size="large">
          Garantir Ingresso
        </LandingButton>
      </section>

      <section className="section section--transmission" data-nav-section="transmissao" id="transmissao">
        <div className="transmission-copy">
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

        <div className="transmission-gallery" aria-label="Momentos da transmissão">
          {transmissionTiles.map((tile) => (
            <article className={tile.className} key={tile.title}>
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
      </section>

      <section className="section section--casters" data-nav-section="transmissao" id="casters">
        <div className="section__headline section__headline--centered">
          <SectionEyebrow centered>Nossos casters</SectionEyebrow>
          <h2 className="display-title display-title--secondary">
            Conheça os responsáveis por essa parada
          </h2>
        </div>

        <div className="casters-grid">
          {casterCards.map((caster) => (
            <article className="caster-card" key={caster.name}>
              <div className="caster-card__visual">
                <Image
                  alt={caster.name}
                  className="caster-card__image"
                  fill
                  sizes="(max-width: 780px) 100vw, 352px"
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
      </section>

      <section className="section section--tickets" data-nav-section="ingressos" id="ingressos">
        <div className="section__headline section__headline--centered">
          <SectionEyebrow centered>Ingressos</SectionEyebrow>

          <h2 className="display-title display-title--proof">Moicano wants money!!!</h2>

          <p className="body-copy body-copy--lead">
            Meu brother, esse evento tá muito caro e o agiota já tá me cobrando
            aqui. Ajuda nois comprando teu ingresso.
          </p>
        </div>

        <div className="ticket-grid">
          {ticketTiers.map((tier) => (
            <article
              className={tier.featured ? "ticket-card ticket-card--featured" : "ticket-card"}
              key={tier.name}
            >
              <span className="ticket-card__label">{tier.label}</span>

              <div className="ticket-card__price-block">
                <h3 className="ticket-card__name">{tier.name}</h3>
                <p className="ticket-card__price">{tier.price}</p>
              </div>

              <ul className="ticket-card__list">
                {tier.features.map((feature) => (
                  <li className="ticket-card__item" key={feature}>
                    {feature}
                  </li>
                ))}
              </ul>

              <LandingButton
                href="#evento"
                size="large"
                variant={tier.featured ? "light" : "secondary"}
              >
                {tier.buttonLabel}
              </LandingButton>
            </article>
          ))}
        </div>
      </section>

      <section className="section section--audience" data-nav-section="publico" id="publico">
        <div className="audience-media">
          <Image
            alt="Audiência internacional do Money Moicano MMA"
            className="audience-media__image"
            fill
            sizes="(max-width: 980px) 100vw, 535px"
            src="/assets/landing/figma/audiencia-internacional.png"
          />
        </div>

        <div className="audience-copy">
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

          <LandingButton href="#ingressos" size="large">
            Garantir Ingresso
          </LandingButton>
        </div>
      </section>

      <section className="section section--cta" data-nav-section="publico">
        <div className="newsletter-panel">
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
        <h2 className="sponsors__heading" id="sponsors-title">
          Nossos parceiros:
        </h2>

        <div className="partners-row" aria-label="Parceiros do evento">
          {partners.map((partner) => (
            <div className={partner.className} key={partner.name}>
              <img src={partner.logo} alt={partner.name} />
            </div>
          ))}
        </div>

        <LandingButton href="#contato" size="large" variant="secondary">
          Quero ser um parceiro
        </LandingButton>
      </section>

      <footer className="footer" data-nav-section="publico">
        <div className="footer__row">
          <BrandMark />

          <nav className="footer__nav" aria-label="Footer">
            {footerLinks.map((item) => (
              <a className="footer__link" href={item.href} key={item.label}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="footer__social" aria-label="Redes sociais">
            {socialLinks.map((item) => (
              <a className="footer__social-link" href={item.href} key={item.label}>
                <img src={item.icon} alt={item.label} />
              </a>
            ))}
          </div>
        </div>

        <BrandMark className="footer__wordmark" wide />
      </footer>

      <div className="mobile-sticky-cta">
        <div className="mobile-sticky-cta__copy">
          <span className="mobile-sticky-cta__label">Ingressos</span>
          <strong className="mobile-sticky-cta__value">A partir de R$ 120</strong>
        </div>
        <a className="landing-button landing-button--primary landing-button--mobile-fixed" href="#ingressos">
          Garantir
        </a>
      </div>
    </main>
  );
}
