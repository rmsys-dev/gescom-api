import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../../src/db/index.js";
import {
  enterprisesAddress,
  users,
  usersAddress,
  usersContact,
  usersPersonalInfo,
} from "../../../src/db/schema.js";
import { resolveBootstrapContext } from "../lib/context.js";
import type { AddressSeedRefs } from "./addresses.js";
import { listFictitiousUserIds } from "./fictitious-users.js";

export async function seedUserProfiles(
  addressRefs: AddressSeedRefs,
): Promise<void> {
  const ctx = await resolveBootstrapContext();
  const fictitiousIds = await listFictitiousUserIds();
  const profileUserIds = fictitiousIds.slice(0, 20);

  console.log(
    `Seed perfis de usuario (${String(profileUserIds.length)} registros)...`,
  );

  for (let i = 0; i < profileUserIds.length; i++) {
    const userId = profileUserIds[i]!;
    const loc = addressRefs.locations[i % addressRefs.locations.length]!;

    const personalExisting = await db
      .select({ id: usersPersonalInfo.id })
      .from(usersPersonalInfo)
      .where(
        and(eq(usersPersonalInfo.userId, userId), isNull(usersPersonalInfo.deletedAt)),
      )
      .limit(1);

    if (!personalExisting[0]) {
      await db.insert(usersPersonalInfo).values({
        userId,
        gender: i % 2 === 0 ? "FEMININO" : "MASCULINO, NÃO_INFORMADO",
        birthDate: new Date(1980 + (i % 25), i % 12, (i % 28) + 1),
        placeOfBirth: loc.label.split(" - ")[0] ?? "Brasil",
      });
    }

    const addressExisting = await db
      .select({ id: usersAddress.id })
      .from(usersAddress)
      .where(
        and(
          eq(usersAddress.userId, userId),
          eq(usersAddress.adressType, "PRINCIPAL"),
          isNull(usersAddress.deletedAt),
        ),
      )
      .limit(1);

    if (!addressExisting[0]) {
      await db.insert(usersAddress).values({
        userId,
        cepId: loc.cepId,
        countryId: addressRefs.countryId,
        stateId: loc.stateId,
        cityId: loc.cityId,
        adressType: "PRINCIPAL",
      });
    }

    const userRow = (
      await db
        .select({ userEmail: users.userEmail, userPhone: users.userPhone })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
    )[0];

    if (userRow) {
      const contactExisting = await db
        .select({ id: usersContact.id })
        .from(usersContact)
        .where(
          and(
            eq(usersContact.userId, userId),
            eq(usersContact.type, "PRINCIPAL"),
            isNull(usersContact.deletedAt),
          ),
        )
        .limit(1);

      if (!contactExisting[0]) {
        await db.insert(usersContact).values({
          userId,
          email: userRow.userEmail,
          phone: userRow.userPhone,
          whatsapp: userRow.userPhone,
          type: "PRINCIPAL",
        });
      }
    }
  }

  const principalLoc = addressRefs.locations[0];
  if (principalLoc) {
    const entAddrExisting = await db
      .select({ id: enterprisesAddress.id })
      .from(enterprisesAddress)
      .where(
        and(
          eq(enterprisesAddress.enterpriseId, ctx.enterpriseId),
          eq(enterprisesAddress.adressType, "PRINCIPAL"),
          isNull(enterprisesAddress.deletedAt),
        ),
      )
      .limit(1);

    if (!entAddrExisting[0]) {
      await db.insert(enterprisesAddress).values({
        enterpriseId: ctx.enterpriseId,
        cepId: principalLoc.cepId,
        countryId: addressRefs.countryId,
        stateId: principalLoc.stateId,
        cityId: principalLoc.cityId,
        adressType: "PRINCIPAL",
      });
      console.log("Endereco principal da empresa bootstrap criado.");
    }
  }

  console.log("Seed perfis de usuario concluido.");
}
