import type { Metadata } from "next";

import { SitePageShell } from "@/app/components/site-page-shell";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  path: "/termos-de-uso",
  title: "Termos de Uso | Money Moicano MMA",
  description: "Termos de uso do site e dos formularios publicos do Money Moicano MMA.",
  keywords: ["termos de uso", "regras do site", "condicoes de uso"]
});

export default function TermosDeUsoPage() {
  return (
    <SitePageShell
      actions={[
        {
          href: "/contato",
          label: "Tirar dúvida",
          variant: "primary"
        },
        {
          href: "/politica-de-privacidade",
          label: "Ver privacidade",
          variant: "secondary"
        }
      ]}
      accent="Uso"
      description="Estes termos regulam o uso do site, dos formulários e dos materiais enviados ao Money Moicano MMA. Atualizados em 10 de abril de 2026."
      eyebrow="Documento institucional"
      heroAside={{
        kicker: "Resumo direto",
        title: "Usou o site, aceitou as regras básicas",
        body: "O conteúdo e os formulários existem para operação do projeto, relacionamento com o público e comunicações ligadas ao evento.",
        items: [
          "Não use o site para fraude, spam, abuso ou envio indevido",
          "Dados enviados podem ser tratados pela equipe e por parceiros operacionais",
          "Materiais voluntários seguem o contexto e as permissões informadas no formulário"
        ]
      }}
      title="Termos de"
    >
      <section>
        <h2>1. Aceitação e escopo</h2>
        <p>
          Ao acessar o site ou enviar informações por qualquer formulário do Money Moicano MMA,
          você concorda com estes termos e com a política de privacidade aplicável. Se não concordar
          com as regras, o correto é não utilizar os formulários públicos do projeto.
        </p>
      </section>

      <section>
        <h2>2. Uso adequado do site</h2>
        <ul>
          <li>Não enviar conteúdo falso, ofensivo, ilegal, enganoso ou sem autorização.</li>
          <li>Não tentar contornar segurança, captcha, limites de envio ou restrições técnicas.</li>
          <li>Não usar o site para spam, scraping abusivo, automação maliciosa ou fraude.</li>
        </ul>
      </section>

      <section>
        <h2>3. Dados, equipe e parceiros</h2>
        <p>
          Os dados enviados podem ser usados pela equipe do Money Moicano MMA e por parceiros que
          participem da operação, produção, mídia, atendimento, marketing, tecnologia, credenciamento,
          patrocínio e demais rotinas ligadas ao evento, sempre conforme a finalidade do envio e a
          necessidade operacional.
        </p>
      </section>

      <section>
        <h2>4. Materiais enviados e permissões</h2>
        <p>
          Quando você envia textos, imagens, vídeos, perfis, dados de atleta, mensagens comerciais
          ou materiais de imprensa, declara que tem autorização para esse envio e que o conteúdo não
          viola direito de terceiros. O uso do material dependerá do contexto do formulário e das
          permissões que tenham sido apresentadas no momento do envio.
        </p>
        <p>
          Se houver aceite específico para divulgação, cobertura, republicação, comentário,
          compilação, corte, edição ou zoeira editorial, essa autorização vale dentro dos limites
          descritos naquele fluxo.
        </p>
      </section>

      <section>
        <h2>5. Disponibilidade e contato</h2>
        <p>
          O site pode ser alterado, suspenso, atualizado ou retirado do ar a qualquer momento, com
          ou sem aviso prévio, especialmente por motivo técnico, operacional ou editorial. Para
          dúvidas sobre estes termos, o canal oficial é{" "}
          <a href="mailto:contato@moneymoicanomma.com.br">contato@moneymoicanomma.com.br</a>.
        </p>
      </section>
    </SitePageShell>
  );
}
