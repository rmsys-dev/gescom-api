/**
 * Catálogo de parâmetros por empresa (feature flags).
 * Independente do RBAC de módulos: parâmetro = empresa usa o pacote;
 * permissão = membro pode operar.
 */

export const enterpriseParameterCatalog = [
  "trabalha_os",
  "trabalha_marketplace",
] as const;

export type EnterpriseParameterSlug =
  (typeof enterpriseParameterCatalog)[number];

/**
 * Fallback quando a linha ainda não existe na BD.
 * Criação via maintainer grava sempre `enabled: false` (opt-in por suporte).
 * Empresas já existentes foram backfilladas com `trabalha_of = true` na migration 0065;
 * o slug foi renomeado para `trabalha_os` na migration 0067.
 * `trabalha_marketplace` entra desligado para empresas já existentes na migration 0138.
 */
export const enterpriseParameterDefaults = {
  trabalha_os: false,
  trabalha_marketplace: false,
} as const satisfies Record<EnterpriseParameterSlug, boolean>;

/**
 * Permissões do pacote OS/veículos omitidas em `/auth/me` quando `trabalha_os`
 * está desligado. Ordem de serviço, comissão e veículos ficam ocultos sem o parâmetro.
 */
export const osPackagePermissionSlugs = [
  "consultar_ordem_servico",
  "relatorio_ordem_servico",
  "incluir_ordem_servico",
  "alterar_ordem_servico",
  "excluir_ordem_servico",
  "gerenciais_ordem_servico",
  "consultar_comissoes",
  "relatorio_comissoes",
  "incluir_comissoes",
  "alterar_comissoes",
  "excluir_comissoes",
  "consultar_veiculos",
  "consultar_veiculos_membros",
  "relatorio_veiculos",
  "relatorio_veiculos_membros",
  "incluir_veiculos",
  "incluir_veiculos_membros",
  "alterar_veiculos",
  "alterar_veiculos_membros",
  "excluir_veiculos",
  "excluir_veiculos_membros",
] as const;

/**
 * Permissões do pacote marketplace omitidas em `/auth/me` quando
 * `trabalha_marketplace` está desligado.
 */
export const marketplacePackagePermissionSlugs = [
  "consultar_marketplace_produtos",
  "incluir_marketplace_produtos",
  "alterar_marketplace_produtos",
  "alterar_marketplace_avaliacoes",
  "alterar_marketplace_perguntas",
  "excluir_marketplace_produtos",
] as const;

export const permissionsHiddenByParameter = {
  trabalha_os: osPackagePermissionSlugs,
  trabalha_marketplace: marketplacePackagePermissionSlugs,
} as const satisfies Record<EnterpriseParameterSlug, readonly string[]>;

export const isEnterpriseParameterSlug = (
  value: string,
): value is EnterpriseParameterSlug =>
  (enterpriseParameterCatalog as readonly string[]).includes(value);

export const mergeEnterpriseParameters = (
  rows: ReadonlyArray<{ parameter: string; enabled: boolean }>,
): Record<EnterpriseParameterSlug, boolean> => {
  const resolved: Record<EnterpriseParameterSlug, boolean> = {
    ...enterpriseParameterDefaults,
  };
  for (const row of rows) {
    const slug =
      row.parameter === "trabalha_of" ? "trabalha_os" : row.parameter;
    if (isEnterpriseParameterSlug(slug)) {
      resolved[slug] = row.enabled === true;
    }
  }
  return resolved;
};

/** Mapa completo do catálogo: todo slug presente, `true` = ativo, `false` = inativo. */
export const serializeEnterpriseParameters = (
  resolved: Partial<Record<EnterpriseParameterSlug, boolean>> = {},
): Record<EnterpriseParameterSlug, boolean> => {
  const serialized: Record<EnterpriseParameterSlug, boolean> = {
    ...enterpriseParameterDefaults,
  };
  for (const slug of enterpriseParameterCatalog) {
    serialized[slug] = resolved[slug] === true;
  }
  return serialized;
};

export const filterPermissionsByParameters = (
  permissions: string[],
  parameters: Record<EnterpriseParameterSlug, boolean>,
): string[] => {
  const hidden = new Set<string>();
  for (const slug of enterpriseParameterCatalog) {
    if (!parameters[slug]) {
      for (const permission of permissionsHiddenByParameter[slug]) {
        hidden.add(permission);
      }
    }
  }
  if (hidden.size === 0) {
    return permissions;
  }
  return permissions.filter((permission) => !hidden.has(permission));
};
