/**
 * Catálogo de módulos e permissões da API.
 *
 * Fonte da verdade para o maintainer (`modules.reference`) e para o vínculo
 * membro × módulo (`member_modules.access_level`).
 *
 * - Só os módulos **pai** têm referência cadastrável.
 * - Filhos existem só neste arquivo: o pai agrega as permissões próprias + das crianças.
 * - Ex.: lotes entram em `estoque` (ref `"estoque"`); setores e locações entram em `produtos` (ref `"produtos"`).
 * - `administrador` é especial: N6 = união de 100% dos slugs dos módulos de domínio.
 *
 * Níveis (cumulativos na API: Nx inclui N1..Nx):
 *   N0 — sem permissão
 *   N1 — slugs iniciados em `consultar`
 *   N2 — slugs iniciados em `relatorio` (relatórios)
 *   N3 — slugs iniciados em `incluir`
 *   N4 — slugs iniciados em `alterar`
 *   N5 — slugs iniciados em `excluir`
 *   N6 — slugs iniciados em `gerenciais`
 *
 * Alterar permissões de um módulo = editar os buckets abaixo. Nada é gravado
 * como snapshot de permissões padrão em tabela.
 */

export const ACCESS_LEVELS = ["N0", "N1", "N2", "N3", "N4", "N5", "N6"] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

/** Prefixo do slug que cada nível carrega (além dos níveis anteriores). */
export const ACCESS_LEVEL_PREFIXES = {
  N0: [],
  N1: ["consultar"],
  N2: ["relatorio"],
  N3: ["incluir"],
  N4: ["alterar"],
  N5: ["excluir"],
  N6: ["gerenciais"],
} as const satisfies Record<AccessLevel, readonly string[]>;

// ---------------------------------------------------------------------------
// Módulos pai (referência cadastrável) e filhos (apenas agrupamento)
// ---------------------------------------------------------------------------

export const defaultModules = {
  /**
   * Buckets vazios de propósito: o conteúdo efectivo é a união dos módulos
   * de domínio (ver `getExclusivePermissionsByLevel`).
   */
  administrador: {
    name: "Administrador",
    description:
      "Acesso total: todas as permissões de todos os módulos do sistema",
    permissions: {
      N1: [],
      N2: [],
      N3: [],
      N4: [],
      N5: [],
      N6: [],
    },
  },

  usuarios: {
    name: "Gerenciamento de usuários",
    description: "Gestão de utilizadores da empresa",
    permissions: {
      N1: ["consultar_usuarios"],
      N2: [],
      N3: ["incluir_usuarios"],
      N4: ["alterar_usuarios"],
      N5: [],
      N6: [],
    },
  },

  membros: {
    name: "Gerenciamento de membros",
    description:
      "Convites, vínculos e cadastros auxiliares de membro (rede, tipo, módulos e permissões)",
    permissions: {
      N1: ["consultar_membros"],
      N2: [],
      N3: ["incluir_membros"],
      N4: ["alterar_membros"],
      N5: [],
      N6: [],
    },
    children: {
      tipos_rede: {
        name: "Gerenciamento de tipos de rede",
        permissions: {
          N1: ["consultar_tipos_rede"],
          N2: [],
          N3: ["incluir_tipos_rede"],
          N4: ["alterar_tipos_rede"],
          N5: ["excluir_tipos_rede"],
          N6: [],
        },
      },
      tipos_cliente_fornecedor: {
        name: "Gerenciamento de tipo de cliente/fornecedor",
        permissions: {
          N1: ["consultar_tipos_fornecedor_cliente"],
          N2: [],
          N3: ["incluir_tipos_fornecedor_cliente"],
          N4: ["alterar_tipos_fornecedor_cliente"],
          N5: ["excluir_tipos_fornecedor_cliente"],
          N6: [],
        },
      },
      // Catálogo de módulos do sistema e vínculo membro × módulo.
      modulos: {
        name: "Gerenciamento de módulos",
        permissions: {
          N1: ["consultar_modulos"],
          N2: [],
          N3: ["incluir_membros_modulos"],
          N4: ["alterar_membros_modulos"],
          N5: ["excluir_membros_modulos"],
          N6: [],
        },
      },
      permissoes: {
        name: "Gerenciamento de permissões",
        permissions: {
          N1: ["consultar_permissoes"],
          N2: [],
          N3: ["incluir_permissoes"],
          N4: ["alterar_permissoes"],
          N5: ["excluir_permissoes"],
          N6: [],
        },
      },
    },
  },

  empresas: {
    name: "Gerenciamento de empresa",
    description: "Dados e configuração da empresa",
    permissions: {
      N1: ["consultar_empresas"],
      N2: [],
      N3: [],
      N4: ["alterar_empresas"],
      N5: [],
      N6: [],
    },
  },

  produtos: {
    name: "Gerenciamento de Produtos",
    description:
      "Cadastro de produtos, classificações, códigos fiscais/tributários, preços, setores e locações",
    permissions: {
      N1: ["consultar_produtos"],
      N2: [],
      N3: ["incluir_produtos"],
      N4: ["alterar_produtos"],
      N5: ["excluir_produtos"],
      N6: [],
    },
    children: {
      classificacoes: {
        name: "Gerenciamento de classificações",
        permissions: {
          N1: [
            "consultar_unidades_medida",
            "consultar_tipos_produto",
            "consultar_tipos_sped",
            "consultar_grupos_produto",
            "consultar_subgrupos_produto",
            "consultar_marcas_produto",
            "consultar_aplicacoes_produto",
          ],
          N2: [],
          N3: [
            "incluir_unidades_medida",
            "incluir_tipos_produto",
            "incluir_tipos_sped",
            "incluir_grupos_produto",
            "incluir_subgrupos_produto",
            "incluir_marcas_produto",
            "incluir_aplicacoes_produto",
          ],
          N4: [
            "alterar_unidades_medida",
            "alterar_tipos_produto",
            "alterar_tipos_sped",
            "alterar_grupos_produto",
            "alterar_subgrupos_produto",
            "alterar_marcas_produto",
            "alterar_aplicacoes_produto",
          ],
          N5: [
            "excluir_unidades_medida",
            "excluir_tipos_produto",
            "excluir_tipos_sped",
            "excluir_grupos_produto",
            "excluir_subgrupos_produto",
            "excluir_marcas_produto",
            "excluir_aplicacoes_produto",
          ],
          N6: [],
        },
      },
      fiscais_tributarios: {
        name: "Gerenciamento de códigos fiscais e tributários",
        permissions: {
          N1: [
            "consultar_ncm_produtos",
            "consultar_cest_produtos",
            "consultar_anp_produtos",
            "consultar_nbs_produtos",
            "consultar_situacao_pis_cofins",
            "consultar_tributacao_icms",
            "consultar_tributacao_produto",
          ],
          N2: [],
          N3: [
            "incluir_ncm_produtos",
            "incluir_cest_produtos",
            "incluir_anp_produtos",
            "incluir_nbs_produtos",
            "incluir_situacao_pis_cofins",
            "incluir_tributacao_icms",
            "incluir_tributacao_produto",
          ],
          N4: [
            "alterar_ncm_produtos",
            "alterar_cest_produtos",
            "alterar_anp_produtos",
            "alterar_nbs_produtos",
            "alterar_situacao_pis_cofins",
            "alterar_tributacao_icms",
            "alterar_tributacao_produto",
          ],
          N5: [
            "excluir_ncm_produtos",
            "excluir_cest_produtos",
            "excluir_anp_produtos",
            "excluir_nbs_produtos",
            "excluir_situacao_pis_cofins",
            "excluir_tributacao_icms",
            "excluir_tributacao_produto",
          ],
          N6: [],
        },
      },
      precos: {
        name: "Gerenciamento de preços",
        permissions: {
          N1: ["consultar_precos", "consultar_precos_promocionais"],
          N2: [],
          N3: ["incluir_precos", "incluir_precos_promocionais"],
          N4: ["alterar_precos", "alterar_precos_promocionais"],
          N5: ["excluir_precos", "excluir_precos_promocionais"],
          N6: [],
        },
      },
      setores: {
        name: "Gerenciamento de setores",
        permissions: {
          N1: ["consultar_setores"],
          N2: [],
          N3: ["incluir_setores"],
          N4: ["alterar_setores"],
          N5: ["excluir_setores"],
          N6: [],
        },
      },
      locacoes: {
        name: "Gerenciamento de locações",
        permissions: {
          N1: ["consultar_locacoes"],
          N2: [],
          N3: ["incluir_locacoes"],
          N4: ["alterar_locacoes"],
          N5: ["excluir_locacoes"],
          N6: [],
        },
      },
    },
  },

  enderecos: {
    name: "Gerenciamento de endereços",
    description: "Endereços geográficos e vínculo com empresas",
    permissions: {
      N1: ["consultar_enderecos"],
      N2: [],
      N3: ["incluir_enderecos"],
      N4: ["alterar_enderecos"],
      N5: ["excluir_enderecos"],
      N6: [],
    },
  },

  vendas: {
    name: "Gerenciamento de vendas",
    description:
      "Operações de venda, devoluções, tipos de pagamento, veículos e mecânicos",
    permissions: {
      N1: ["consultar_vendas"],
      N2: [],
      N3: ["incluir_vendas"],
      N4: ["alterar_vendas"],
      N5: [],
      N6: ["gerenciais_vendas"],
    },
    children: {
      devolucoes: {
        name: "Gerenciamento de devoluções",
        permissions: {
          N1: ["consultar_devolucoes_vendas"],
          N2: [],
          N3: ["incluir_devolucoes_vendas"],
          N4: [],
          N5: [],
          N6: [],
        },
      },
      tipos_pagamento: {
        name: "Gerenciamento de tipos de pagamentos",
        permissions: {
          N1: ["consultar_tipos_pagamento"],
          N2: [],
          N3: ["incluir_tipos_pagamento"],
          N4: ["alterar_tipos_pagamento"],
          N5: ["excluir_tipos_pagamento"],
          N6: [],
        },
      },
      veiculos: {
        name: "Gerenciamento de veículos e mecânicos",
        permissions: {
          N1: [
            "consultar_veiculos",
            "consultar_veiculos_membros",
            "consultar_comissoes_itens_venda",
          ],
          N2: [],
          N3: [
            "incluir_veiculos",
            "incluir_veiculos_membros",
            "incluir_comissoes_itens_venda",
          ],
          N4: [
            "alterar_veiculos",
            "alterar_veiculos_membros",
            "alterar_comissoes_itens_venda",
          ],
          N5: [
            "excluir_veiculos",
            "excluir_veiculos_membros",
            "excluir_comissoes_itens_venda",
          ],
          N6: [],
        },
      },
    },
  },

  estoque: {
    name: "Gerenciamento de estoque",
    description: "Lotes, saldos, mínimo/máximo e movimentos",
    permissions: {
      N1: ["consultar_saldos_estoque"],
      N2: [],
      N3: ["incluir_saldos_estoque"],
      N4: ["alterar_saldos_estoque"],
      N5: ["excluir_saldos_estoque"],
      N6: [],
    },
    children: {
      lotes: {
        name: "Gerenciamento de lotes",
        permissions: {
          N1: ["consultar_lotes_estoque"],
          N2: [],
          N3: ["incluir_lotes_estoque"],
          N4: ["alterar_lotes_estoque"],
          N5: ["excluir_lotes_estoque"],
          N6: [],
        },
      },
      saldos_lote: {
        name: "Gerenciamento de saldos de lote",
        permissions: {
          N1: ["consultar_saldos_lote_estoque"],
          N2: [],
          N3: ["incluir_saldos_lote_estoque"],
          N4: ["alterar_saldos_lote_estoque"],
          N5: ["excluir_saldos_lote_estoque"],
          N6: [],
        },
      },
      min_max: {
        name: "Gerenciamento de min/max",
        permissions: {
          N1: ["consultar_estoque_min_max"],
          N2: [],
          N3: ["incluir_estoque_min_max"],
          N4: ["alterar_estoque_min_max"],
          N5: ["excluir_estoque_min_max"],
          N6: [],
        },
      },
      movimentos: {
        name: "Gerenciamento de movimentos",
        permissions: {
          N1: ["consultar_movimentos_estoque"],
          N2: [],
          N3: ["incluir_movimentos_estoque"],
          N4: [],
          N5: [],
          N6: [],
        },
      },
    },
  },
} as const;

export type ModuleReference = keyof typeof defaultModules;

export const ADMIN_MODULE_REFERENCE = "administrador" satisfies ModuleReference;

/** Módulos de domínio (sem o agregador `administrador`). */
export const domainModuleReferences = [
  "usuarios",
  "membros",
  "empresas",
  "produtos",
  "enderecos",
  "vendas",
  "estoque",
] as const satisfies readonly ModuleReference[];

export const moduleReferenceCatalog = [
  ADMIN_MODULE_REFERENCE,
  ...domainModuleReferences,
] as const satisfies readonly ModuleReference[];

// ---------------------------------------------------------------------------
// Tipos derivados do catálogo de módulos
// ---------------------------------------------------------------------------

type LevelSlug<T> = T extends readonly (infer U)[] ? U : never;

type SlugsFromBuckets<P> =
  | LevelSlug<P extends { readonly N1: infer X } ? X : never>
  | LevelSlug<P extends { readonly N2: infer X } ? X : never>
  | LevelSlug<P extends { readonly N3: infer X } ? X : never>
  | LevelSlug<P extends { readonly N4: infer X } ? X : never>
  | LevelSlug<P extends { readonly N5: infer X } ? X : never>
  | LevelSlug<P extends { readonly N6: infer X } ? X : never>;

type SlugsFromChildren<C> =
  C extends Record<string, { readonly permissions: infer P }>
    ? SlugsFromBuckets<P>
    : never;

type SlugsFromModule<M> =
  | SlugsFromBuckets<M extends { readonly permissions: infer P } ? P : never>
  | SlugsFromChildren<M extends { readonly children: infer C } ? C : never>;

export type PermissionSlug = {
  [K in ModuleReference]: SlugsFromModule<(typeof defaultModules)[K]>;
}[ModuleReference];

type AnyLevelBuckets = {
  readonly N1: readonly PermissionSlug[];
  readonly N2: readonly PermissionSlug[];
  readonly N3: readonly PermissionSlug[];
  readonly N4: readonly PermissionSlug[];
  readonly N5: readonly PermissionSlug[];
  readonly N6: readonly PermissionSlug[];
};

type AnyChildModule = {
  readonly name: string;
  readonly permissions: AnyLevelBuckets;
};

type AnyParentModule = {
  readonly name: string;
  readonly description?: string;
  readonly permissions: AnyLevelBuckets;
  readonly children?: Readonly<Record<string, AnyChildModule>>;
};

const LEVEL_LOAD_ORDER: readonly Exclude<AccessLevel, "N0">[] = [
  "N1",
  "N2",
  "N3",
  "N4",
  "N5",
  "N6",
];

const mergeLevelBuckets = (
  ...groups: readonly AnyLevelBuckets[]
): AnyLevelBuckets => ({
  N1: groups.flatMap((g) => g.N1),
  N2: groups.flatMap((g) => g.N2),
  N3: groups.flatMap((g) => g.N3),
  N4: groups.flatMap((g) => g.N4),
  N5: groups.flatMap((g) => g.N5),
  N6: groups.flatMap((g) => g.N6),
});

const moduleAsAny = (ref: ModuleReference): AnyParentModule =>
  defaultModules[ref] as AnyParentModule;

/** Pai + filhos, buckets exclusivos (sem acumular níveis). */
export const getExclusivePermissionsByLevel = (
  ref: ModuleReference,
): AnyLevelBuckets => {
  if (ref === ADMIN_MODULE_REFERENCE) {
    return mergeLevelBuckets(
      ...domainModuleReferences.map((domainRef) =>
        getExclusivePermissionsByLevel(domainRef),
      ),
    );
  }

  const mod = moduleAsAny(ref);
  const childBuckets = Object.values(mod.children ?? {}).map(
    (child) => child.permissions,
  );
  return mergeLevelBuckets(mod.permissions, ...childBuckets);
};

/**
 * Permissões efetivas do módulo para o nível informado.
 * N0 → []. Nx → união de N1..Nx do pai e de todos os filhos.
 */
export const getPermissionsForAccessLevel = (
  ref: ModuleReference,
  level: AccessLevel,
): readonly PermissionSlug[] => {
  if (level === "N0") {
    return [];
  }

  const buckets = getExclusivePermissionsByLevel(ref);
  const granted: PermissionSlug[] = [];

  for (const current of LEVEL_LOAD_ORDER) {
    granted.push(...buckets[current]);
    if (current === level) {
      break;
    }
  }

  return granted;
};

/** Todas as permissões do módulo (equivalente a N6). */
export const getPermissionsForModule = (
  ref: ModuleReference,
): readonly PermissionSlug[] => getPermissionsForAccessLevel(ref, "N6");

export const isModuleReference = (v: string): v is ModuleReference =>
  Object.prototype.hasOwnProperty.call(defaultModules, v);

export const isAccessLevel = (v: string): v is AccessLevel =>
  (ACCESS_LEVELS as readonly string[]).includes(v);

export const accessLevelRank = (level: AccessLevel): number =>
  ACCESS_LEVELS.indexOf(level);

export const getExclusiveSlugsForLevel = (
  ref: ModuleReference,
  level: AccessLevel,
): readonly PermissionSlug[] => {
  if (level === "N0") {
    return [];
  }
  return getExclusivePermissionsByLevel(ref)[level];
};

export const slugsAddedOnLevelChange = (
  ref: ModuleReference,
  from: AccessLevel,
  to: AccessLevel,
): readonly PermissionSlug[] => {
  const fromRank = accessLevelRank(from);
  const toRank = accessLevelRank(to);
  if (toRank <= fromRank) {
    return [];
  }
  const buckets = getExclusivePermissionsByLevel(ref);
  const added: PermissionSlug[] = [];
  for (const level of LEVEL_LOAD_ORDER) {
    const rank = accessLevelRank(level);
    if (rank > fromRank && rank <= toRank) {
      added.push(...buckets[level]);
    }
  }
  return added;
};

export const slugsRemovedOnLevelChange = (
  ref: ModuleReference,
  from: AccessLevel,
  to: AccessLevel,
): readonly PermissionSlug[] => {
  const fromRank = accessLevelRank(from);
  const toRank = accessLevelRank(to);
  if (toRank >= fromRank) {
    return [];
  }
  const buckets = getExclusivePermissionsByLevel(ref);
  const removed: PermissionSlug[] = [];
  for (const level of LEVEL_LOAD_ORDER) {
    const rank = accessLevelRank(level);
    if (rank > toRank && rank <= fromRank) {
      removed.push(...buckets[level]);
    }
  }
  return removed;
};

export const listModules = (): readonly {
  reference: ModuleReference;
  name: string;
  description?: string;
}[] =>
  moduleReferenceCatalog.map((reference) => {
    const mod = defaultModules[reference];
    return {
      reference,
      name: mod.name,
      description: "description" in mod ? mod.description : undefined,
    };
  });

const slugsFromBuckets = (buckets: AnyLevelBuckets): PermissionSlug[] => [
  ...buckets.N1,
  ...buckets.N2,
  ...buckets.N3,
  ...buckets.N4,
  ...buckets.N5,
  ...buckets.N6,
];

export const permissionCatalog = domainModuleReferences.flatMap((ref) =>
  slugsFromBuckets(getExclusivePermissionsByLevel(ref)),
) as readonly PermissionSlug[];

/** Referências tipadas aos slugs (middlewares, serviços) — evita literais soltos. */
export const PERM = {
  consultar_usuarios: "consultar_usuarios",
  incluir_usuarios: "incluir_usuarios",
  alterar_usuarios: "alterar_usuarios",
  consultar_membros: "consultar_membros",
  incluir_membros: "incluir_membros",
  consultar_modulos: "consultar_modulos",
  incluir_membros_modulos: "incluir_membros_modulos",
  alterar_membros_modulos: "alterar_membros_modulos",
  excluir_membros_modulos: "excluir_membros_modulos",
  alterar_permissoes: "alterar_permissoes",
  incluir_vendas: "incluir_vendas",
  alterar_vendas: "alterar_vendas",
  gerenciais_vendas: "gerenciais_vendas",
} as const satisfies Record<string, PermissionSlug>;

export const isPermissionSlug = (v: string): v is PermissionSlug =>
  (permissionCatalog as readonly string[]).includes(v);
