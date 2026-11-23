// telegram-config.js — links and the Telegram bot integration.
//
// botUsername + apiUrl turn on:
//   • "Confirm with Telegram" during sign-up (Telegram Login Widget)
//   • mandatory subscription to `channel` (checked by the bot server)
//   • a message to the admin about every new sign-up (name, surname, ID, @username)
// The bot server is bot/server.js (deployed as a separate free Render web service).
// The BOT TOKEN is NOT here — it lives only in that server's environment variables.
// If apiUrl is empty or the server does not answer, sign-up still works without it.

const TG = {
  // Turn on ONLY after: (1) @BotFather -> /setdomain -> duelum.onrender.com for this bot,
  // (2) the bot is an ADMIN of the channel, (3) BOT_TOKEN is set on the bot server.
  // While false, sign-up works without the Telegram step (nobody gets locked out).
  loginWidget: false,
  botUsername: 'duelum_bot',                       // without @
  apiUrl: 'https://duelum-bot.onrender.com',       // the bot server (Render web service)
  channel: 'duelum',                               // channel username without @ (mandatory subscription)
  links: {
    channel: 'https://t.me/duelum',
    bot: 'https://t.me/duelum_bot',
    youtube: 'https://www.youtube.com/@shoooxe',
    support: 'https://t.me/U7BBEK'
  }
};
