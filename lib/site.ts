import type { MetadataRoute } from "next";

export const siteUrl = "https://moneymoicanomma.com.br";

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
    priority: 1
  },
  {
    href: "/fantasy",
    title: "Fantasy Card",
    description:
      "Área pública para montar picks, acompanhar ranking oficial e ver o card atual do fantasy.",
    changeFrequency: "daily",
    priority: 0.9
  },
  {
    href: "/lute-no-mmmma",
    title: "Lute no MMMMA",
    description:
      "Formulário público para atletas interessados entrarem no radar do evento.",
    changeFrequency: "weekly",
    priority: 0.8
  },
  {
    href: "/seja-um-parceiro",
    title: "Seja um parceiro",
    description:
      "Página comercial para marcas e empresas interessadas em patrocínios e ações com o evento.",
    changeFrequency: "weekly",
    priority: 0.7
  },
  {
    href: "/mapa-do-site",
    title: "Mapa do site",
    description:
      "Índice público com os acessos principais do Money Moicano MMA.",
    changeFrequency: "monthly",
    priority: 0.5
  }
];

export const homepageSectionLinks = [
  {
    href: "/#evento",
    label: "O evento",
    description: "Visão geral do card, data, local e proposta do MMMMA."
  },
  {
    href: "/#transmissao",
    label: "A transmissão",
    description: "Produções, momentos da cobertura e identidade da transmissão."
  },
  {
    href: "/#ingressos",
    label: "Ingressos",
    description: "Setores, faixas de preço e CTA para compra."
  },
  {
    href: "/#publico",
    label: "Público e parceiros",
    description: "Audience, newsletter e patrocinadores do evento."
  }
] as const;

export const restrictedAreaNotes = [
  "A área privada dos atletas confirmados fica fora do índice público.",
  "As rotas administrativas do fantasy não entram em sitemap nem navegação aberta.",
  "Endpoints de API e sessões operacionais ficam bloqueados para indexação."
] as const;
