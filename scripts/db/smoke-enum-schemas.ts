import "dotenv/config";
import assert from "node:assert/strict";
import { patchMembershipSchema } from "../../src/modules/memberships/schema.js";
import { usersContactCreateSchema } from "../../src/modules/users/onboarding/schema.js";

// FUNCIONARIO aceito no patch de membro
const memberPatch = patchMembershipSchema.safeParse({ status: "FUNCIONARIO" });
assert.equal(memberPatch.success, true, "FUNCIONARIO deve ser aceito em patchMembershipSchema");

// AMIGO rejeitado em contato
const contactAmigo = usersContactCreateSchema.safeParse({
  type: "AMIGO",
  email: "test@example.com",
});
assert.equal(contactAmigo.success, false, "AMIGO deve ser rejeitado em usersContactCreateSchema");

// OUTRO aceito em contato
const contactOutro = usersContactCreateSchema.safeParse({
  type: "OUTRO",
  email: "test@example.com",
});
assert.equal(contactOutro.success, true, "OUTRO deve ser aceito em usersContactCreateSchema");

console.log("Schema smoke tests passed.");
