// Serviço de integração com Telegram
// Em apps puramente frontend o token ainda fica exposto ao cliente. Para produção,
// prefira mover este envio para um backend/proxy.

import { hasTelegramBotToken, runtimeConfig } from './runtimeConfig';

const TELEGRAM_API = hasTelegramBotToken
  ? `https://api.telegram.org/bot${runtimeConfig.telegramBotToken}`
  : null;

export const telegramService = {
  getUniqueTelegramTargets<T extends { nome: string; telegram_id?: string | null }>(moradores: T[]) {
    const grouped = new Map<string, T[]>();

    for (const morador of moradores) {
      if (!morador.telegram_id) continue;

      const current = grouped.get(morador.telegram_id) || [];
      current.push(morador);
      grouped.set(morador.telegram_id, current);
    }

    return Array.from(grouped.entries()).map(([chatId, items]) => ({
      chatId,
      moradores: items,
      nomes: Array.from(new Set(items.map(item => item.nome))).join(', '),
    }));
  },

  /**
   * Envia uma mensagem para um chat_id do Telegram
   */
  async sendMessage(chatId: string, text: string): Promise<boolean> {
    if (!TELEGRAM_API) {
      console.warn('Telegram desabilitado: defina VITE_TELEGRAM_BOT_TOKEN.');
      return false;
    }

    try {
      const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: "HTML",
        }),
      });
      const result = await response.json();
      if (!result.ok) {
        console.error("Erro Telegram:", result.description);
        return false;
      }
      return true;
    } catch (err) {
      console.error("Falha ao enviar mensagem Telegram:", err);
      return false;
    }
  },

  /**
   * Notifica os moradores de uma unidade que uma encomenda chegou
   */
  async notifyDelivery(
    moradores: { nome: string; telegram_id?: string | null }[],
    dados: {
      tipoEntrega: string;
      codigoEntrega?: string;
      transportadora?: string;
      unidade?: string;
      operadorNome?: string;
    }
  ): Promise<string[]> {
    const notificados: string[] = [];
    const agora = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    for (const target of this.getUniqueTelegramTargets(moradores)) {
      const destinatarios = target.nomes;

      const linhas = [
        `📦 <b>Nova Encomenda na Portaria!</b>`,
        ``,
        `Olá, <b>${destinatarios}</b>! Sua encomenda chegou. 🏠`,
        ``,
        `🕑 <b>Chegada:</b> ${agora}`,
        `📋 <b>Tipo:</b> ${dados.tipoEntrega}`,
      ];

      if (dados.codigoEntrega) linhas.push(`🔢 <b>Código:</b> ${dados.codigoEntrega}`);
      if (dados.transportadora) linhas.push(`🚚 <b>Transportadora:</b> ${dados.transportadora}`);
      if (dados.unidade) linhas.push(`🏢 <b>Unidade:</b> ${dados.unidade}`);
      if (dados.operadorNome) linhas.push(`👷 <b>Recebido por:</b> ${dados.operadorNome}`);

      linhas.push(``);
      linhas.push(`Dirija-se à portaria para retirar. ✅`);

      const message = linhas.join('\n');
      const sent = await this.sendMessage(target.chatId, message);
      if (sent) {
        notificados.push(destinatarios);
      }
    }

    return notificados;
  },

  async notifyPickup(
    moradores: { nome: string; telegram_id?: string | null }[],
    dados: {
      codigoEntrega: string;
      tipoEntrega: string;
      retiradoPor: string;
      relacaoMorador?: string;
      unidade?: string;
      operadorNome?: string;
      dataHora?: string;
    }
  ): Promise<string[]> {
    const notificados: string[] = [];
    const dataHora = dados.dataHora ?? new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    for (const target of this.getUniqueTelegramTargets(moradores)) {
      const destinatarios = target.nomes;

      const linhas = [
        `✅ <b>Encomenda Retirada</b>`,
        ``,
        `Olá, <b>${destinatarios}</b>. Registramos uma retirada na portaria.`,
        ``,
        `📦 <b>Código:</b> ${dados.codigoEntrega}`,
        `📋 <b>Tipo:</b> ${dados.tipoEntrega}`,
        `👤 <b>Retirado por:</b> ${dados.retiradoPor}`,
      ];

      if (dados.relacaoMorador) linhas.push(`👥 <b>Relação:</b> ${dados.relacaoMorador}`);
      if (dados.unidade) linhas.push(`🏢 <b>Unidade:</b> ${dados.unidade}`);
      if (dados.operadorNome) linhas.push(`👷 <b>Operador:</b> ${dados.operadorNome}`);
      linhas.push(`🕑 <b>Data/Hora:</b> ${dataHora}`);

      const sent = await this.sendMessage(target.chatId, linhas.join('\n'));
      if (sent) {
        notificados.push(destinatarios);
      }
    }

    return notificados;
  },
};
