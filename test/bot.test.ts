import assert from "node:assert/strict";
import test from "node:test";
import { ChannelType, type Interaction, MessageFlags, PermissionsBitField } from "discord.js";
import { createHandler } from "../src/bot.js";
import { Store } from "../src/domain.js";

function mock(kind: "command" | "modal" | "button" = "command") {
  const calls: { method: string; payload: unknown }[] = [];
  const record = (method: string, payload: unknown) => {
    calls.push({ method, payload });
  };
  const data = {
    commandName: "choicepebble",
    customId: "cp:form",
    guildId: "guild",
    channelId: "channel",
    user: { id: "alice", bot: false },
    deferred: false,
    replied: false,
    memberPermissions: new PermissionsBitField(32n),
    appPermissions: new PermissionsBitField(3072n),
    fields: { getTextInputValue: (key: string) => (key === "title" ? "What next?" : "Book\nFilm") },
    inGuild: () => true,
    isChatInputCommand: () => kind === "command",
    isModalSubmit: () => kind === "modal",
    isButton: () => kind === "button",
    showModal: async (payload: unknown) => {
      data.replied = true;
      record("modal", payload);
    },
    reply: async (payload: unknown) => {
      data.replied = true;
      record("reply", payload);
    },
    update: async (payload: unknown) => {
      data.replied = true;
      record("update", payload);
    },
    deferUpdate: async () => {
      data.deferred = true;
      record("deferUpdate", null);
    },
    deferReply: async (payload: unknown) => {
      data.deferred = true;
      record("deferReply", payload);
    },
    editReply: async (payload: unknown) => {
      record("editReply", payload);
    },
    followUp: async (payload: unknown) => {
      record("followUp", payload);
    },
    message: {
      id: "message",
      edit: async (payload: unknown) => {
        record("publicEdit", payload);
      },
    },
    channel: {
      type: ChannelType.GuildText,
      send: async (payload: unknown) => {
        record("send", payload);
        return { id: "message", url: "https://discord.com/channels/guild/channel/message" };
      },
      messages: {
        edit: async (_id: string, payload: unknown) => {
          record("closeEdit", payload);
        },
      },
    },
  };
  return { data, calls, interaction: data as unknown as Interaction };
}
function fixture() {
  let time = 2_000_000;
  const store = new Store(() => time);
  const scope = { user: "alice", guild: "guild", channel: "channel" };
  const session = store.session(scope, {
    question: { title: "What next?", options: ["Book", "Film"] },
  });
  const poll = store.preparePoll(session);
  poll.message = "message";
  store.polls.set(poll.id, poll);
  let reports = 0;
  return {
    store,
    session,
    poll,
    scope,
    handle: createHandler(store, () => {
      reports++;
    }),
    advance: () => {
      time += 2000;
    },
    reports: () => reports,
  };
}
function content(calls: ReturnType<typeof mock>["calls"]): string {
  return JSON.stringify(calls);
}

test("manager command opens form; ordinary members cannot", async () => {
  const { handle } = fixture();
  const yes = mock();
  await handle(yes.interaction);
  assert.equal(yes.calls[0]?.method, "modal");
  const no = mock();
  no.data.memberPermissions = new PermissionsBitField(0n);
  await handle(no.interaction);
  assert(content(no.calls).includes("Manage Server"));
  assert(!no.calls.some((call) => call.method === "modal"));
});
test("DMs and threads are rejected", async () => {
  const { handle } = fixture();
  const dm = mock();
  dm.data.inGuild = () => false;
  await handle(dm.interaction);
  assert(content(dm.calls).includes("server text channel"));
  const thread = mock();
  thread.data.channel.type = ChannelType.PublicThread;
  await handle(thread.interaction);
  assert(content(thread.calls).includes("threads/forums"));
});
test("missing bot permissions blocks creation", async () => {
  const { handle } = fixture();
  const input = mock();
  input.data.appPermissions = new PermissionsBitField(1024n);
  await handle(input.interaction);
  assert(content(input.calls).includes("Send Messages"));
});
test("modal produces private preview, not a public message", async () => {
  const { handle, store } = fixture();
  const input = mock("modal");
  await handle(input.interaction);
  assert.equal(store.sessions.size, 1);
  assert.equal(input.calls[0]?.method, "reply");
  const payload = input.calls[0]?.payload as { flags: number };
  assert(payload.flags & MessageFlags.Ephemeral);
  assert(!input.calls.some((call) => call.method === "send"));
});
test("revoked manager permission blocks publication and preserves preview", async () => {
  const { handle, session, store } = fixture();
  const input = mock("button");
  input.data.customId = `cp:publish:${session.id}`;
  input.data.memberPermissions = new PermissionsBitField(0n);
  await handle(input.interaction);
  assert(content(input.calls).includes("Manage Server"));
  assert(store.sessions.has(session.id));
  assert(!input.calls.some((call) => call.method === "send"));
});
test("foreign preview cannot be published or cancelled", async () => {
  const { handle, session, store } = fixture();
  for (const action of ["publish", "cancel"]) {
    const input = mock("button");
    input.data.customId = `cp:${action}:${session.id}`;
    input.data.user.id = "bob";
    await handle(input.interaction);
    assert(content(input.calls).includes("someone else"));
  }
  assert(store.sessions.has(session.id));
});
test("publish is acknowledged before public write and preview is single-use", async () => {
  const { handle, session, store } = fixture();
  const input = mock("button");
  input.data.customId = `cp:publish:${session.id}`;
  await handle(input.interaction);
  assert.deepEqual(
    input.calls.map((call) => call.method),
    ["deferUpdate", "send", "editReply"],
  );
  assert.equal(store.polls.size, 2);
  assert(!store.sessions.has(session.id));
  const retry = mock("button");
  retry.data.customId = input.data.customId;
  await handle(retry.interaction);
  assert(!retry.calls.some((call) => call.method === "send"));
});
test("ambiguous publish failure consumes preview and does not create tracked poll", async () => {
  const { handle, session, store, reports } = fixture();
  const input = mock("button");
  input.data.customId = `cp:publish:${session.id}`;
  input.data.channel.send = async () => {
    throw new Error("secret-network-payload");
  };
  await handle(input.interaction);
  assert(!store.sessions.has(session.id));
  assert.equal(store.polls.size, 1);
  assert.equal(reports(), 1);
  assert(!content(input.calls).includes("secret-network-payload"));
  assert(content(input.calls).includes("check the channel"));
});
test("member vote edits public totals after private acknowledgement", async () => {
  const { handle, poll, store } = fixture();
  const input = mock("button");
  input.data.customId = `cp:vote:${poll.id}:1`;
  input.data.memberPermissions = new PermissionsBitField(0n);
  await handle(input.interaction);
  assert.deepEqual(
    input.calls.map((call) => call.method),
    ["deferReply", "publicEdit", "editReply"],
  );
  assert.equal(store.polls.get(poll.id)?.votes.get("alice"), 1);
  const edit = input.calls.find((call) => call.method === "publicEdit");
  assert(!JSON.stringify(edit?.payload).includes("alice"));
});
test("failed public vote edit leaves votes and cooldown untouched", async () => {
  const { handle, poll, store } = fixture();
  const input = mock("button");
  input.data.customId = `cp:vote:${poll.id}:1`;
  input.data.message.edit = async () => {
    throw new Error("network");
  };
  await handle(input.interaction);
  assert.equal(store.polls.get(poll.id)?.votes.size, 0);
  assert.equal(store.polls.get(poll.id)?.lastEdit, 0);
});
test("forged source message and malformed option cannot cast votes", async () => {
  const { handle, poll, store } = fixture();
  const forged = mock("button");
  forged.data.customId = `cp:vote:${poll.id}:1`;
  forged.data.message.id = "forged";
  await handle(forged.interaction);
  const malformed = mock("button");
  malformed.data.customId = `cp:vote:${poll.id}:1junk`;
  await handle(malformed.interaction);
  assert.equal(store.polls.get(poll.id)?.votes.size, 0);
  assert(!forged.calls.some((call) => call.method === "publicEdit"));
  assert(!malformed.calls.some((call) => call.method === "publicEdit"));
});
test("withdraw removes identity and updates totals", async () => {
  const { handle, poll, store } = fixture();
  poll.votes.set("alice", 0);
  const input = mock("button");
  input.data.customId = `cp:withdraw:${poll.id}`;
  await handle(input.interaction);
  assert(!store.polls.get(poll.id)?.votes.has("alice"));
});
test("close requires manager permission and explicit private confirmation", async () => {
  const { handle, poll, store, scope } = fixture();
  poll.votes.set("alice", 1);
  const denied = mock("button");
  denied.data.customId = `cp:close:${poll.id}`;
  denied.data.memberPermissions = new PermissionsBitField(0n);
  await handle(denied.interaction);
  assert(content(denied.calls).includes("Manage Server"));
  const request = mock("button");
  request.data.customId = `cp:close:${poll.id}`;
  await handle(request.interaction);
  assert(store.polls.has(poll.id));
  const session = [...store.sessions.values()].find((value) => value.kind === "close");
  assert(session);
  assert.equal(store.getSession(session.id, scope).kind, "close");
  const confirm = mock("button");
  confirm.data.customId = `cp:confirm:${session.id}`;
  await handle(confirm.interaction);
  assert(!store.polls.has(poll.id));
  assert(confirm.calls.some((call) => call.method === "closeEdit"));
});
test("permission loss during close confirmation preserves poll", async () => {
  const { handle, poll, store, scope } = fixture();
  const session = store.session(scope, { pollId: poll.id });
  const input = mock("button");
  input.data.customId = `cp:confirm:${session.id}`;
  input.data.memberPermissions = new PermissionsBitField(0n);
  await handle(input.interaction);
  assert(store.polls.has(poll.id));
  assert(!input.calls.some((call) => call.method === "closeEdit"));
});
test("failed closure retains votes for retry", async () => {
  const { handle, poll, store, scope } = fixture();
  poll.votes.set("alice", 0);
  const session = store.session(scope, { pollId: poll.id });
  const input = mock("button");
  input.data.customId = `cp:confirm:${session.id}`;
  input.data.channel.messages.edit = async () => {
    throw new Error("network");
  };
  await handle(input.interaction);
  assert(store.polls.has(poll.id));
  assert(store.sessions.has(session.id));
});
test("old panels fail safely after restart", async () => {
  const { poll } = fixture();
  const input = mock("button");
  input.data.customId = `cp:vote:${poll.id}:1`;
  await createHandler(new Store())(input.interaction);
  assert(content(input.calls).includes("bot restarted"));
  assert(!input.calls.some((call) => call.method === "publicEdit"));
});
test("unrelated command and button are ignored", async () => {
  const { handle } = fixture();
  const command = mock();
  command.data.commandName = "other";
  const button = mock("button");
  button.data.customId = "other:button";
  await handle(command.interaction);
  await handle(button.interaction);
  assert.equal(command.calls.length + button.calls.length, 0);
});
