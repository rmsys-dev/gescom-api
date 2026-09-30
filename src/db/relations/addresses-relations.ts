import { relations } from "drizzle-orm";
import { enterprisesAddress } from "../entities/enterprises.js";
import {
  ceps,
  countries,
  states,
  statesDivisions,
  cities,
} from "../entities/addresses.js";
import { usersAddress } from "../entities/users.js";

//**RELAÇÕES DE ENDEREÇOS**//
export const countriesRelations = relations(countries, ({ many }) => ({
  states: many(states),
  usersAddresses: many(usersAddress),
  enterprisesAddresses: many(enterprisesAddress),
}));

//**RELAÇÕES DE ESTADOS**//
export const statesRelations = relations(states, ({ one, many }) => ({
  country: one(countries, {
    fields: [states.countryId],
    references: [countries.id],
  }),
  cities: many(cities),
  divisions: many(statesDivisions),
  usersAddresses: many(usersAddress),
  enterprisesAddresses: many(enterprisesAddress),
}));

export const statesDivisionsRelations = relations(
  statesDivisions,
  ({ one }) => ({
    state: one(states, {
      fields: [statesDivisions.statesId],
      references: [states.id],
    }),
  }),
);

//**RELAÇÕES DE CIDADES**//
export const citiesRelations = relations(cities, ({ one, many }) => ({
  state: one(states, {
    fields: [cities.stateId],
    references: [states.id],
  }),
  ceps: many(ceps),
  usersAddresses: many(usersAddress),
  enterprisesAddresses: many(enterprisesAddress),
}));

//**RELAÇÕES DE CEPS**//
export const cepsRelations = relations(ceps, ({ one, many }) => ({
  city: one(cities, {
    fields: [ceps.cityId],
    references: [cities.id],
  }),
  usersAddresses: many(usersAddress),
  enterprisesAddresses: many(enterprisesAddress),
}));
