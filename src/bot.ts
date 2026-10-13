import { ChannelType, type Interaction, MessageFlags, PermissionFlagsBits } from "discord.js";
import { LIMITS, parseQuestion, type Scope, type Store, UserError } from "./domain.js";
import { modal, noMentions, panel, preview, privateMessage } from "./ui.js";

function scopeOf(interaction: Interaction): Scope {
  if (!interaction.inGuild() || !interaction.channelId || interaction.user.bot) {
    throw new UserError("Sunucuda bir metin kanalını kullanın. / Use a server text channel.");
  }
  if (interaction.channel?.type !== ChannelType.GuildText) {
    throw new UserError(
      "Normal metin kanalı gerekli; başlık/forum desteklenmez. / Use a regular text channel; threads/forums unsupported.",
    );
  }
  return { guild: interaction.guildId, channel: interaction.channelId, user: interaction.user.id };
}
function manager(interaction: Interaction): void {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    throw new UserError("Sunucuyu Yönet izni gerekli. / Manage Server permission required.");
  }
}
function canPublish(interaction: Interaction): void {
  if (
    !interaction.appPermissions?.has([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
    ])
  ) {
    throw new UserError(
      "Botun Kanalı Görüntüle ve Mesaj Gönder izinlerini kontrol edin. / Check bot View Channel and Send Messages permissions.",
    );
  }
}

export function createHandler(
  store: Store,
  report: () => void = () =>
    console.error("Discord isteği başarısız. / Discord request failed; no payload logged."),
) {
  return async (interaction: Interaction): Promise<void> => {
    if (
      !interaction.isChatInputCommand() &&
      !interaction.isModalSubmit() &&
      !interaction.isButton()
    )
      return;
    if (interaction.isChatInputCommand() && interaction.commandName !== "choicepebble") return;
    if (!interaction.isChatInputCommand() && !interaction.customId.startsWith("cp:")) return;
    try {
      const scope = scopeOf(interaction);
      store.prune();
      if (interaction.isChatInputCommand()) {
        manager(interaction);
        canPublish(interaction);
        await interaction.showModal(modal());
        return;
      }
      if (interaction.isModalSubmit()) {
        if (interaction.customId !== "cp:form")
          throw new UserError("Bilinmeyen form. / Unknown form.");
        manager(interaction);
        canPublish(interaction);
        const question = parseQuestion(
          interaction.fields.getTextInputValue("title"),
          interaction.fields.getTextInputValue("options"),
        );
        const session = store.session(scope, { question });
        try {
          await interaction.reply({
            ...preview(session),
            flags: MessageFlags.Ephemeral | MessageFlags.SuppressEmbeds,
          });
        } catch (error) {
          store.sessions.delete(session.id);
          throw error;
        }
        return;
      }
      const [, action, id, option] = interaction.customId.split(":");
      if (!id || !/^[a-f0-9]{24}$/.test(id))
        throw new UserError("Geçersiz düğme. / Invalid button.");
      if (action === "publish" || action === "cancel" || action === "confirm") {
        const session = store.getSession(id, scope);
        if (action === "cancel") {
          store.sessions.delete(id);
          await interaction.update({
            content: "İptal edildi. / Cancelled.",
            components: [],
            allowedMentions: noMentions,
          });
          return;
        }
        manager(interaction);
        if (
          (action === "publish" && session.kind !== "draft") ||
          (action === "confirm" && session.kind !== "close")
        ) {
          throw new UserError("Yanlış işlem. / Wrong action.");
        }
        await interaction.deferUpdate();
        await store.exclusive(scope.guild, async () => {
          // Re-read after acknowledgement; a session may have been consumed by another click.
          const current = store.getSession(id, scope);
          if (current.kind === "draft") {
            canPublish(interaction);
            const poll = store.preparePoll(current);
            const channel = interaction.channel;
            if (!channel || channel.type !== ChannelType.GuildText)
              throw new UserError("Kanal bulunamadı. / Channel unavailable.");
            // Consume before external write: an ambiguous network error cannot trigger a duplicate retry.
            store.sessions.delete(id);
            const message = await channel.send(panel(poll));
            poll.message = message.id;
            store.polls.set(poll.id, poll);
            store.published.set(scope.guild, store.now());
            await interaction.editReply({
              content: `Yayımlandı / Published: ${message.url}`,
              components: [],
              allowedMentions: noMentions,
            });
          } else {
            const poll = store.getPoll(current.pollId, scope);
            const channel = interaction.channel;
            if (!channel || channel.type !== ChannelType.GuildText)
              throw new UserError("Kanal bulunamadı. / Channel unavailable.");
            // Editing our own message by ID does not fetch channel history.
            await channel.messages.edit(poll.message, panel(poll, true));
            store.polls.delete(poll.id);
            store.sessions.delete(id);
            await interaction.editReply({
              content:
                "Anket kapandı; kimlikler bellekten silindi. / Poll closed; IDs removed from RAM.",
              components: [],
              allowedMentions: noMentions,
            });
          }
        });
        return;
      }
      const poll = store.getPoll(id, scope, interaction.message.id);
      if (action === "close") {
        manager(interaction);
        const session = store.session(scope, { pollId: poll.id });
        await interaction.reply({
          ...preview(session),
          flags: MessageFlags.Ephemeral | MessageFlags.SuppressEmbeds,
        });
        return;
      }
      if (action !== "vote" && action !== "withdraw")
        throw new UserError("Bilinmeyen işlem. / Unknown action.");
      if (action === "vote" && (!option || !/^[0-3]$/.test(option)))
        throw new UserError("Geçersiz seçenek. / Invalid option.");
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await store.exclusive(scope.guild, async () => {
        const current = store.getPoll(id, scope, interaction.message.id);
        const next = store.vote(current, scope.user, action === "withdraw" ? null : Number(option));
        if (next) {
          await interaction.message.edit(panel(next));
          store.polls.set(id, next);
        }
        await interaction.editReply({
          content:
            action === "withdraw"
              ? "Oyunuz yok; kimliğiniz bellekten kaldırıldı. / No vote held; your ID removed from RAM."
              : "Tercihiniz kaydedildi. / Your choice is recorded.",
          allowedMentions: noMentions,
        });
      });
    } catch (error) {
      const content =
        error instanceof UserError
          ? error.message
          : "Discord işlemi doğrulanamadı. Mesajı kontrol edin; oylar değişmemiş olabilir. Yayımlama önizlemesi tüketilir, yeniden denemeden kanalı kontrol edin. / Discord operation could not be confirmed. Check the message; votes may be unchanged. Publish previews are consumed; check the channel before creating another.";
      if (!(error instanceof UserError)) report();
      try {
        if (interaction.deferred)
          await interaction.editReply({ content, allowedMentions: noMentions });
        else if (interaction.replied) await interaction.followUp(privateMessage(content));
        else await interaction.reply(privateMessage(content));
      } catch {
        report();
      }
    }
  };
}

export function startCleanup(store: Store): NodeJS.Timeout {
  return setInterval(() => store.prune(), Math.min(LIMITS.sessionLifetime, 60_000)).unref();
}
