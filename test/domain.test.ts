import assert from "node:assert/strict";
import test from "node:test";
import { config } from "../src/config.js";
import { LIMITS, parseQuestion, Store, totals, UserError } from "../src/domain.js";
import { command, modal, panel, preview } from "../src/ui.js";

const scope = { guild: "guild", channel: "channel", user: "alice" };
const question = { title: "What next?", options: ["Book", "Film"] };
function fixture() {
  let time = 2_000_000;
  const store = new Store(() => time);
  const draft = store.session(scope, { question });
  const poll = store.preparePoll(draft);
  poll.message = "message";
  store.polls.set(poll.id, poll);
  return {
    store,
    draft,
    poll,
    advance: (amount: number) => {
      time += amount;
    },
  };
}

test("question parser trims, normalizes NFC and accepts CRLF options", () => {
  assert.deepEqual(parseQuestion(" Cafe\u0301? ", "Tea\r\n Coffee "), {
    title: "Café?",
    options: ["Tea", "Coffee"],
  });
});
for (const [title, lines] of [
  ["", "A\nB"],
  ["x".repeat(81), "A\nB"],
  ["Q", "A"],
  ["Q", "A\nB\nC\nD\nE"],
  ["Q", "A\n"],
  ["Q", "yes\nYES"],
  ["Q", `${"x".repeat(61)}\nB`],
  ["hidden\u202e", "A\nB"],
  ["Q", "A\nB\t"],
] as const) {
  test(`rejects invalid question variant ${JSON.stringify([title.slice(0, 10), lines.slice(0, 12)])}`, () => {
    assert.throws(() => parseQuestion(title, lines), UserError);
  });
}
test("one member can vote, change, withdraw; each plan leaves original untouched", () => {
  const { store, poll, advance } = fixture();
  const first = store.vote(poll, "alice", 0);
  assert(first);
  assert.equal(poll.votes.size, 0);
  assert.deepEqual(totals(first), [1, 0]);
  advance(2000);
  const second = store.vote(first, "alice", 1);
  assert(second);
  assert.deepEqual(totals(second), [0, 1]);
  assert.equal(second.votes.size, 1);
  advance(2000);
  const third = store.vote(second, "alice", null);
  assert(third);
  assert.equal(third.votes.size, 0);
});
test("same vote and empty withdrawal are no-ops; rapid changes are rejected", () => {
  const { store, poll } = fixture();
  assert.equal(store.vote(poll, "alice", null), null);
  const next = store.vote(poll, "alice", 0);
  assert(next);
  assert.equal(store.vote(next, "alice", 0), null);
  assert.throws(() => store.vote(next, "alice", 1), /retry/);
});
test("invalid vote indices never mutate state", () => {
  const { store, poll } = fixture();
  for (const option of [-1, 2, 0.5, Number.NaN, Infinity])
    assert.throws(() => store.vote(poll, "alice", option), UserError);
  assert.equal(poll.votes.size, 0);
});
test("participant cap blocks newcomers but allows existing members to change and withdraw", () => {
  const { store, poll, advance } = fixture();
  for (let n = 0; n < LIMITS.voters; n++) poll.votes.set(`user${n}`, 0);
  assert.throws(() => store.vote(poll, "new", 1), /500/);
  const changed = store.vote(poll, "user0", 1);
  assert(changed);
  advance(2000);
  const removed = store.vote(changed, "user0", null);
  assert(removed);
  assert.equal(removed.votes.size, 499);
});
test("preview and poll IDs are bound to user, guild, channel and source message", () => {
  const { store, draft, poll } = fixture();
  for (const wrong of [
    { ...scope, user: "bob" },
    { ...scope, guild: "other" },
    { ...scope, channel: "other" },
  ]) {
    assert.throws(() => store.getSession(draft.id, wrong), UserError);
  }
  assert.throws(() => store.getPoll(poll.id, { ...scope, channel: "other" }), UserError);
  assert.throws(() => store.getPoll(poll.id, scope, "forged"), UserError);
  assert.equal(store.getPoll(poll.id, { ...scope, user: "bob" }, "message"), poll);
});
test("prune drops expired previews, cooldowns and poll voter maps", () => {
  const { store, draft, poll, advance } = fixture();
  store.published.set(scope.guild, store.now());
  advance(LIMITS.sessionLifetime);
  assert.throws(() => store.getSession(draft.id, scope), UserError);
  assert.equal(store.published.size, 0);
  advance(LIMITS.lifetime);
  assert.throws(() => store.getPoll(poll.id, scope), UserError);
  assert.equal(store.polls.size, 0);
});
test("new preview replaces this member's preview but preserves other members", () => {
  const { store, draft } = fixture();
  const other = store.session({ ...scope, user: "bob" }, { question });
  const next = store.session(scope, { question });
  assert(!store.sessions.has(draft.id));
  assert(store.sessions.has(other.id));
  assert(store.sessions.has(next.id));
});
test("preview capacity remains bounded without evicting other members", () => {
  const { store } = fixture();
  for (let n = 1; n < LIMITS.sessions; n++)
    store.session({ ...scope, user: `user${n}` }, { question });
  assert.throws(() => store.session({ ...scope, user: "extra" }, { question }), /capacity/);
  assert.equal(store.sessions.size, LIMITS.sessions);
});
test("poll limits and server publication cooldown are enforced", () => {
  const { store, draft, poll, advance } = fixture();
  store.published.set(scope.guild, store.now());
  assert.throws(() => store.preparePoll(draft), /30/);
  advance(LIMITS.publishInterval);
  store.polls.set("second", { ...poll, id: "second" });
  assert.throws(() => store.preparePoll(draft), /limit/);
  store.polls.clear();
  for (let n = 0; n < LIMITS.polls; n++)
    store.polls.set(`p${n}`, { ...poll, id: `p${n}`, guild: `g${n}` });
  assert.throws(() => store.preparePoll(draft), /limit/);
});
test("exclusive rejects concurrent work and releases after a failed request", async () => {
  const { store } = fixture();
  let release = () => {};
  const waiting = store.exclusive(
    scope.guild,
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  await assert.rejects(
    store.exclusive(scope.guild, async () => {}),
    /progress/,
  );
  await store.exclusive("other", async () => {});
  release();
  await waiting;
  await assert.rejects(
    store.exclusive(scope.guild, async () => {
      throw new Error("network");
    }),
  );
  assert.equal(store.busy.size, 0);
});
test("public totals contain no voter IDs and fit Discord content/component limits", () => {
  const { poll } = fixture();
  poll.title = "*".repeat(80);
  poll.options = Array.from({ length: 4 }, (_, n) => `${n}${"*".repeat(59)}`);
  poll.votes.set("private-user-id-123", 3);
  const output = panel(poll);
  assert(output.content.length <= 2000);
  assert(!JSON.stringify(output).includes("private-user-id-123"));
  assert.deepEqual(output.allowedMentions.parse, []);
  for (const row of output.components)
    for (const item of row.toJSON().components) {
      assert(
        item.type === 2 &&
          "label" in item &&
          item.label &&
          item.label.length <= 80 &&
          "custom_id" in item &&
          item.custom_id.length <= 100,
      );
    }
  for (const row of panel(poll, true).components)
    for (const item of row.toJSON().components) assert(item.disabled);
});
test("modal uses Labels; guild command requires Manage Server and omits global-only fields", () => {
  const form = modal().toJSON();
  assert(form.components.every((component) => component.type === 18));
  const definition = command.toJSON();
  assert.equal(definition.default_member_permissions, "32");
  assert.equal(definition.contexts, undefined);
  assert.equal(definition.integration_types, undefined);
});
test("private preview describes temporary storage before publication", () => {
  const { draft } = fixture();
  assert(preview(draft).content.includes("temporary RAM"));
});
test("configuration errors never contain supplied credentials", () => {
  const fake = "example-invalid-credential";
  assert.throws(
    () => config({ DISCORD_TOKEN: fake }),
    (error: unknown) => error instanceof Error && !error.message.includes(fake),
  );
  assert.deepEqual(
    config({
      DISCORD_TOKEN: "x".repeat(40),
      DISCORD_APPLICATION_ID: "1".repeat(18),
      DISCORD_GUILD_ID: "2".repeat(18),
    }),
    { token: "x".repeat(40), application: "1".repeat(18), guild: "2".repeat(18) },
  );
});
