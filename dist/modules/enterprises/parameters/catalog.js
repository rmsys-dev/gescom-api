/**
 * Catálogo de parâmetros por empresa (feature flags).
 * Independente do RBAC de módulos: parâmetro = empresa usa o pacote;
 * permissão = membro pode operar.
 */
export const enterpriseParameterCatalog = ["trabalha_os"];
/**
 * Fallback quando a linha ainda não existe na BD.
 * Criação via maintainer grava sempre `enabled: false` (opt-in por suporte).
 * Empresas já existentes foram backfilladas com `trabalha_of = true` na migration 0065;
 * o slug foi renomeado para `trabalha_os` na migration 0067.
 */
export const enterpriseParameterDefaults = {
    trabalha_os: false,
};
/**
 * Permissões do pacote OS/veículos omitidas em `/auth/me` quando `trabalha_os`
 * está desligado. OS reutiliza slugs de vendas (`consultar/incluir/alterar_vendas`);
 * o bloqueio de OS é por tipo de documento nas rotas/serviço.
 */
export const osPackagePermissionSlugs = [
    "consultar_veiculos",
    "consultar_veiculos_membros",
    "consultar_comissoes_itens_venda",
    "incluir_veiculos",
    "incluir_veiculos_membros",
    "incluir_comissoes_itens_venda",
    "alterar_veiculos",
    "alterar_veiculos_membros",
    "alterar_comissoes_itens_venda",
    "excluir_veiculos",
    "excluir_veiculos_membros",
    "excluir_comissoes_itens_venda",
];
export const permissionsHiddenByParameter = {
    trabalha_os: osPackagePermissionSlugs,
};
export const isEnterpriseParameterSlug = (value) => enterpriseParameterCatalog.includes(value);
export const mergeEnterpriseParameters = (rows) => {
    const resolved = {
        ...enterpriseParameterDefaults,
    };
    for (const row of rows) {
        const slug = row.parameter === "trabalha_of" ? "trabalha_os" : row.parameter;
        if (isEnterpriseParameterSlug(slug)) {
            resolved[slug] = row.enabled === true;
        }
    }
    return resolved;
};
/** Mapa completo do catálogo: todo slug presente, `true` = ativo, `false` = inativo. */
export const serializeEnterpriseParameters = (resolved = {}) => {
    const serialized = {
        ...enterpriseParameterDefaults,
    };
    for (const slug of enterpriseParameterCatalog) {
        serialized[slug] = resolved[slug] === true;
    }
    return serialized;
};
export const filterPermissionsByParameters = (permissions, parameters) => {
    const hidden = new Set();
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
