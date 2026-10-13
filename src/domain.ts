import { randomBytes } from "node:crypto";

export const LIMITS = {
  polls: 20,
  perGuild: 2,
  voters: 500,
  sessions: 200,
  lifetime: 24 * 60 * 60 * 1000,
  sessionLifetime: 10 * 60 * 1000,
  updateInterval: 1500,
  publishInterval: 30_000,
} as const;

export class UserError extends Error {}
export interface Scope {
  guild: string;
  channel: string;
  user: string;
}
export interface Question {
  title: string;
  options: string[];
}
export interface Poll extends Question {
  id: string;
  guild: string;
  channel: string;
  message: string;
  expires: number;
  lastEdit: number;
  votes: Map<string, number>;
}
export type Session = Scope & {
  id: string;
  expires: number;
} & ({ kind: "draft"; question: Question } | { kind: "close"; pollId: string });

function plain(value: string): string {
  // Reject hidden direction/control characters instead of silently changing the question.
  if (/[\p{Cc}\p{Cf}]/u.test(value)) {
    throw new UserError("Gizli/kontrol karakteri kullanmayın. / Remove hidden/control characters.");
  }
  return value.trim().normalize("NFC");
}
export function parseQuestion(title: string, lines: string): Question {
  const cleaned = plain(title);
  const options = lines.replace(/\r\n/g, "\n").split("\n").map(plain);
  if (!cleaned || cleaned.length > 80 || options.length < 2 || options.length > 4) {
    throw new UserError("Başlık 1–80 karakter; 2–4 seçenek girin. / Title: 1–80; options: 2–4.");
  }
  if (options.some((option) => !option || option.length > 60)) {
    throw new UserError("Her seçenek 1–60 karakter olmalı. / Each option must be 1–60 characters.");
  }
  if (new Set(options.map((option) => option.toLocaleLowerCase("en-US"))).size !== options.length) {
    throw new UserError("Seçenekler farklı olmalı. / Options must be distinct.");
  }
  return { title: cleaned, options };
}

export function totals(poll: Poll): number[] {
  const counts = poll.options.map(() => 0);
  for (const option of poll.votes.values()) counts[option] = (counts[option] ?? 0) + 1;
  return counts;
}

export class Store {
  readonly polls = new Map<string, Poll>();
  readonly sessions = new Map<string, Session>();
  readonly published = new Map<string, number>();
  readonly busy = new Set<string>();
  constructor(readonly now: () => number = Date.now) {}

  prune(): void {
    const time = this.now();
    for (const [id, poll] of this.polls) if (poll.expires <= time) this.polls.delete(id);
    for (const [id, session] of this.sessions) {
      if (session.expires <= time) this.sessions.delete(id);
    }
    for (const [guild, timePublished] of this.published) {
      if (timePublished + LIMITS.publishInterval <= time) this.published.delete(guild);
    }
  }

  session(scope: Scope, data: { question: Question } | { pollId: string }): Session {
    this.prune();
    // A new preview replaces only this member's older preview in the same server.
    for (const [id, old] of this.sessions) {
      if (old.user === scope.user && old.guild === scope.guild) this.sessions.delete(id);
    }
    if (this.sessions.size >= LIMITS.sessions) {
      throw new UserError(
        "Önizleme kapasitesi dolu; sonra deneyin. / Preview capacity reached; retry later.",
      );
    }
    const id = randomBytes(12).toString("hex");
    const session: Session = {
      ...scope,
      ...("question" in data
        ? { kind: "draft" as const, ...data }
        : { kind: "close" as const, ...data }),
      id,
      expires: this.now() + LIMITS.sessionLifetime,
    };
    this.sessions.set(id, session);
    return session;
  }

  getSession(id: string, scope: Scope): Session {
    this.prune();
    const session = this.sessions.get(id);
    if (
      !session ||
      session.user !== scope.user ||
      session.guild !== scope.guild ||
      session.channel !== scope.channel
    ) {
      throw new UserError(
        "Önizleme size ait değil veya süresi doldu. / Preview is expired or belongs to someone else.",
      );
    }
    return session;
  }

  getPoll(id: string, scope: Scope, message?: string): Poll {
    this.prune();
    const poll = this.polls.get(id);
    if (
      !poll ||
      poll.guild !== scope.guild ||
      poll.channel !== scope.channel ||
      (message !== undefined && poll.message !== message)
    ) {
      throw new UserError(
        "Anket kapalı, süresi dolmuş veya bot yeniden başlamış. / Poll closed, expired or bot restarted.",
      );
    }
    return poll;
  }

  preparePoll(session: Session): Poll {
    this.prune();
    if (session.kind !== "draft") throw new UserError("Geçersiz önizleme. / Invalid preview.");
    if (
      this.polls.size >= LIMITS.polls ||
      [...this.polls.values()].filter((poll) => poll.guild === session.guild).length >=
        LIMITS.perGuild
    ) {
      throw new UserError(
        "Anket sınırı: sunucuda 2, botta 20. / Poll limit: 2 per server, 20 per bot.",
      );
    }
    if (this.published.has(session.guild)) {
      throw new UserError(
        "Yayımlar arasında 30 saniye bekleyin. / Wait 30 seconds between publications.",
      );
    }
    return {
      ...session.question,
      id: randomBytes(12).toString("hex"),
      guild: session.guild,
      channel: session.channel,
      message: "",
      expires: this.now() + LIMITS.lifetime,
      lastEdit: 0,
      votes: new Map(),
    };
  }

  vote(poll: Poll, user: string, option: number | null): Poll | null {
    if (
      option !== null &&
      (!Number.isInteger(option) || option < 0 || option >= poll.options.length)
    ) {
      throw new UserError("Geçersiz seçenek. / Invalid option.");
    }
    if ((option === null && !poll.votes.has(user)) || poll.votes.get(user) === option) return null;
    if (poll.lastEdit + LIMITS.updateInterval > this.now()) {
      throw new UserError(
        "Anket güncelleniyor; 2 saniye sonra deneyin. / Poll updating; retry in 2 seconds.",
      );
    }
    if (option !== null && !poll.votes.has(user) && poll.votes.size >= LIMITS.voters) {
      throw new UserError("500 katılımcı sınırına ulaşıldı. / 500 participant limit reached.");
    }
    const next = { ...poll, votes: new Map(poll.votes), lastEdit: this.now() };
    if (option === null) next.votes.delete(user);
    else next.votes.set(user, option);
    return next;
  }

  async exclusive<T>(guild: string, task: () => Promise<T>): Promise<T> {
    if (this.busy.has(guild))
      throw new UserError("İşlem sürüyor; tekrar deneyin. / Operation in progress; retry.");
    this.busy.add(guild);
    try {
      return await task();
    } finally {
      this.busy.delete(guild);
    }
  }
}
