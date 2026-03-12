#!/bin/bash
# =============================================================================
# DIAGNÓSTICO: Integração com Telegram
# Execute este script no terminal para verificar se tudo está configurado corretamente.
# =============================================================================

BOT_TOKEN="8698954274:AAGdTPd5IFHANsS9wNDr61aqG5kDwRXWFX8"
BOT_USERNAME="condomioapogeu_bot"

echo ""
echo "========================================================"
echo " DIAGNÓSTICO DO TELEGRAM BOT: @${BOT_USERNAME}"
echo "========================================================"

# --- PASSO 1: Verificar o Status do Webhook ---
echo ""
echo ">> PASSO 1: Verificando webhook atual..."
WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo")
echo "Resposta do Telegram:"
echo ${WEBHOOK_INFO} | python3 -m json.tool 2>/dev/null || echo "${WEBHOOK_INFO}"

WEBHOOK_URL=$(echo ${WEBHOOK_INFO} | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('url','VAZIO'))" 2>/dev/null)
echo ""
echo "URL do Webhook registrada: ${WEBHOOK_URL}"

if [ "$WEBHOOK_URL" = "VAZIO" ] || [ -z "$WEBHOOK_URL" ]; then
  echo ""
  echo "  >>> WEBHOOK NÃO CONFIGURADO! <<<"
  echo "  Siga os passos abaixo para registrar."
else
  echo "  OK - Webhook registrado."
fi

# --- PASSO 2: Verificar Info do Bot ---
echo ""
echo ">> PASSO 2: Verificando informações do Bot..."
BOT_INFO=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getMe")
echo ${BOT_INFO} | python3 -m json.tool 2>/dev/null || echo "${BOT_INFO}"

# --- INSTRUCOES ---
echo ""
echo "========================================================"
echo " COMO REGISTRAR O WEBHOOK (se não estiver configurado)"
echo "========================================================"
echo ""
echo "1. NO SUPABASE: Vá em Settings > API e copie:"
echo "   - Project URL (ex: https://xyz.supabase.co)"
echo "   - service_role key"
echo ""
echo "2. No painel Supabase, vá em 'Edge Functions' > telegram-bot"
echo "   Certifique-se que a função foi implantada (Deploy)."
echo "   Se não, rode: supabase functions deploy telegram-bot"
echo ""
echo "3. REGISTRAR O WEBHOOK: Substitua '<SEU_PROJETO>' pela URL do seu projeto Supabase"
echo "   e cole no navegador ou execute no terminal:"
echo ""
echo "   curl 'https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=https://<SEU_PROJETO>.functions.supabase.co/telegram-bot'"
echo ""
echo "4. VERIFICAR: Execute este script novamente para confirmar."
echo ""
echo "========================================================"
