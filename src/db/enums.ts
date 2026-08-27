import { pgEnum } from "drizzle-orm/pg-core";

// Tipo de sequência (VENDA, NFE, NFSE, NFCE, MDFE, CTE)
export const sequenceTypeEnum = pgEnum("sequence_type", [
  "VENDA",
  "NFE",
  "NFSE",
  "NFCE",
  "MDFE",
  "CTE",
]);

export type SequenceType = (typeof sequenceTypeEnum.enumValues)[number];

//Status de usuário (ativo, inativo, bloqueado, pendente, especial, cobrança, não vender)
export const statusEnum = pgEnum("status", [
  "ATIVO",
  "INATIVO",
  "BLOQUEADO",
  "PENDENTE",
  "ESPECIAL",
  "COBRANCA",
  "NAO_VENDER",
  "FUNCIONARIO",
]);

//Tipo de venda (venda, orçamento, devolução, cancelamento, outro)
export const saleTypeEnum = pgEnum("sale_type", [
  "VENDA",
  "ORCAMENTO",
  "DEVOLUCAO",
  "CANCELAMENTO",
  "ORDEM DE SERVICO",
]);

// TIPO DE PAGAMENTO ( A VISTA, A PRAZO, OUTROS)
export const paymentTypeEnum = pgEnum("payment_type", [
  "A_VISTA",
  "A_PRAZO",
  "OUTROS",
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
  "OUTRO",
]);

//Tipo de crédito (crédito, débito, outro)
export const creditTypeEnum = pgEnum("credit_type", ["MENSAL", "GERAL"]);

//Tipo de moradia (alugado, próprio, doado, emprestado, outro)
export const housingTypeEnum = pgEnum("housing_type", [
  "ALUGADO",
  "PROPRIO",
  "DOADO",
  "EMPRESTADO",
  "OUTRO",
]);

//Gênero (feminino, masculino, não informado)
export const genderEnum = pgEnum("gender", [
  "FEMININO",
  "MASCULINO",
  "NAO_INFORMADO",
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
export type StatusPermission = (typeof statusPermissionEnum.enumValues)[number];

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

//Status de venda (aberta, finalizada, cancelada, inativa)
export const saleStatusEnum = pgEnum("sale_status", [
  "ABERTA",
  "FINALIZADA",
  "CANCELADA",
  "INATIVA",
  "PARCIAL",
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
  "TRANSPORTADOR",
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
  "MEMBERS_PERSONAL_INFO",
  "MEMBERS_ADDRESS",
  "MEMBERS_CONTACT",
  "MEMBERS_RELATIONSHIPS",
  "MEMBERS_TAX_INFOS",
  "MEMBERS_FINANCIAL_INFO",
  "ENTERPRISES",
  "ENTERPRISES_ADDRESS",
  "ENTERPRISE_PARAMETERS",
  "ENTERPRISES_MEMBERS",
  "MEMBERS_DEPARTMENTS",
  "MEMBER_PERMISSIONS_DEFAULT",
  "MEMBER_EXTRA_PERMISSIONS",
  "DEPARTMENTS",
  "MODULES",
  "MEMBER_MODULES",
  "MODULE_PERMISSIONS",
  "COUNTRIES",
  "STATES",
  "CITIES",
  "CEPS",
  "PRODUCTS",
  "PRODUCTS_ENTERPRISES",
  "MEASUREMENT_UNITS",
  "PRODUCT_TYPES",
  "TYPE_SPED",
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
  "TYPE_NETWORKS",
  "TYPE_SUPPLIER_CUSTOMERS",
  "VEHICLES",
  "VEHICLES_ENTERPRISES_MEMBERS",
  "ENTERPRISES_MEMBER_SALES_ITEMS",
  "MECHANIC_SALES_ITEMS",
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
export const saleConversionClosureKindEnum = pgEnum(
  "sale_conversion_closure_kind",
  ["PARCIAL", "TOTAL"],
);

//Tipo de cliente (classificacao de clientes, cliente, fornecedor)
export const typeClassificationCustomersEnum = pgEnum(
  "type_classification_customers",
  ["TODOS", "CLIENTE", "FORNECEDOR"],
);

export const saleOriginEnum = pgEnum("sale_origin", ["WEB", "MOBILE"]);

// tipo de combustiveis
export const fuelTypeEnum = pgEnum("fuel_type", [
  "GASOLINA",
  "ALCOOL",
  "DIESEL",
  "ELETRICO",
]);

// tipo de proprietario (proprietario, locatario)
export const ownerTypeEnum = pgEnum("owner_type", [
  "PROPRIETARIO",
  "LOCATARIO",
  "OUTROS",
]);

// tipo de veiculos ( Truck, Toco, Van, Carroceria, Outros)
export const vehicleTypeEnum = pgEnum("vehicle_type", [
  "TRUCK",
  "TOCO",
  "CAVALO MECANICO",
  "VAN",
  "UTILITARIO",
  "OUTROS",
]);

// tipo de carroceria ( Nao aplicavel, Aberta, Fechada, Semi-Fechada, Outros )
export const bodyTypeEnum = pgEnum("body_type", [
  "NAO_APLICAVEL",
  "ABERTA",
  "FECHADA/BAU",
  "GRANELERA",
  "PORTA CONTAINER",
  "SIDER",
]);

// tipo de eixo ( Simples, Duplo, Triplo, Quadruplo, Outros )
export const axleTypeEnum = pgEnum("axle_type", [
  "VEICULO 2 EIXOS",
  "VEICULO 3 EIXOS",
  "VEICULO 4 EIXOS",
  "VEICULO 5 EIXOS",
  "VEICULO 6 EIXOS",
  "VEICULO 7 EIXOS",
  "VEICULO 8 EIXOS",
  "VEICULO 9 EIXOS",
  "VEICULO 10 EIXOS",
  "VEICULO ACIMA 10 EIXOS",
]);

// tipo de serviço ( serviço, garantia )
export const saleServiceTypeEnum = pgEnum("sale_service_type", [
  "SERVICO",
  "GARANTIA",
]);

// inteiro ou fracionado
export const integerOrFractionalEnum = pgEnum("integer_or_fractional", [
  "INTEIRO",
  "FRACIONADO",
]);

// modelo de ordem servico
export const orderServiceModelEnum = pgEnum("order_service_model", ["VEICULO"]);

// tipo de serviço ( PROPRIO, OUTROS )
export const typeServiceEnum = pgEnum("type_service", ["PROPRIO", "OUTROS"]);

// tipo de conversão (orçamento -> venda, orçamento -> OS, OS -> venda)
export const saleConversionTypeEnum = pgEnum("sale_conversion_type", [
  "ORCAMENTO-VENDA",
  "ORCAMENTO-ORDEM_SERVICO",
  "ORDEM_SERVICO-VENDA",
]);
export type SaleConversionType =
  (typeof saleConversionTypeEnum.enumValues)[number];

// nivel de acesso (N0 sem permissão … N6 gerenciais)
export const accessLevelEnum = pgEnum("access_level", [
  "N0",
  "N1",
  "N2",
  "N3",
  "N4",
  "N5",
  "N6",
]);
