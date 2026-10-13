export interface Config {
  token: string;
  application: string;
  guild: string;
}
export function config(env: NodeJS.ProcessEnv = process.env): Config {
  const token = env.DISCORD_TOKEN?.trim();
  const application = env.DISCORD_APPLICATION_ID?.trim();
  const guild = env.DISCORD_GUILD_ID?.trim();
  if (
    !token ||
    /\s/.test(token) ||
    token.length < 30 ||
    !application ||
    !/^\d{17,20}$/.test(application) ||
    !guild ||
    !/^\d{17,20}$/.test(guild)
  ) {
    throw new Error(
      "Kurulum eksik/geçersiz. npm run setup çalıştırın. / Setup missing/invalid. Run npm run setup. Never paste your token into support.",
    );
  }
  return { token, application, guild };
}
