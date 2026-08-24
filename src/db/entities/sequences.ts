import { sql } from "drizzle-orm";
import { integer, pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { enterprises } from "./enterprises.js";
import { tz } from "../functions.js";
import { sequenceTypeEnum } from "../enums.js";

//Tabela de sequências de empresas
