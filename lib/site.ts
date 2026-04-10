import type { MetadataRoute } from "next";

export const siteName = "Money Moicano MMA";
export const siteUrl = "https://moneymoicanomma.com.br";
export const siteDescription =
  "Luta de verdade, dinheiro de verdade. Entre no Money Moicano MMA e acompanhe os cards, o fantasy e as transmissões ao vivo.";
export const siteLocale = "pt_BR";
export const siteLanguage = "pt-BR";
export const defaultOgImagePath = "/opengraph-image";
export const contactEmail = "contato@moneymoicanomma.com.br";
export const xHandle = "@MoneyMoicanoMMA";
export const siteSocialProfiles = [
  "https://x.com/MoneyMoicanoMMA",
  "https://www.instagram.com/moneymoicano.mma/",
  "https://www.youtube.com/@RenatoMoneyMoicano",
] as const;
export const eventDateIso = "2026-05-23";
export const eventDateLabel = "23 de maio de 2026";
export const eventLocationName = "Cornerman";
export const eventLocationCity = "Sao Paulo";

type SitemapChangeFrequency = NonNullable<
  MetadataRoute.Sitemap[number]["changeFrequency"]
>;

export type PublicSiteRoute = {
  href: `/${string}` | "/";
  title: string;
  description: string;
  changeFrequency: SitemapChangeFrequency;
  priority: number;
};

export const publicSiteRoutes: PublicSiteRoute[] = [
  {
    href: "/",
    title: "Home do evento",
    description:
      "Landing principal com proposta do evento, transmissão, ingressos, público e newsletter.",
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    href: "/fantasy",
    title: "Fantasy Card",
    description:
      "Área pública para montar picks, acompanhar ranking oficial e ver o card atual do fantasy.",
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    href: "/lute-no-mmmma",
    title: "Lute no MMMMA",
    description:
      "Formulário público para atletas interessados entrarem no radar do evento.",
    changeFrequency: "weekly",
    priority: 0.8,
  },
  {
    href: "/seja-um-parceiro",
    title: "Seja um parceiro",
    description:
      "Página comercial para marcas e empresas interessadas em patrocínios e ações com o evento.",
    changeFrequency: "weekly",
    priority: 0.7,
  },
  {
    href: "/imprensa",
    title: "Imprensa",
    description:
      "Cadastro da lista de imprensa para receber novidades, avisos e materiais oficiais do Money Moicano MMA.",
    changeFrequency: "weekly",
    priority: 0.7,
  },
  {
    href: "/contato",
    title: "Contato",
    description:
      "Canal direto para enviar mensagens gerais à equipe do Money Moicano MMA.",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    href: "/politica-de-privacidade",
    title: "Política de privacidade",
    description:
      "Regras de coleta, uso e proteção de dados do site e dos formulários do Money Moicano MMA.",
    changeFrequency: "monthly",
    priority: 0.4,
  },
  {
    href: "/termos-de-uso",
    title: "Termos de uso",
    description:
      "Condições de uso do site, formulários e materiais enviados ao Money Moicano MMA.",
    changeFrequency: "monthly",
    priority: 0.4,
  },
];

export const homepageSectionLinks = [
  {
    href: "/#evento",
    label: "O evento",
    description: "Visão geral do card, data, local e proposta do MMMMA.",
  },
  {
    href: "/#transmissao",
    label: "A transmissão",
    description:
      "Produções, momentos da cobertura e identidade da transmissão.",
  },
  {
    href: "/#ingressos",
    label: "Ingressos",
    description: "Setores, faixas de preço e CTA para compra.",
  },
  {
    href: "/#publico",
    label: "Público e parceiros",
    description: "Audience, newsletter e patrocinadores do evento.",
  },
] as const;

export const restrictedAreaNotes = [
  "A área privada dos atletas confirmados fica fora do índice público.",
  "As rotas administrativas do fantasy não entram em sitemap nem navegação aberta.",
  "Endpoints de API, sessões operacionais e o mapa interno do site ficam bloqueados para indexação.",
] as const;
