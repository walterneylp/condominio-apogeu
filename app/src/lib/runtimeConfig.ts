const readEnv = (value: string | undefined, fallback = '') => value?.trim() || fallback;

export const runtimeConfig = {
  adminUsername: readEnv(import.meta.env.VITE_ADMIN_USERNAME, 'admin').toLowerCase(),
  adminPassword: readEnv(import.meta.env.VITE_ADMIN_PASSWORD, '1234'),
  adminDisplayName: readEnv(import.meta.env.VITE_ADMIN_DISPLAY_NAME, 'Administrador Geral'),
  telegramBotToken: readEnv(import.meta.env.VITE_TELEGRAM_BOT_TOKEN),
};

export const hasTelegramBotToken = Boolean(runtimeConfig.telegramBotToken);
