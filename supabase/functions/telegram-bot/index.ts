import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

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
        const { data: moradores, error } = await supabase
          .from('moradores')
          .select('id, nome, unidade_id')
          .eq('pin_vinculo_telegram', pin);

        if (error || !moradores || moradores.length === 0) {
          await sendMessage(chatId, "❌ Código PIN inválido. Verifique com a portaria.");
          return new Response("ok");
        }

        const chatIdText = chatId.toString();
        const moradoresIds = moradores.map((morador: MoradorLink) => morador.id);

        const { error: updateError } = await supabase
          .from('moradores')
          .update({ 
            telegram_id: chatIdText
          })
          .in('id', moradoresIds);

        if (updateError) {
          await sendMessage(chatId, "❌ Erro ao vincular sua conta. Tente novamente mais tarde.");
        } else {
          const nomes = moradores.map((morador: MoradorLink) => morador.nome).join(', ');
          const successMessage = moradores.length === 1
            ? `✅ Sucesso! Olá ${nomes}, sua conta foi vinculada. Você receberá notificações por aqui sempre que uma encomenda chegar.`
            : `✅ Sucesso! Este Telegram foi vinculado aos seguintes cadastros: ${nomes}. Você receberá notificações de todos eles por aqui.`;
          await sendMessage(chatId, successMessage);
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
        const { data: moradores, error: moradoresError } = await supabase
          .from('moradores')
          .select('id, nome, unidade_id')
          .eq('telegram_id', chatId.toString());

        if (moradoresError || !moradores || moradores.length === 0) {
          await sendMessage(chatId, "⚠️ Sua conta não está vinculada. Envie seu código PIN para começar.");
          return new Response("ok");
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
          .from('entregas')
          .select('id, codigo_entrega, tipo_entrega, status, morador_id, unidade_id, unidades(numero, bloco), moradores(nome)')
          .in('morador_id', moradoresIds)
          .in('status', ['recebido', 'aguardando retirada', 'notificado']);

        if (entregasDiretasError) {
          throw entregasDiretasError;
        }

        let entregasUnidade: EntregaPendente[] = [];

        if (unidadesIds.length > 0) {
          const { data: entregasUnidadeData, error: entregasUnidadeError } = await supabase
            .from('entregas')
            .select('id, codigo_entrega, tipo_entrega, status, morador_id, unidade_id, unidades(numero, bloco), moradores(nome)')
            .in('unidade_id', unidadesIds)
            .is('morador_id', null)
            .in('status', ['recebido', 'aguardando retirada', 'notificado']);

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
          await sendMessage(chatId, "📦 No momento não há encomendas pendentes para você.");
        } else {
          const list = entregas
            .map((entrega) => {
              const unidade = entrega.unidades?.numero
                ? `${entrega.unidades.numero}${entrega.unidades?.bloco ? ` - Bloco ${entrega.unidades.bloco}` : ''}`
                : '';
              const destinatario = entrega.moradores?.nome ? ` para ${entrega.moradores.nome}` : '';
              const unidadeInfo = unidade ? ` | Unidade ${unidade}` : '';
              return `• ${entrega.tipo_entrega} (${entrega.codigo_entrega})${destinatario}${unidadeInfo}`;
            })
            .join("\n");
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
