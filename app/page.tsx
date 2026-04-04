const heroImage =
  "https://www.figma.com/api/mcp/asset/28f457c3-5c11-402f-8858-c361f59ee360";
const logoMark =
  "https://www.figma.com/api/mcp/asset/d1618739-88dc-4cbb-b3c4-a5bedf9fb4f3";
const logoMarkBottom =
  "https://www.figma.com/api/mcp/asset/9127816b-cd15-4291-ab44-e7542cf82540";
const logoMarkSide =
  "https://www.figma.com/api/mcp/asset/674770fc-00b1-42ea-af83-df1268c79219";
const streamIcon =
  "https://www.figma.com/api/mcp/asset/f80157ec-a9eb-4491-8e3a-6c4952a84f7b";
const fightIcon =
  "https://www.figma.com/api/mcp/asset/b325dc4d-0e33-4d14-910f-96e6d61e0abb";
const arenaIcon =
  "https://www.figma.com/api/mcp/asset/7fe25bad-7400-4e36-a33a-56c60c24e435";
const podcastIcon =
  "https://www.figma.com/api/mcp/asset/8ed9edd4-e654-499b-9681-b080b792840c";

const navItems = [
  { label: "O Evento", href: "#evento", active: true },
  { label: "A Transmissão", href: "#transmissao" },
  { label: "Ingressos", href: "#ingressos" },
  { label: "Alcance", href: "#alcance" }
];

const facts = [
  { label: "Data do Evento", value: "30. maio. 2026" },
  { label: "Localização", value: "Corneman, São Paulo" },
  { label: "Transmissão", value: "Renato Money Moicano" }
];

const features = [
  {
    icon: fightIcon,
    title: "Lutas que Valem Assistir",
    copy:
      "Confrontos casados com critério técnico real. Nada de enchimento de card, nada de luta fácil. Cada combate tem história, tem nível e tem motivo pra estar no card."
  },
  {
    icon: streamIcon,
    title: "Transmissão Que Não Escapa Nada",
    copy:
      "Replay, estatísticas, câmeras no cage e comentários ao vivo. Você assiste de casa e sente que está na arena, só que sem levar porrada."
  },
  {
    icon: arenaIcon,
    title: "Atmosfera de Evento Grande",
    copy:
      "Arena, estrutura profissional, pesagem, entrada dos atletas e toda a cerimônia que transforma uma luta em um espetáculo de verdade."
  },
  {
    icon: podcastIcon,
    title: "Um Comentário Que Você Nunca Viu",
    copy:
      "Técnica, provocação e humor sem filtro numa transmissão com personalidade própria, feita para quem acompanha luta de verdade."
  }
];

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="section-eyebrow">
      <span className="section-eyebrow__line" />
      <span>{children}</span>
    </div>
  );
}

function BrandMark() {
  return (
    <div className="brand-mark" aria-label="Money Moicano MMA">
      <img src={logoMark} alt="" />
      <img src={logoMarkBottom} alt="" />
      <img src={logoMarkSide} alt="" />
    </div>
  );
}

export default function Home() {
  return (
    <main className="page-shell">
      <header className="topbar">
        <BrandMark />
        <nav className="topbar__nav" aria-label="Seções principais">
          {navItems.map((item) => (
            <a
              key={item.label}
              className={item.active ? "topbar__link is-active" : "topbar__link"}
              href={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <a className="button button--compact" href="#ingressos">
          Comprar Ingressos
        </a>
      </header>

      <section className="hero" id="evento">
        <div className="hero__media">
          <img src={heroImage} alt="Lutadores no cage durante o evento" />
        </div>
        <div className="hero__overlay" />
        <div className="hero__content">
          <SectionEyebrow>O evento que o MMA brasileiro precisava</SectionEyebrow>
          <h1 className="hero__title">
            <span className="hero__title-line">Porrada sincera</span>
            <span className="hero__title-line is-highlight">sem filtro.</span>
          </h1>
          <p className="hero__copy">
            O Money Moicano MMA é um evento profissional de MMA comandado por Renato
            Moicano, atleta do UFC, comentarista sem filtro e dono do canal que
            explodiu o YouTube Brasil. Lutas reais. Transmissão ao vivo. Sem
            paciência pra choro.
          </p>
          <div className="hero__actions">
            <a className="button" href="#ingressos">
              Garantir Ingresso
            </a>
            <a className="button button--ghost" href="#transmissao">
              Saiba mais
            </a>
          </div>
        </div>

        <div className="facts-bar">
          <div className="facts-bar__items">
            {facts.map((fact) => (
              <div className="fact" key={fact.label}>
                <span className="fact__label">{fact.label}</span>
                <strong className="fact__value">{fact.value}</strong>
              </div>
            ))}
          </div>
          <div className="facts-bar__icon">
            <img src={streamIcon} alt="" />
          </div>
        </div>
      </section>

      <section className="section section--centered" id="alcance">
        <div className="section__intro section__intro--wide">
          <div className="section-eyebrow section-eyebrow--centered">
            <span className="section-eyebrow__line" />
            <span>Não é mais um eventinho de MMA</span>
            <span className="section-eyebrow__line" />
          </div>
          <h2 className="section__title section__title--xl">
            Estrutura profissional,
            <br />
            <span className="is-highlight">humor duvidoso</span> &amp;
            <br />
            lutas reais.
          </h2>
          <p className="section__copy section__copy--lead">
            Lutas reais. Estrutura profissional. Arbitragem capacitada. E uma
            transmissão que mistura análise técnica com o humor sem filtro que o
            MMA brasileiro nunca teve.
          </p>
        </div>

        <div className="feature-grid">
          {features.map((feature, index) => (
            <article className="feature-card" key={feature.title} style={{ animationDelay: `${index * 120}ms` }}>
              <img className="feature-card__icon" src={feature.icon} alt="" />
              <h3 className="feature-card__title">{feature.title}</h3>
              <p className="feature-card__copy">{feature.copy}</p>
            </article>
          ))}
        </div>

        <a className="button" href="#ingressos">
          Garantir Ingresso
        </a>
      </section>

      <section className="section section--cta" id="transmissao">
        <div className="section__intro section__intro--narrow">
          <SectionEyebrow>Transmissão de qualidade duvidosa</SectionEyebrow>
          <h2 className="section__title">
            Uma pegada que não existe em mais
            <br />
            <span className="is-highlight">lugar nenhum.</span>
          </h2>
          <p className="section__copy">
            Lutas reais. Estrutura profissional. Arbitragem capacitada. E uma
            transmissão que mistura análise técnica com o humor sem filtro de uma
            resenha braba.
          </p>
        </div>

        <a className="button button--large" id="ingressos" href="#evento">
          Garantir Ingresso
        </a>
      </section>
    </main>
  );
}
