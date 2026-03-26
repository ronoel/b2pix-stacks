import { Component, signal } from '@angular/core';

interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-faq-section',
  imports: [],
  templateUrl: './faq-section.component.html',
  styleUrl: './faq-section.component.scss'
})
export class FaqSectionComponent {
  expandedIndex = signal<number | null>(null);

  readonly faqItems: FaqItem[] = [
    {
      question: 'O que é o B2PIX?',
      answer: 'O B2PIX é uma carteira de autocustódia de Bitcoin feita para o seu dia a dia. A plataforma reúne protocolos descentralizados e seguros para que você tenha acesso aos recursos da blockchain com facilidade e segurança — sem depender de corretoras ou exchanges.'
    },
    {
      question: 'Preciso fazer KYC?',
      answer: 'Não é necessário KYC para usar o aplicativo. A verificação de conta bancária é exigida apenas para compras e vendas de Bitcoin utilizando PIX, através do protocolo P2P.'
    },
    {
      question: 'O que posso fazer com o B2PIX?',
      answer: 'Você pode usar Bitcoin no dia a dia assim como usa o PIX: pagar as contas da casa, comprar em e-commerces, guardar valor para o futuro, enviar Bitcoin para qualquer pessoa e, claro, comprar e vender Bitcoin.'
    },
    {
      question: 'E quanto aos impostos?',
      answer: 'O B2PIX é um protocolo descentralizado. Não deduzimos nem reportamos impostos ou informações ao governo. A responsabilidade de cumprir as leis fiscais locais é inteiramente sua. A plataforma fornece histórico completo de transações para facilitar sua declaração.'
    },
    {
      question: 'Meu Bitcoin está seguro?',
      answer: 'Sim. O B2PIX é de autocustódia — só você tem as chaves da sua carteira. Seus fundos nunca passam por nós. Ninguém pode congelar, bloquear ou confiscar seu Bitcoin.'
    },
    {
      question: 'Como funcionam as transações?',
      answer: 'Nenhum valor financeiro é intermediado pela plataforma. Todas as transações acontecem diretamente entre as partes envolvidas, de pessoa para pessoa (P2P). O B2PIX apenas conecta os protocolos — o dinheiro nunca passa por nós.'
    },
    {
      question: 'Quais são as taxas?',
      answer: 'As taxas variam de acordo com as condições de mercado e a liquidez disponível. A plataforma sempre apresenta o valor aproximado antes de confirmar qualquer operação — sem surpresas.'
    }
  ];

  toggle(index: number): void {
    this.expandedIndex.update(current => current === index ? null : index);
  }
}
