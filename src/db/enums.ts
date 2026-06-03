import { pgEnum } from "drizzle-orm/pg-core";

//Status de usuário (ativo, inativo, bloqueado, pendente, especial, cobrança, não vender)
export const statusEnum = pgEnum("status", [
  "ATIVO",
  "INATIVO",
  "BLOQUEADO",
  "PENDENTE",
  "ESPECIAL",
  "COBRANCA",
  "NAO_VENDER",
]);

//Tipo de venda (venda, orçamento, devolução, cancelamento, outro)
export const saleTypeEnum = pgEnum("sale_type", [
  "VENDA",
  "ORCAMENTO",
  "DEVOLUCAO",
  "CANCELAMENTO",
  "OUTRO",
]);

//Tipo de pis/cofins (entrada, saída, transferência, outro)
export const pisCofinsTypeEnum = pgEnum("pis_cofins_type", [
  "ENTRADA",
  "SAIDA",
  "TRANSFERENCIA",
  "OUTRO",
]);

//Tipo de contato de usuário (secundário, principal, trabalho, residencial, comercial, conjugue, filho, pai, mãe, amigo, outro)
export const typeUserContactEnum = pgEnum("type_user_contact", [
  "SECUNDARIO",
  "PRINCIPAL",
  "TRABALHO",
  "RESIDENCIAL",
  "COMERCIAL",
  "CONJUGE",
  "FILHO",
  "PAI",
  "MAE",
  "AMIGO",
  "OUTRO",
]);

//Tipo de crédito (crédito, débito, outro)
export const creditTypeEnum = pgEnum("credit_type", [
  "CREDITO",
  "DEBITO",
  "OUTRO",
]);

//Tipo de moradia (alugado, próprio, doado, emprestado, outro)
export const housingTypeEnum = pgEnum("housing_type", [
  "ALUGADO",
  "PRÓPRIO",
  "DOADO",
  "EMPRESTADO",
  "OUTRO",
]);

//Gênero (feminino, masculino, não informado)
export const genderEnum = pgEnum("gender", [
  "FEMININO",
  "MASCULINO, NÃO_INFORMADO",
]);
export const maritalStatusEnum = pgEnum("marital_status", [
  "SOLTEIRO",
  "CASADO",
  "DIVORCIADO",
  "VIUVO",
  "UNIAO_ESTAVEL",
]);

//Status de permissão (permitido, negado)
export const statusPermissionEnum = pgEnum("status_permission", [
  "ALLOW",
  "DENIED",
]);

//Tipo de endereço (residencial, comercial, entrega, cobrança, faturamento, secundário, principal, outro)
export const adressTypeEnum = pgEnum("adress_type", [
  "RESIDENCIAL",
  "COMERCIAL",
  "ENTREGA",
  "COBRANCA",
  "FATURAMENTO",
  "SECUNDARIO",
  "PRINCIPAL",
  "OUTRO",
]);

//Tipo de documento (venda, orçamento)
export const documentTypeEnum = pgEnum("document_type", ["VENDA", "ORCAMENTO"]);

//Status de venda (aberta, finalizada, cancelada)
export const saleStatusEnum = pgEnum("sale_status", [
  "ABERTA",
  "FINALIZADA",
  "CANCELADA",
]);
export const loginTypeEnum = pgEnum("login_type", ["EMAIL", "CPF"]);

//Propósito de convite (primeiro acesso, aceitação de membro)
export const invitePurposeEnum = pgEnum("invite_purpose", [
  "FIRST_ACCESS",
  "MEMBERSHIP_ACCEPT",
]);

//Canal de convite (email, sms, whatsapp)
export const inviteChannelEnum = pgEnum("invite_channel", [
  "EMAIL",
  "SMS",
  "WHATSAPP",
]);

//Classes de membros
export const memberClassEnum = pgEnum("member_class", [
  "ADMINISTRADOR",
  "GERENTE",
  "COLABORADOR",
  "CLIENTE",
  "FORNECEDOR",
  "PARCEIRO",
  "SOCIO",
  "INVESTIDOR",
  "AUDITOR",
  "OUTRO",
]);

//Eventos de auditoria de autenticação
export const authEventEnum = pgEnum("auth_event", [
  "LOGIN_SUCCESS",
  "LOGIN_FAILED_PASSWORD",
  "LOGIN_FAILED_USER",
  "LOGIN_BLOCKED",
  "LOGOUT",
  "REFRESH",
  "REFRESH_REUSE",
  "SWITCH_ENTERPRISE",
  "RATE_LIMITED",
  "PERMISSION_DENIED",
  "SIGNUP",
  "SIGNUP_FAILED",
  "FIRST_ACCESS_REQUESTED",
  "FIRST_ACCESS_VERIFIED",
  "FIRST_ACCESS_FAILED",
  "INVITE_CREATED",
  "INVITE_ACCEPTED",
  "INVITE_DECLINED",
  "INVITE_EXPIRED",
  "CODE_RATE_LIMITED",
  "PASSWORD_RESET_REQUESTED",
  "PASSWORD_RESET_VERIFIED",
  "PASSWORD_RESET_FAILED",
  "PASSWORD_RESET_RATE_LIMITED",
]);

//Ações de auditoria de entidades de domínio
export const entityAuditActionEnum = pgEnum("entity_audit_action", [
  "CREATE",
  "UPDATE",
  "SOFT_DELETE",
  "DELETE",
]);

//Tipos de entidade auditáveis (domínio)
export const entityTypeEnum = pgEnum("entity_type", [
  "USERS",
  "USERS_PERSONAL_INFO",
  "USERS_ADDRESS",
  "USERS_CONTACT",
  "USERS_RELATIONSHIPS",
  "USERS_TAX_INFOS",
  "USERS_FINANCIAL_INFO",
  "ENTERPRISES",
  "ENTERPRISES_ADDRESS",
  "ENTERPRISES_MEMBERS",
  "MEMBERS_DEPARTMENTS",
  "MEMBER_PERMISSIONS_DEFAULT",
  "MEMBER_EXTRA_PERMISSIONS",
  "DEPARTMENTS",
  "COUNTRIES",
  "STATES",
  "CITIES",
  "CEPS",
  "PRODUCTS",
  "PRODUCTS_ENTERPRISES",
  "MEASUREMENT_UNITS",
  "PRODUCT_TYPES",
  "PRODUCTS_NCM",
  "PRODUCTS_CEST",
  "PRODUCTS_ANP",
  "PRODUCTS_NBS",
  "PRODUCT_GROUPS",
  "PRODUCT_SUBGROUPS",
  "PRODUCT_BRANDS",
  "PIS_COFINS_SITUATION",
  "ICMS_TAXATION",
  "PRODUCT_PRICES",
  "PROMOTIONAL_PRICES",
  "PRODUCT_TAXATION",
  "PRODUCT_APPLICATIONS",
  "STOCK_SECTORS",
  "STOCK_LOCATIONS",
  "STOCK_BATCHES",
  "STOCK_BATCH_BALANCES",
  "STOCK_SECTORS_RENTAL",
  "STOCK_MIN_MAX",
  "STOCK_MOVEMENTS",
  "PAYMENT_TYPES",
  "SALES",
  "SALES_RETURNS",
]);

export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "ENTRADA",
  "SAIDA",
  "TRANSFERENCIA",
  "AJUSTE",
  "PERDA",
  "VENDA",
  "COMPRA",
  "DEVOLUCAO",
  "CANCELAMENTO",
  "OUTROS",
]);

export const stockBatchStatusEnum = pgEnum("stock_batch_status", [
  "ATIVO",
  "BLOQUEADO",
  "ESGOTADO",
]);
export const saleReturnStatusEnum = pgEnum("sale_return_status", [
  "ABERTA",
  "FINALIZADA",
  "CANCELADA",
]);
export const saleReturnSituationEnum = pgEnum("sale_return_situation", [
  "SEM_DEVOLUCAO",
  "PARCIAL",
  "TOTAL",
]);
export const saleReturnKindEnum = pgEnum("sale_return_kind", [
  "PARCIAL",
  "TOTAL",
]);
export const budgetClosureSituationEnum = pgEnum("budget_closure_situation", [
  "ABERTO",
  "PARCIAL",
  "FECHADO",
]);
export const budgetConversionKindEnum = pgEnum("budget_conversion_kind", [
  "PARCIAL",
  "TOTAL",
]);
