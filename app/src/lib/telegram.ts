// Serviço de integração com Telegram
// Envia mensagens diretamente via Bot API do Telegram
// O BOT_TOKEN aqui é conhecido pelo cliente - para produção, considere uso de proxy/servidor

const BOT_TOKEN = "8698954274:AAGdTPd5IFHANsS9wNDr61aqG5kDwRXWFX8";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export const telegramService = {
  /**
   * Envia uma mensagem para um chat_id do Telegram
   */
  async sendMessage(chatId: string, text: string): Promise<boolean> {
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

    for (const m of moradores) {
      if (!m.telegram_id) continue;

      const linhas = [
        `📦 <b>Nova Encomenda na Portaria!</b>`,
        ``,
        `Olá, <b>${m.nome}</b>! Sua encomenda chegou. 🏠`,
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
      const sent = await this.sendMessage(m.telegram_id, message);
      if (sent) {
        notificados.push(m.nome);
      }
    }

    return notificados;
  },
};

