import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { verifyPassword } from "better-auth/crypto";
import {
  credentialsFromEnv,
  ensureAdmin,
  generateAdminEmail,
  generateAdminPassword,
  generateAuthId,
  generateSecret,
  isAdminEmail,
  resolveAdminInput,
} from "./ensure-admin.mjs";

function fakeClient(store) {
  return {
    async query(text, params = []) {
      const sql = text.replace(/\s+/g, " ").trim().toLowerCase();
      if (sql === "begin" || sql === "commit" || sql === "rollback") return { rows: [] };
      if (sql.startsWith("select id, email from \"user\"")) {
        const first = store.users[0];
        return { rows: first ? [{ id: first.id, email: first.email }] : [] };
      }
      if (sql.startsWith("insert into \"user\"")) {
        if (store.users.length) throw new Error("duplicate user");
        store.users.push({ id: params[0], name: params[1], email: params[2] });
        return { rows: [] };
      }
      if (sql.startsWith("insert into \"account\"")) {
        store.accounts.push({
          id: params[0],
          accountId: params[1],
          userId: params[2],
          password: params[3],
        });
        return { rows: [] };
      }
      if (sql.startsWith("insert into user_roles")) {
        store.roles.push({ userId: params[0], role: "admin" });
        return { rows: [] };
      }
      throw new Error(`unexpected sql: ${text}`);
    },
  };
}

describe("generateSecret", () => {
  it("emits the requested length from the alphabet", () => {
    const value = generateSecret(16);
    assert.match(value, /^[a-zA-Z0-9]{16}$/);
    assert.notEqual(generateAdminPassword(), generateAdminPassword());
    assert.match(generateAdminEmail(), /^[a-z0-9]{10}@folio\.local$/);
    assert.match(generateAuthId(), /^[a-zA-Z0-9]{32}$/);
  });
});

describe("credentialsFromEnv", () => {
  it("accepts overrides and rejects a short password or bad email", () => {
    assert.deepEqual(
      credentialsFromEnv({
        FOLIO_ADMIN_EMAIL: " Owner@Example.com ",
        FOLIO_ADMIN_PASSWORD: "long-enough",
        FOLIO_ADMIN_NAME: "折页",
      }),
      { email: "owner@example.com", password: "long-enough", name: "折页" },
    );
    assert.equal(credentialsFromEnv({ FOLIO_ADMIN_EMAIL: "not-an-email" }).email, "");
    assert.equal(credentialsFromEnv({ FOLIO_ADMIN_PASSWORD: "short" }).password, "");
    assert.equal(isAdminEmail("a@folio.local"), true);
    assert.throws(
      () => resolveAdminInput({ FOLIO_ADMIN_EMAIL: "nope" }),
      /FOLIO_ADMIN_EMAIL/,
    );
    assert.throws(
      () => resolveAdminInput({ FOLIO_ADMIN_PASSWORD: "short" }),
      /FOLIO_ADMIN_PASSWORD/,
    );
  });
});

describe("ensureAdmin", () => {
  it("creates one credential admin and never overwrites an existing user", async () => {
    const store = { users: [], accounts: [], roles: [] };
    const first = await ensureAdmin(fakeClient(store), {
      hash: async (password) => `hashed:${password}`,
      id: (() => {
        let n = 0;
        return () => `id${++n}`;
      })(),
      env: {
        FOLIO_ADMIN_EMAIL: "owner@example.com",
        FOLIO_ADMIN_PASSWORD: "correct-horse",
        FOLIO_ADMIN_NAME: "站长",
      },
    });
    assert.deepEqual(first, {
      created: true,
      id: "id1",
      email: "owner@example.com",
      password: "correct-horse",
    });
    assert.equal(store.users.length, 1);
    assert.equal(store.accounts[0].accountId, "id1");
    assert.equal(store.accounts[0].password, "hashed:correct-horse");
    assert.deepEqual(store.roles, [{ userId: "id1", role: "admin" }]);

    store.users[0] = { id: "id1", name: "站长", email: "owner@example.com" };
    const second = await ensureAdmin(fakeClient(store), {
      hash: async () => "should-not-run",
      env: { FOLIO_ADMIN_EMAIL: "other@example.com", FOLIO_ADMIN_PASSWORD: "new-password" },
    });
    assert.deepEqual(second, {
      created: false,
      id: "id1",
      email: "owner@example.com",
      password: "",
    });
    assert.equal(store.users.length, 1);
    assert.equal(store.accounts.length, 1);
  });

  it("hashes with Better Auth scrypt so sign-in can verify the password", async () => {
    const store = { users: [], accounts: [], roles: [] };
    const result = await ensureAdmin(fakeClient(store), {
      env: { FOLIO_ADMIN_EMAIL: "hash@folio.local", FOLIO_ADMIN_PASSWORD: "verify-me-please" },
    });
    assert.equal(result.created, true);
    const ok = await verifyPassword({
      hash: store.accounts[0].password,
      password: "verify-me-please",
    });
    assert.equal(ok, true);
  });
});
