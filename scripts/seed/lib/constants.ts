/** Alinhado a `BOOTSTRAP_SEED` em `scripts/seed-bootstrap.ts`. */
export const BOOTSTRAP_ENTERPRISE_CNPJ = "15243294000173";
export const BOOTSTRAP_ADMIN_CPF = "64079805187";

/** Prefixo CPF para usuarios ficticios sem credenciais (90000000001…). */
export const FICTITIOUS_CPF_PREFIX = "900000000";

export const SEED_VOLUMES = {
  /** Usuarios ficticios (sem credenciais). */
  fictitiousUsers: 50,
  /** Membros vinculados a empresa bootstrap. */
  members: 35,
  /** Produtos vinculados a empresa bootstrap. */
  products: 30,
  /** Vendas + orcamentos. */
  sales: 300,
  setoresEstoque: 3,
  locacoesPorSetor: 4,
} as const;

export const EXTRA_DEPARTMENTS = [
  {
    name: "Operacional",
    description: "Departamento operacional seed (ref operacional)",
    permissionReference: "operacional" as const,
  },
  {
    name: "Recursos Humanos",
    description: "Departamento RH seed (ref recursos_humanos)",
    permissionReference: "recursos_humanos" as const,
  },
  {
    name: "Comercial",
    description: "Departamento comercial seed (ref operacional)",
    permissionReference: "operacional" as const,
  },
] as const;
