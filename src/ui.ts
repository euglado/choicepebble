import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  escapeMarkdown,
  type InteractionReplyOptions,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { type Poll, type Question, type Session, totals } from "./domain.js";

export const command = new SlashCommandBuilder()
  .setName("choicepebble")
  .setDescription("Preview a small community decision poll / Karar anketi önizle")
  // Registered at the guild endpoint; contexts/integration_types are global-command fields.
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export function modal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId("cp:form")
    .setTitle("ChoicePebble — Anket / Poll")
    .addLabelComponents(
      new LabelBuilder()
        .setLabel("Soru / Question")
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId("title")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(80),
        ),
      new LabelBuilder()
        .setLabel("Seçenekler / Options")
        .setDescription("2–4 satır; her satır bir seçenek. / 2–4 lines, one option per line.")
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId("options")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(243)
            .setPlaceholder("Kitap / Book\nFilm / Movie\nOyun / Game"),
        ),
    );
}

function button(id: string, label: string, style = ButtonStyle.Secondary): ButtonBuilder {
  return new ButtonBuilder().setCustomId(`cp:${id}`).setLabel(label).setStyle(style);
}
export const noMentions = { parse: [] as ("roles" | "users" | "everyone")[], repliedUser: false };
export function privateMessage(content: string): InteractionReplyOptions {
  return {
    content,
    flags: MessageFlags.Ephemeral | MessageFlags.SuppressEmbeds,
    allowedMentions: noMentions,
  };
}

export function questionText(question: Question): string {
  return `**${escapeMarkdown(question.title)}**\n${question.options.map((option, index) => `${index + 1}. ${escapeMarkdown(option)}`).join("\n")}`;
}
export function preview(session: Session) {
  const closing = session.kind === "close";
  return {
    content: closing
      ? "Anket kapatılsın mı? Oylar bellekten silinir; toplamlar mesajda kalır. / Close poll? Votes leave RAM; totals remain in the message."
      : `${questionText(session.question)}\n\nYalnızca önizleme. Oy kimlikleri geçici bellekte; toplamlar herkese açık. 24 saat, en çok 500 kişi. / Preview only. Voter IDs in temporary RAM; public totals. 24 hours, up to 500 people.`,
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        button(
          `${closing ? "confirm" : "publish"}:${session.id}`,
          closing ? "Kapatmayı onayla / Confirm close" : "Yayımla / Publish",
          closing ? ButtonStyle.Danger : ButtonStyle.Primary,
        ),
        button(`cancel:${session.id}`, "Vazgeç / Cancel"),
      ),
    ],
    allowedMentions: noMentions,
  };
}

export function panel(poll: Poll, closed = false) {
  const counts = totals(poll);
  const content = `**ChoicePebble — ${closed ? "Kapalı / Closed" : "Anket / Poll"}**\n**${escapeMarkdown(poll.title)}**\n${poll.options.map((option, index) => `${index + 1}. ${escapeMarkdown(option)} — **${counts[index]}**`).join("\n")}\n\n${poll.votes.size} oy / votes · ${closed ? "Toplamlar sabitlendi. / Totals frozen." : `Bitiş / Ends: <t:${Math.floor(poll.expires / 1000)}:f>\nOy değiştirilebilir/geri çekilebilir. / Change or withdraw your vote.`}\nKimlikler yayımlanmaz; gizli seçim değildir. / IDs not published; not a secret ballot.`;
  const choices = poll.options.map((option, index) =>
    button(`vote:${poll.id}:${index}`, `${index + 1}. ${option}`).setDisabled(closed),
  );
  return {
    content,
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(...choices),
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        button(`withdraw:${poll.id}`, "Oyumu geri çek / Withdraw vote").setDisabled(closed),
        button(
          `close:${poll.id}`,
          "Yönetici: kapat / Manager: close",
          ButtonStyle.Danger,
        ).setDisabled(closed),
      ),
    ],
    flags: MessageFlags.SuppressEmbeds as const,
    allowedMentions: noMentions,
  };
}
