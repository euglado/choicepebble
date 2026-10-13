import { existsSync, writeFileSync } from "node:fs";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

async function hiddenToken() {
  stdout.write("Bot token (gizli / hidden): ");
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    function finish(error) {
      stdin.off("data", receive);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    }
    function receive(chunk) {
      for (const char of chunk.toString("utf8")) {
        if (char === "\u0003" || char === "\u0004") {
          finish(new Error("Cancelled"));
          return;
        }
        if (char === "\r" || char === "\n") {
          finish();
          return;
        }
        if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        if (/^[A-Za-z0-9._-]$/.test(char) && value.length < 250) value += char;
      }
    }
    stdin.on("data", receive);
  });
}

let reader;
try {
  if (!stdin.isTTY || !stdout.isTTY) throw new Error("Interactive terminal required");
  if (existsSync(".env")) throw new Error("Configuration already exists");
  console.log(
    "ChoicePebble kurulum / setup. Token ekranda görünmez. / Token will not be displayed.",
  );
  const token = await hiddenToken();
  reader = createInterface({ input: stdin, output: stdout });
  const application = (await reader.question("Application ID: ")).trim();
  const guild = (await reader.question("Sunucu ID / Server ID: ")).trim();
  if (
    !/^[A-Za-z0-9._-]{30,250}$/.test(token) ||
    !/^\d{17,20}$/.test(application) ||
    !/^\d{17,20}$/.test(guild)
  )
    throw new Error("Invalid input");
  writeFileSync(
    ".env",
    `DISCORD_TOKEN=${token}\nDISCORD_APPLICATION_ID=${application}\nDISCORD_GUILD_ID=${guild}\n`,
    { flag: "wx", mode: 0o600 },
  );
  console.log(".env kaydedildi. Paylaşmayın! / .env saved. Never share it!");
  console.log(
    `Davet / Invite: https://discord.com/oauth2/authorize?client_id=${application}&scope=bot%20applications.commands&permissions=3072&guild_id=${guild}&disable_guild_select=true`,
  );
  console.log(
    "Bağlantıyı açıp botu davet edin; ardından npm run register. / Invite the bot, then run npm run register.",
  );
} catch {
  console.error(
    "Kurulum tamamlanmadı. Etkileşimli terminal kullanın; mevcut .env varsa güvenle taşıyın, tekrar deneyin. / Setup incomplete. Use an interactive terminal; securely move existing .env before retrying. Input needs a bot token and numeric Application/Server IDs. No credentials logged.",
  );
  process.exitCode = 1;
} finally {
  reader?.close();
}
