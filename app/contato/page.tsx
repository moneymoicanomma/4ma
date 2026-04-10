import type { Metadata } from "next";

import { ContactForm } from "@/app/components/contact-form";
import { SitePageShell } from "@/app/components/site-page-shell";

export const metadata: Metadata = {
  title: "Contato | Money Moicano MMA",
  description:
    "Canal de contato geral para mensagens enviadas à equipe do Money Moicano MMA.",
  alternates: {
    canonical: "/contato"
  }
};

export default function ContatoPage() {
  return (
    <SitePageShell
      actions={[
        {
          href: "#formulario",
          label: "Enviar mensagem",
          variant: "primary"
        },
        {
          href: "mailto:contato@moneymoicanomma.com.br",
          label: "Escrever direto",
          variant: "secondary"
        }
      ]}
      accent="Equipe"
      contentId="formulario"
      description="Assunto geral, dúvida operacional, proposta, pedido rápido ou qualquer tema que não caia em outra trilha do site. Preenche o formulário e a equipe recebe no canal de contato do projeto."
      eyebrow="Contato"
      heroAside={{
        kicker: "Destino da mensagem",
        title: "Caixa central da equipe",
        body: "O formulário encaminha a demanda para o contato geral do projeto e ajuda a organizar resposta sem perder contexto.",
        items: [
          "Destino principal: contato@moneymoicanomma.com.br",
          "Melhor para temas gerais, alinhamentos e dúvidas rápidas",
          "Se for imprensa, o fluxo preferido continua sendo a newsletter de imprensa"
        ]
      }}
      sidebar={<ContactForm />}
      title="Fale com a"
    >
      <section>
        <h2>Canal certo para o que não tem trilha própria</h2>
        <p>
          O site já separa atleta, parceria e imprensa. O formulário de contato cobre o resto:
          mensagem institucional, pedido pontual, dúvida de operação, convite, oportunidade ou
          qualquer tema geral que precise cair na caixa da equipe.
        </p>
      </section>

      <section>
        <h2>Como funciona</h2>
        <ul>
          <li>Você manda nome, e-mail, assunto e a mensagem completa.</li>
          <li>A equipe recebe isso no fluxo ligado ao contato@moneymoicanomma.com.br.</li>
          <li>Se o tema pedir outra frente, o encaminhamento interno acontece depois.</li>
        </ul>
      </section>

      <section>
        <h2>Quando vale usar outro caminho</h2>
        <p>
          Se for credenciamento ou material para cobertura, use a página de imprensa. Se for
          patrocínio, ativações ou collab comercial, a página de parceria continua sendo a melhor
          entrada para a conversa.
        </p>
      </section>
    </SitePageShell>
  );
}
