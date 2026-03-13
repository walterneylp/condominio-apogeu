// Serviço de polling do Telegram para receber mensagens enviadas ao Bot
// Usando getUpdates para capturar mensagens e processar vínculos de PIN
// Esse worker deve ser iniciado uma vez quando o app carrega

import { supabase } from './supabase';
import { hasTelegramBotToken, runtimeConfig } from './runtimeConfig';

const TELEGRAM_API = hasTelegramBotToken
  ? `https://api.telegram.org/bot${runtimeConfig.telegramBotToken}`
  : null;

let lastUpdateId = 0;
let pollingActive = false;
let pollingInterval: ReturnType<typeof setTimeout> | null = null;

type TelegramUpdate = {
  update_id: number;
  message?: {
    chat: { id: number };
    text?: string;
  };
};

type MoradorLink = {
  id: string;
  nome: string;
  unidade_id?: string | null;
};

type EntregaPendente = {
  id: string;
  codigo_entrega: string;
  tipo_entrega: string;
  status: string;
  morador_id?: string | null;
  unidade_id?: string | null;
  unidades?: { numero?: string | null; bloco?: string | null } | null;
  moradores?: { nome?: string | null } | null;
};

async function sendTelegramMessage(chatId: number, text: string) {
  if (!TELEGRAM_API) return;

  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

async function processUpdate(update: TelegramUpdate) {
  const message = update.message;
  if (!message || !message.text) return;

  const chatId = message.chat.id;
  const text = message.text.trim();

  // Detect PIN (6-digit or /start PIN)
  let pin = "";
  if (text.startsWith("/start ")) {
    pin = text.split(" ")[1];
  } else if (/^\d{6}$/.test(text)) {
    pin = text;
  }

  if (pin) {
    const { data: moradores, error } = await supabase
      .from("moradores")
      .select("id, nome, unidade_id")
      .eq("pin_vinculo_telegram", pin);

    if (error || !moradores || moradores.length === 0) {
      await sendTelegramMessage(chatId, "❌ Código PIN inválido. Verifique com a portaria.");
      return;
    }

    const chatIdText = chatId.toString();
    const moradoresIds = moradores.map((morador: MoradorLink) => morador.id);

    const { error: updateError } = await supabase
      .from("moradores")
      .update({ telegram_id: chatIdText })
      .in("id", moradoresIds);

    if (updateError) {
      await sendTelegramMessage(chatId, "❌ Erro ao vincular sua conta. Tente novamente.");
    } else {
      const nomes = moradores.map((morador: MoradorLink) => morador.nome).join(", ");
      const successMessage = moradores.length === 1
        ? `✅ Olá <b>${nomes}</b>! Sua conta foi vinculada com sucesso! 🎉\n\nVocê receberá notificações aqui sempre que uma encomenda chegar na portaria.\n\nDigite "?" para ver suas encomendas pendentes.`
        : `✅ Este Telegram foi vinculado com sucesso aos seguintes cadastros: <b>${nomes}</b>.\n\nVocê receberá notificações de todos eles por aqui.\n\nDigite "?" para ver as encomendas pendentes.`;
      await sendTelegramMessage(chatId, successMessage);
      console.log(`[Telegram Polling] Moradores ${nomes} vinculados! chat_id: ${chatId}`);
    }
    return;
  }

  if (text.startsWith("/start")) {
    await sendTelegramMessage(chatId, "👋 Bem-vindo ao Sistema de Portaria!\n\nPara receber avisos de encomendas, escaneie o QR Code na portaria ou digite o código PIN de 6 dígitos.");
    return;
  }

  if (text === "?" || text.toLowerCase().includes("chegou") || text.toLowerCase().includes("encomenda")) {
    const { data: moradores, error: moradoresError } = await supabase
      .from("moradores")
      .select("id, nome, unidade_id")
      .eq("telegram_id", chatId.toString());

    if (moradoresError || !moradores || moradores.length === 0) {
      await sendTelegramMessage(chatId, "⚠️ Sua conta não está vinculada. Use o QR Code ou o PIN fornecido pela portaria.");
      return;
    }

    const moradoresIds = moradores.map((morador: MoradorLink) => morador.id);
    const unidadesIds = Array.from(
      new Set(
        moradores
          .map((morador: MoradorLink) => morador.unidade_id)
          .filter(Boolean)
      )
    ) as string[];

    const { data: entregasDiretas, error: entregasDiretasError } = await supabase
      .from("entregas")
      .select("id, codigo_entrega, tipo_entrega, status, morador_id, unidade_id, unidades(numero, bloco), moradores(nome)")
      .in("morador_id", moradoresIds)
      .in("status", ["recebido", "aguardando retirada", "notificado"]);

    if (entregasDiretasError) {
      throw entregasDiretasError;
    }

    let entregasUnidade: EntregaPendente[] = [];

    if (unidadesIds.length > 0) {
      const { data: entregasUnidadeData, error: entregasUnidadeError } = await supabase
        .from("entregas")
        .select("id, codigo_entrega, tipo_entrega, status, morador_id, unidade_id, unidades(numero, bloco), moradores(nome)")
        .in("unidade_id", unidadesIds)
        .is("morador_id", null)
        .in("status", ["recebido", "aguardando retirada", "notificado"]);

      if (entregasUnidadeError) {
        throw entregasUnidadeError;
      }

      entregasUnidade = (entregasUnidadeData || []) as EntregaPendente[];
    }

    const entregasMap = new Map<string, EntregaPendente>();
    for (const entrega of ([...(entregasDiretas || []), ...entregasUnidade] as EntregaPendente[])) {
      entregasMap.set(entrega.id, entrega);
    }

    const entregas = Array.from(entregasMap.values());

    if (entregas.length === 0) {
      await sendTelegramMessage(chatId, "📦 Nenhuma encomenda pendente para você no momento.");
    } else {
      const list = entregas
        .map((entrega) => {
          const unidade = entrega.unidades?.numero
            ? `${entrega.unidades.numero}${entrega.unidades?.bloco ? ` - Bloco ${entrega.unidades.bloco}` : ""}`
            : "";
          const destinatario = entrega.moradores?.nome ? ` para ${entrega.moradores.nome}` : "";
          const unidadeInfo = unidade ? ` | Unidade ${unidade}` : "";
          return `• ${entrega.tipo_entrega} (${entrega.codigo_entrega})${destinatario}${unidadeInfo}`;
        })
        .join("\n");
      await sendTelegramMessage(chatId, `📦 <b>Você tem ${entregas.length} encomenda(s) aguardando:</b>\n\n${list}`);
    }
    return;
  }

  await sendTelegramMessage(chatId, "🤖 Olá! Eu entendo:\n• Código PIN de 6 dígitos\n• \"?\" para ver encomendas pendentes");
}

async function pollUpdates() {
  if (!TELEGRAM_API) return;

  try {
    const url = `${TELEGRAM_API}/getUpdates?offset=${lastUpdateId + 1}&timeout=30&limit=10`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.ok || !data.result?.length) return;

    for (const update of data.result) {
      if (update.update_id > lastUpdateId) {
        lastUpdateId = update.update_id;
        await processUpdate(update);
      }
    }
  } catch (err) {
    console.warn("[Telegram Polling] Erro:", err);
  }
}

export function startTelegramPolling() {
  if (pollingActive) return;
  if (!TELEGRAM_API) {
    console.warn('[Telegram Polling] Desabilitado: defina VITE_TELEGRAM_BOT_TOKEN.');
    return;
  }
  pollingActive = true;
  console.log("[Telegram Polling] Iniciando polling de mensagens...");

  // Poll imediatamente e depois a cada 5 segundos
  pollUpdates();
  pollingInterval = setInterval(pollUpdates, 5000);
}

export function stopTelegramPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    pollingActive = false;
    console.log("[Telegram Polling] Polling parado.");
  }
}
