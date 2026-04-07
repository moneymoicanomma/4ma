const heroImage =
  "https://www.figma.com/api/mcp/asset/83fa3342-e3d2-442b-be31-facae874d567";
const audienceFaceOne =
  "https://www.figma.com/api/mcp/asset/49be92e1-ced0-4a86-b3b7-67c8d918cead";
const audienceFaceTwo =
  "https://www.figma.com/api/mcp/asset/fddbddd5-1703-4e7f-a2cb-a233135a6775";
const audienceFaceThree =
  "https://www.figma.com/api/mcp/asset/8a90f70f-556d-4704-858a-fe75231a6060";
const audienceFaceFour =
  "https://www.figma.com/api/mcp/asset/d16270ce-5405-421c-a628-ae3c2c95b65a";
const brandLogo = "/assets/landing/logo money moicano mma.svg";
const streamIcon =
  "/assets/landing/Video-Game-Logo-Streamplay--Streamline-Ultimate.svg";
const fightsIcon =
  "/assets/landing/Fists-Crashing-Conflict--Streamline-Ultimate.svg";
const stadiumIcon =
  "/assets/landing/Stadium-Classic-2--Streamline-Ultimate.svg";
const microphoneIcon =
  "/assets/landing/Microphone-Podcast-2--Streamline-Ultimate.svg";

const navItems = [
  { label: "O Evento", href: "#evento", active: true },
  { label: "A Transmissão", href: "#transmissao" },
  { label: "Ingressos", href: "#ingressos" },
  { label: "Alcance", href: "#alcance" }
];

const eventFacts = [
  { label: "Data do Evento", value: "30. MAIO. 2026" },
  { label: "Localização", value: "CORNEMAN, SÃO PAULO" },
  { label: "Transmissão", value: "RENATO MONEY MOICANO" }
];

const featureCards = [
  {
    icon: fightsIcon,
    title: "Lutas Que Valem Assistir",
    copy:
      "Confrontos casados com critério técnico real. Nada de enchimento de card, nada de luta fácil. Cada combate tem história, tem nível e tem motivo pra estar no card."
  },
  {
    icon: streamIcon,
    title: "Transmissão Que Não Escapa Nada",
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
    title: "Um Comentário Que Você Nunca Viu",
    copy:
      "Arena, estrutura profissional, pesagem, entrada dos atletas e toda a cerimônia que transforma uma luta em um espetáculo de verdade."
  }
];

const audienceFaces = [
  audienceFaceOne,
  audienceFaceTwo,
  audienceFaceThree,
  audienceFaceFour
];

type ButtonVariant = "primary" | "secondary" | "nav";
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
    `landing-button--${size}`
  ].join(" ");

  return (
    <a className={className} href={href} id={id}>
      {children}
    </a>
  );
}

function BrandMark() {
  return (
    <div className="brand-mark" aria-label="Money Moicano MMA">
      <img src={brandLogo} alt="Money Moicano MMA" />
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
      <header className="topbar">
        <BrandMark />

        <nav className="topbar__nav" aria-label="Primary">
          {navItems.map((item) => (
            <a
              className={item.active ? "topbar__link is-active" : "topbar__link"}
              href={item.href}
              key={item.label}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <LandingButton href="#ingressos" variant="nav">
          Comprar Ingressos
        </LandingButton>
      </header>

      <section className="hero" id="evento">
        <div className="hero__image-shell" aria-hidden="true">
          <img className="hero__image" src={heroImage} alt="" />
        </div>
        <div className="hero__scrim" />

        <div className="hero__content">
          <SectionEyebrow>O evento que o MMA brasileiro precisava</SectionEyebrow>

          <h1 className="hero__title">
            <span>Porrada sincera</span>
            <span className="is-highlight">sem filtro.</span>
          </h1>

          <p className="body-copy hero__copy">
            O Money Moicano MMA é um evento profissional de MMA comandado por Renato
            Moicano, atleta do UFC, comentarista sem filtro e dono do canal que
            explodiu o YouTube Brasil. Lutas reais. Transmissão ao vivo. Sem
            paciência pra choro.
          </p>

          <div className="hero__actions">
            <LandingButton href="#ingressos" id="ingressos" size="large">
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
                <span className="event-fact__value">{fact.value}</span>
              </div>
            ))}
          </div>

          <div className="event-bar__icon">
            <img src={streamIcon} alt="" />
          </div>
        </div>
      </section>

      <section className="section section--proof" id="alcance">
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
            Lutas reais. Estrutura profissional. Arbitragem capacitada. E uma
            transmissão que mistura análise técnica com o humor sem filtro que o MMA
            brasileiro nunca teve.
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

      <section className="section section--transmission" id="transmissao">
        <div className="transmission-copy">
          <SectionEyebrow>Transmissão de qualidade duvidosa</SectionEyebrow>

          <h2 className="display-title display-title--closing">
            <span>Uma pegada que não existe</span>
            <span>em mais</span>
            <span className="is-highlight">lugar nenhum.</span>
          </h2>

          <div className="avatar-stack" aria-hidden="true">
            {audienceFaces.map((avatar, index) => (
              <img
                className="avatar-stack__item"
                key={avatar}
                src={avatar}
                alt=""
                style={{ zIndex: audienceFaces.length - index }}
              />
            ))}
          </div>

          <p className="body-copy body-copy--muted">
            Não é podcast profissional nem amador. É o meio-termo que o MMA
            precisava.
          </p>
        </div>

        <div className="media-mosaic" aria-hidden="true">
          <div className="media-mosaic__tile media-mosaic__tile--small" />
          <div className="media-mosaic__tile media-mosaic__tile--small" />
          <div className="media-mosaic__tile media-mosaic__tile--tall" />
        </div>
      </section>
    </main>
  );
}
