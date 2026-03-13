import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

serve(async (req) => {
  try {
    if (!BOT_TOKEN) {
      console.error("ERRO: TELEGRAM_BOT_TOKEN não configurado.");
      return new Response(
        JSON.stringify({ error: "TELEGRAM_BOT_TOKEN não configurado." }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!supabase) {
      console.error("ERRO: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas.");
      return new Response(
        JSON.stringify({ error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas." }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const payload = await req.json();
    console.log("Payload recebido:", JSON.stringify(payload));
    
    // Handle Webhook from Telegram
    if (payload.message) {
      const { message } = payload;
      const chatId = message.chat.id;
      const text = message.text?.trim() || "";

      console.log(`Mensagem de ${chatId}: ${text}`);

      // 1. Handle PIN Linking (Direct /start PIN or just PIN)
      let pin = "";
      if (text.startsWith("/start ")) {
        pin = text.split(" ")[1];
        console.log(`PIN detectado via /start: ${pin}`);
      } else if (/^\d{6}$/.test(text)) {
        pin = text;
        console.log(`PIN detectado via texto direto: ${pin}`);
      }

      if (pin) {
        const { data: morador, error } = await supabase
          .from('moradores')
          .select('id, nome')
          .eq('pin_vinculo_telegram', pin)
          .single();

        if (error || !morador) {
          await sendMessage(chatId, "❌ Código PIN inválido. Verifique com a portaria.");
          return new Response("ok");
        }

        const chatIdText = chatId.toString();

        const { error: cleanupError } = await supabase
          .from('moradores')
          .update({ telegram_id: null })
          .eq('telegram_id', chatIdText)
          .neq('id', morador.id);

        if (cleanupError) {
          console.warn('Falha ao limpar vínculos antigos de Telegram:', cleanupError);
        }

        const { error: updateError } = await supabase
          .from('moradores')
          .update({ 
            telegram_id: chatIdText
          })
          .eq('id', morador.id);

        if (updateError) {
          await sendMessage(chatId, "❌ Erro ao vincular sua conta. Tente novamente mais tarde.");
        } else {
          await sendMessage(chatId, `✅ Sucesso! Olá ${morador.nome}, sua conta foi vinculada. Você receberá notificações por aqui sempre que uma encomenda chegar.`);
        }
        return new Response("ok");
      }

      // 2. Handle /start (without PIN)
      if (text.startsWith("/start")) {
        await sendMessage(chatId, "👋 Bem-vindo ao Sistema de Portaria! \n\nPara receber avisos de suas encomendas, por favor digite o código PIN de 6 dígitos fornecido pela administração ou escaneie o QR Code na portaria.");
        return new Response("ok");
      }

      // 3. Handle Inquiry
      if (text.toLowerCase().includes("chegou") || text.toLowerCase().includes("encomenda") || text === "?") {
        const { data: morador } = await supabase
          .from('moradores')
          .select('id')
          .eq('telegram_id', chatId.toString())
          .maybeSingle();

        if (!morador) {
          await sendMessage(chatId, "⚠️ Sua conta não está vinculada. Envie seu código PIN para começar.");
          return new Response("ok");
        }

        const { data: entregas } = await supabase
          .from('entregas')
          .select('codigo_entrega, tipo_entrega, status')
          .eq('morador_id', morador.id)
          .eq('status', 'recebido');

        if (!entregas || entregas.length === 0) {
          await sendMessage(chatId, "📦 No momento não há encomendas pendentes para você.");
        } else {
          const list = entregas.map(e => `• ${e.tipo_entrega} (${e.codigo_entrega})`).join("\n");
          await sendMessage(chatId, `📦 Você tem ${entregas.length} encomenda(s) aguardando retirada:\n\n${list}`);
        }
        return new Response("ok");
      }

      // 4. Default Message
      await sendMessage(chatId, "🤖 Olá! No momento eu só entendo:\n• Seu código PIN de 6 dígitos\n• Perguntas como 'Chegou alguma coisa?'");
      return new Response("ok");
    }

    // --- II. Handle Push Notifications from Database Trigger ---
    if (payload.type === 'notification') {
      const { chatId, message: text } = payload;
      if (chatId && text) {
        await sendMessage(parseInt(chatId), text);
        return new Response("sent");
      }
    }

    return new Response("ignored");


  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Erro interno";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
})

async function sendMessage(chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}
