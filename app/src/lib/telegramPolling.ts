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
    const { data: morador, error } = await supabase
      .from("moradores")
      .select("id, nome")
      .eq("pin_vinculo_telegram", pin)
      .maybeSingle();

    if (error || !morador) {
      await sendTelegramMessage(chatId, "❌ Código PIN inválido ou já utilizado. Verifique com a portaria.");
      return;
    }

    const chatIdText = chatId.toString();

    const { error: cleanupError } = await supabase
      .from("moradores")
      .update({ telegram_id: null })
      .eq("telegram_id", chatIdText)
      .neq("id", morador.id);

    if (cleanupError) {
      console.warn("[Telegram Polling] Não foi possível limpar vínculos antigos:", cleanupError);
    }

    const { error: updateError } = await supabase
      .from("moradores")
      .update({ telegram_id: chatIdText, pin_vinculo_telegram: null })
      .eq("id", morador.id);

    if (updateError) {
      await sendTelegramMessage(chatId, "❌ Erro ao vincular sua conta. Tente novamente.");
    } else {
      await sendTelegramMessage(chatId, `✅ Olá <b>${morador.nome}</b>! Sua conta foi vinculada com sucesso! 🎉\n\nVocê receberá notificações aqui sempre que uma encomenda chegar na portaria.\n\nDigite "?" para ver suas encomendas pendentes.`);
      console.log(`[Telegram Polling] Morador ${morador.nome} vinculado! chat_id: ${chatId}`);
    }
    return;
  }

  if (text.startsWith("/start")) {
    await sendTelegramMessage(chatId, "👋 Bem-vindo ao Sistema de Portaria!\n\nPara receber avisos de encomendas, escaneie o QR Code na portaria ou digite o código PIN de 6 dígitos.");
    return;
  }

  if (text === "?" || text.toLowerCase().includes("chegou") || text.toLowerCase().includes("encomenda")) {
    const { data: morador } = await supabase
      .from("moradores")
      .select("id")
      .eq("telegram_id", chatId.toString())
      .maybeSingle();

    if (!morador) {
      await sendTelegramMessage(chatId, "⚠️ Sua conta não está vinculada. Use o QR Code ou o PIN fornecido pela portaria.");
      return;
    }

    const { data: entregas } = await supabase
      .from("entregas")
      .select("codigo_entrega, tipo_entrega")
      .eq("morador_id", morador.id)
      .eq("status", "recebido");

    if (!entregas || entregas.length === 0) {
      await sendTelegramMessage(chatId, "📦 Nenhuma encomenda pendente para você no momento.");
    } else {
      const list = entregas.map(e => `• ${e.tipo_entrega} (${e.codigo_entrega})`).join("\n");
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
