import type { Metadata } from "next";

import { PressNewsletterForm } from "@/app/components/press-newsletter-form";
import { SitePageShell } from "@/app/components/site-page-shell";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  path: "/imprensa",
  title: "Imprensa | Money Moicano MMA",
  description:
    "Cadastro da lista de imprensa do Money Moicano MMA para receber releases, avisos de credenciamento e materiais oficiais.",
  keywords: ["credenciamento de imprensa", "release de MMA", "newsletter de imprensa"]
});

export default function ImprensaPage() {
  return (
    <SitePageShell
      actions={[
        {
          href: "#cadastro",
          label: "Entrar na lista",
          variant: "primary"
        },
        {
          href: "/contato",
          label: "Contato geral",
          variant: "secondary"
        }
      ]}
      accent="Credenciada"
      contentId="cadastro"
      description="Se o assunto for cobertura, credencial, release, novidade de card ou material oficial, o caminho certo é a newsletter de imprensa. Entrou na lista, a equipe chama por ali."
      eyebrow="Canal de imprensa"
      heroAside={{
        kicker: "O que entra na lista",
        title: "Menos ruído, mais informação útil",
        body: "A lista foi pensada para quem realmente cobre, publica, produz ou organiza pauta ligada ao evento.",
        items: [
          "Avisos de credenciamento e abertura de janelas",
          "Atualizações de card, transmissão e agenda oficial",
          "Materiais de apoio, releases e direcionamentos da equipe"
        ]
      }}
      sidebar={<PressNewsletterForm />}
      title="Imprensa"
    >
      <section>
        <h2>Cadastro direto para a cobertura</h2>
        <p>
          Em vez de abrir um canal separado, a página de imprensa centraliza tudo na newsletter
          oficial da cobertura. Assim a equipe consegue manter avisos, releases e orientações no
          mesmo fluxo.
        </p>
      </section>

      <section>
        <h2>Quando usar esta página</h2>
        <ul>
          <li>Para receber novidades oficiais do evento com contexto e antecedência.</li>
          <li>Para entrar na base usada pela equipe quando houver comunicado para imprensa.</li>
          <li>Para evitar desencontro entre mensagem avulsa, direct perdido e e-mail solto.</li>
        </ul>
      </section>

      <section>
        <h2>Como a equipe trata esse cadastro</h2>
        <p>
          O nome é coletado junto com o e-mail para facilitar a identificação da redação, do
          criador ou do profissional responsável pela pauta. Isso deixa o contato mais limpo quando
          a equipe precisar responder ou priorizar envios.
        </p>
      </section>
    </SitePageShell>
  );
}
