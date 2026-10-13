import { Client, Events, GatewayIntentBits, Options } from "discord.js";
import { createHandler, startCleanup } from "./bot.js";
import { config } from "./config.js";
import { Store } from "./domain.js";

try {
  const settings = config();
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    allowedMentions: { parse: [], repliedUser: false },
    makeCache: Options.cacheWithLimits({ ...Options.DefaultMakeCacheSettings, MessageManager: 0 }),
  });
  const store = new Store();
  const cleanup = startCleanup(store);
  client.on(Events.InteractionCreate, (interaction) => {
    // Scope command registration and live handling to the configured server.
    if (interaction.guildId === settings.guild) void createHandler(store)(interaction);
  });
  client.once(Events.ClientReady, () =>
    console.log("ChoicePebble çevrimiçi. / ChoicePebble online."),
  );
  client.on(Events.Error, () =>
    console.error("Discord bağlantı hatası. / Discord connection error."),
  );
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      clearInterval(cleanup);
      store.polls.clear();
      store.sessions.clear();
      store.published.clear();
      client.destroy();
    });
  }
  try {
    await client.login(settings.token);
  } catch (error) {
    clearInterval(cleanup);
    client.destroy();
    throw error;
  }
} catch (error) {
  console.error(
    error instanceof Error && error.message.startsWith("Kurulum")
      ? error.message
      : "Bot başlatılamadı. Tokenı/bağlantıyı kontrol edin. / Startup failed; check token/network. No credentials logged.",
  );
  process.exitCode = 1;
}
