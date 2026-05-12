import type { Metadata } from "next";

import { PressCredentialForm } from "@/app/components/press-credential-form";
import { SitePageShell } from "@/app/components/site-page-shell";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...createPageMetadata({
    path: "/credenciamento-imprensa",
    title: "Credenciamento de Imprensa | Money Moicano MMA",
    description:
      "Formulário operacional de credenciamento de imprensa para cobertura do Money Moicano MMA 1.",
    keywords: ["credenciamento de imprensa", "Money Moicano MMA", "cobertura de MMA"],
  }),
  robots: {
    index: false,
    follow: false,
  },
};

export default function CredenciamentoImprensaPage() {
  return (
    <SitePageShell
      actions={[
        {
          href: "#cadastro",
          label: "Enviar cadastro",
          variant: "primary",
        },
        {
          href: "/imprensa",
          label: "Canal de imprensa",
          variant: "secondary",
        },
      ]}
      accent="Imprensa"
      contentId="cadastro"
      description="Cadastro operacional para profissionais e veículos que querem cobrir o Money Moicano MMA 1. A equipe usa essas informações para revisar demanda, acesso e necessidades de cobertura."
      eyebrow="Credenciamento"
      heroAside={{
        kicker: "Money Moicano MMA 1",
        title: "Informação completa acelera a revisão",
        body: "O envio não confirma credencial automaticamente. Ele organiza os dados para a equipe validar cobertura, veículo, documento e necessidades operacionais.",
        items: [
          "Preencha com o e-mail que será usado pela equipe para retorno.",
          "Inclua links do veículo, perfil, canal ou publicação quando houver.",
          "Descreva equipamentos, horários e demandas de acesso com objetividade.",
        ],
      }}
      sidebar={<PressCredentialForm />}
      title="Cadastro"
    >
      <section>
        <h2>Antes de enviar</h2>
        <p>
          Este formulário substitui o cadastro externo e grava a solicitação direto no banco do
          site. Use dados reais, porque a equipe pode conferir documento, veículo e finalidade da
          cobertura antes de liberar qualquer orientação de acesso.
        </p>
      </section>

      <section>
        <h2>O que será analisado</h2>
        <ul>
          <li>Identificação do profissional responsável pela cobertura.</li>
          <li>Veículo, perfil, canal ou links ligados à publicação.</li>
          <li>Tipo de cobertura planejada e necessidade operacional no evento.</li>
        </ul>
      </section>

      <section>
        <h2>Retorno da equipe</h2>
        <p>
          Depois do envio, o cadastro entra como novo registro no painel interno. Se houver avanço,
          pedido de complemento ou recusa, o contato será feito pelo e-mail informado no formulário.
        </p>
      </section>
    </SitePageShell>
  );
}
