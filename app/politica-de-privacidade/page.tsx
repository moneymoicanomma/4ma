import type { Metadata } from "next";

import { SitePageShell } from "@/app/components/site-page-shell";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  path: "/politica-de-privacidade",
  title: "Política de Privacidade | Money Moicano MMA",
  description:
    "Politica de privacidade e regras de tratamento de dados do site oficial do Money Moicano MMA.",
  keywords: ["privacidade", "tratamento de dados", "LGPD evento"]
});

export default function PoliticaDePrivacidadePage() {
  return (
    <SitePageShell
      actions={[
        {
          href: "/contato",
          label: "Falar com a equipe",
          variant: "primary"
        },
        {
          href: "/termos-de-uso",
          label: "Ver termos de uso",
          variant: "secondary"
        }
      ]}
      accent="Privacidade"
      description="Esta política resume como o site coleta, usa, armazena e protege dados enviados nas páginas públicas do Money Moicano MMA. Atualizada em 10 de abril de 2026."
      eyebrow="Documento institucional"
      heroAside={{
        kicker: "Leitura rápida",
        title: "O básico sem juridiquês infinito",
        body: "A equipe usa os dados para operar o site, responder contatos, organizar cadastros e tocar comunicações ligadas ao evento.",
        items: [
          "Coleta apenas o necessário para cada formulário",
          "Uso voltado à operação do evento e comunicação relacionada",
          "Pedido de revisão ou exclusão pode ser feito pelo contato oficial"
        ]
      }}
      title="Política de"
    >
      <section>
        <h2>1. Dados que podem ser coletados</h2>
        <p>
          O site pode coletar dados fornecidos diretamente por você, como nome, e-mail, telefone,
          empresa, mensagem, perfis públicos e demais informações enviadas em formulários de
          contato, parceria, imprensa, newsletter, fantasy e inscrição de atletas.
        </p>
        <p>
          Também podem ser registrados dados técnicos de navegação e segurança, como IP mascarado,
          origem da requisição, identificador de pedido, dispositivo, navegador e sinais usados
          para prevenção de abuso.
        </p>
      </section>

      <section>
        <h2>2. Finalidades do uso</h2>
        <ul>
          <li>Responder mensagens, pedidos e inscrições enviados pelo próprio usuário.</li>
          <li>Operar o site, manter segurança, prevenção de fraude e auditoria básica.</li>
          <li>Enviar novidades, avisos e materiais quando houver consentimento ou base adequada.</li>
          <li>Organizar relacionamento com atletas, imprensa, parceiros, público e fornecedores.</li>
        </ul>
      </section>

      <section>
        <h2>3. Compartilhamento e acesso interno</h2>
        <p>
          Os dados podem ser acessados pela equipe responsável pela operação do evento e por
          prestadores que ajudem na infraestrutura, atendimento, tecnologia, produção, mídia,
          credenciamento e comunicações relacionadas ao Money Moicano MMA, sempre dentro da
          necessidade operacional do serviço.
        </p>
      </section>

      <section>
        <h2>4. Ciência para ser zoado, quando aplicável</h2>
        <p>
          Alguns fluxos do projeto podem incluir envio voluntário de histórias, curiosidades,
          descrições pessoais, apelidos, vídeos, áudios ou respostas com tom informal. Quando
          existir campo de ciência, autorização ou consentimento específico para uso editorial,
          comentário, corte, brincadeira, resenha ou zoeira pública, esse uso fica limitado ao que
          foi claramente aceito naquele formulário.
        </p>
        <p>
          Em outras palavras: a zoeira não é automática nem universal. Ela depende do contexto e da
          ciência dada por você no envio correspondente.
        </p>
      </section>

      <section>
        <h2>5. Retenção, segurança e direitos</h2>
        <p>
          Os dados são mantidos pelo tempo necessário para cumprir as finalidades do projeto, atender
          obrigações legais, proteger a operação e preservar histórico mínimo de auditoria. O site
          adota medidas razoáveis de segurança técnica e organizacional, mas nenhum ambiente online é
          absolutamente imune a risco.
        </p>
        <p>
          Para solicitar atualização, correção, exclusão, revisão de consentimento ou mais
          informações sobre tratamento de dados, use o canal oficial em{" "}
          <a href="mailto:contato@moneymoicanomma.com.br">contato@moneymoicanomma.com.br</a>.
        </p>
      </section>
    </SitePageShell>
  );
}
