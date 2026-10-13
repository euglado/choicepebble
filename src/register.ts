import { REST, Routes } from "discord.js";
import { config } from "./config.js";
import { command } from "./ui.js";

try {
  const settings = config();
  // POST upserts only this command; it does not replace other application commands.
  await new REST({ version: "10" })
    .setToken(settings.token)
    .post(Routes.applicationGuildCommands(settings.application, settings.guild), {
      body: command.toJSON(),
    });
  console.log("/choicepebble kaydedildi. / Registered for your configured server.");
} catch (error) {
  console.error(
    error instanceof Error && error.message.startsWith("Kurulum")
      ? error.message
      : "Komut kaydedilemedi. Application ID, Server ID ve bot davetini kontrol edin. / Registration failed; check IDs and bot invite. No credentials logged.",
  );
  process.exitCode = 1;
}
