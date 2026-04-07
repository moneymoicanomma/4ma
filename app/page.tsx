import Image from "next/image";

import { LandingTopbar } from "./components/landing-topbar";

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
const globeIcon =
  "/assets/landing/Astronomy-Earth-Rotation--Streamline-Ultimate.svg";
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
  { label: "Localização", value: "São Paulo, Brasil" },
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
    image: "/assets/landing/figma/transmissao-comentarios.png",
    accentImage: "/assets/landing/figma/transmissao-overlay.png",
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
    title: "Pelo menos vai ter luta boa",
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
  },
  {
    name: "Tarso Doria",
    copy: "Precisava de mais um aleatório aqui.",
    image: "/assets/landing/figma/caster-tarso-doria.png",
    imagePosition: "center 18%"
  }
];

const ticketTiers = [
  {
    label: "Acesso Padrão",
    name: "Pista",
    price: "R$ 120",
    features: ["Acesso ao setor pista", "Bares exclusivos", "Visão frontal"],
    buttonLabel: "Saiba mais"
  },
  {
    label: "Mais popular",
    name: "VIP",
    price: "R$ 450",
    features: [
      "Cadeira ao lado da grade",
      "Open bar (cerveja & água)",
      "Kit Moicano exclusivo",
      "Entrada sem fila"
    ],
    buttonLabel: "Garantir Ingresso",
    featured: true
  },
  {
    label: "Premium",
    name: "Camarote",
    price: "R$ 800",
    features: [
      "Vista panorâmica elevada",
      "Buffet completo",
      "Meet & greet atletas",
      "Estacionamento VIP"
    ],
    buttonLabel: "Saiba mais"
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

const sponsorSlots = [
  {
    tag: "Cota master",
    name: "Sua marca aqui",
    copy: "Exposição principal no cage, backdrop, transmissão e peças de campanha."
  },
  {
    tag: "Naming rights",
    name: "Presented by",
    copy: "Assinatura de naming em toda a comunicação do evento e ativações no local."
  },
  {
    tag: "Parceiro oficial",
    name: "Hospitality",
    copy: "Área premium, credenciais e presença de marca em recepção e experiência VIP."
  },
  {
    tag: "Mídia parceira",
    name: "Co-stream",
    copy: "Inserções em conteúdos, cortes oficiais e amplificação com creators convidados."
  },
  {
    tag: "Produto oficial",
    name: "Merch + sampling",
    copy: "Distribuição de produto, kits e integração com ativações de arena."
  },
  {
    tag: "Patrocínio técnico",
    name: "Equipamento",
    copy: "Uniformes, estrutura, performance e presença visual nas áreas de operação."
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
                <span className="event-fact__value">{fact.value}</span>
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

      <section className="section section--transmission" data-nav-section="transmissao" id="transmissao">
        <div className="transmission-copy">
          <SectionEyebrow>Transmissão de qualidade duvidosa</SectionEyebrow>

          <h2 className="display-title display-title--closing">
            <span>Uma pegada que não existe</span>
            <span>em mais</span>
            <span className="is-highlight">lugar nenhum.</span>
          </h2>

          <p className="body-copy body-copy--muted">
            Não é podcast profissional, nem amador. É o meio-termo que o MMA
            precisava.
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
                {tile.accentImage ? (
                  <Image
                    alt=""
                    className="transmission-tile__image transmission-tile__image--offset"
                    fill
                    sizes={tile.sizes}
                    src={tile.accentImage}
                  />
                ) : null}
                <span className="transmission-tile__overlay" />
              </div>
              <h3 className="transmission-tile__title">{tile.title}</h3>
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
            <span>Os gringos vão</span>
            <span>ver o que é evento</span>
            <span className="display-title__line">
              de <span className="display-title__accent">qualidade</span>
            </span>
          </h2>

          <p className="body-copy audience-copy__body">
            O Money Moicano MMA rompeu fronteiras. Nossa transmissão atinge o mundo
            todo, consolidando uma base fiel de fãs globais que buscam a verdadeira
            essência da luta.
          </p>

          <div className="audience-copy__meta">
            <img src={globeIcon} alt="" />
            <span>Transmissão em 2 idiomas</span>
          </div>
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

          <form className="newsletter-form">
            <label className="visually-hidden" htmlFor="newsletter-email">
              Seu e-mail
            </label>
            <input
              className="newsletter-form__input"
              id="newsletter-email"
              name="email"
              placeholder="SEUEMAIL@GMAIL.COM"
              type="email"
              autoComplete="email"
            />
            <button className="newsletter-form__button" type="button">
              Inscrever-se
            </button>
          </form>
        </div>
      </section>

      <section
        aria-labelledby="sponsors-title"
        className="section section--sponsors"
        data-nav-section="publico"
      >
        <div className="section__headline section__headline--centered">
          <SectionEyebrow centered>Patrocinadores</SectionEyebrow>
          <h2 className="display-title display-title--secondary" id="sponsors-title">
            Espaço reservado para as marcas que querem aparecer do lado certo da pancadaria
          </h2>
          <p className="body-copy body-copy--muted sponsors__copy">
            Placeholder com hover para mapear cotas e posicionamentos antes de fechar
            os patrocinadores oficiais.
          </p>
        </div>

        <div className="sponsors-marquee">
          <div className="sponsors-track">
            {[...sponsorSlots, ...sponsorSlots].map((slot, index) => (
              <article className="sponsor-slot" key={`${slot.tag}-${slot.name}-${index}`} tabIndex={0}>
                <span className="sponsor-slot__tag">{slot.tag}</span>
                <h3 className="sponsor-slot__name">{slot.name}</h3>
                <p className="sponsor-slot__copy">{slot.copy}</p>
                <div className="sponsor-slot__meta">
                  <span className="sponsor-slot__hover-label">Disponível</span>
                  <span className="sponsor-slot__hover-copy">Marca parceira em destaque</span>
                </div>
              </article>
            ))}
          </div>
        </div>
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
