export type Severity = "B" | "W";

export type RuleText = {
  severity: Severity;
  problem: string;
  why: string;
  alternative: string;
};

const INDEX_GRANDE =
  "Em tabela grande, crie o índice com CONCURRENTLY manualmente no ambiente antes do deploy e deixe na migration CREATE INDEX IF NOT EXISTS (vira no-op dentro da transação do Drizzle).";

export const RULES: Record<string, RuleText> = {
  "INT-01": {
    severity: "B",
    problem: "Arquivo de migration já presente na base foi modificado, renomeado ou removido.",
    why: "Uma migration já aplicada não pode mudar: o banco guarda o hash e o created_at, e editar o arquivo diverge do que rodou em produção.",
    alternative: "Descarte a alteração, atualize com a main e gere uma migration nova.",
  },
  "INT-02": {
    severity: "B",
    problem: "Migration nova com timestamp (when) fora de ordem.",
    why: "O migrator do Drizzle só compara o created_at da última migration aplicada e ignora em silêncio qualquer entrada com when menor ou igual.",
    alternative:
      "Descarte a migration local, atualize com a main, rode db:migrate e gere de novo com db:generate.",
  },
  "INT-03": {
    severity: "B",
    problem: "Journal, SQL ou snapshot da cadeia de migrations está inconsistente.",
    why: "Buraco de idx, tag repetida, arquivo órfão ou marcador de conflito faz o migrator ler a cadeia errada ou falhar no deploy.",
    alternative: "Regenere a migration com db:generate e não edite o journal à mão.",
  },
  "INT-04": {
    severity: "W",
    problem: "O PR adiciona mais de uma migration.",
    why: "O Drizzle aplica todas as pendentes na mesma transação. Se a segunda falhar, a primeira também volta atrás, e o tempo de lock soma.",
    alternative: "Prefira uma migration por PR, salvo quando os passos precisam mesmo ser atômicos.",
  },
  "DL-01": {
    severity: "B",
    problem: "A migration parece um rename que o Drizzle reescreveu como drop + create.",
    why: "DROP COLUMN seguido de ADD COLUMN, ou DROP TABLE seguido de CREATE TABLE com colunas parecidas, apaga os dados existentes.",
    alternative: "Use RENAME COLUMN ou RENAME TABLE. Se o Drizzle gerou drop+add, reescreva o SQL à mão e marque a exceção.",
  },
  "DL-02": {
    severity: "B",
    problem: "DELETE ou UPDATE sem WHERE.",
    why: "Atualiza ou apaga todas as linhas da tabela. Não há como desfazer depois do commit da migration.",
    alternative: "Restrinja com WHERE. Confira a semântica do backfill e o volume antes de aprovar.",
  },
  "DL-03": {
    severity: "B",
    problem: "TRUNCATE.",
    why: "Esvazia a tabela por inteiro e, com CASCADE, ainda alcança tabelas que referenciam esta.",
    alternative: "Não use TRUNCATE em migration de produção. Se for limpeza consciente, aprove com motivo.",
  },
  "DL-04": {
    severity: "B",
    problem: "DROP de schema, tipo, constraint ou database.",
    why: "Remove estrutura que o código em produção ainda pode estar usando. DROP TYPE quebra colunas; DROP CONSTRAINT afrouxa integridade.",
    alternative: "Separe a remoção num segundo deploy, depois que o código novo já estiver no ar e não depender do objeto.",
  },
  "DL-05": {
    severity: "B",
    problem: "ALTER COLUMN ... TYPE reescreve a tabela.",
    why: "Trocar o tipo toma ACCESS EXCLUSIVE e reescreve todas as linhas. USING ainda executa uma expressão em cada linha.",
    alternative: "Adicione uma coluna nova, faça backfill e só depois remova a antiga, em deploys separados.",
  },
  "LK-01": {
    severity: "B",
    problem: "SET NOT NULL em tabela que já existe.",
    why: "O Postgres varre a tabela inteira e segura ACCESS EXCLUSIVE até o fim. Em tabela grande isso para a API.",
    alternative:
      "Crie CHECK (coluna IS NOT NULL) NOT VALID, depois VALIDATE CONSTRAINT, e só então SET NOT NULL.",
  },
  "LK-02": {
    severity: "B",
    problem: "ADD COLUMN ... GENERATED ... STORED.",
    why: "Coluna gerada armazenada reescreve a tabela e segura lock exclusivo.",
    alternative: "Calcule o valor na aplicação ou numa coluna comum preenchida aos poucos.",
  },
  "LK-03": {
    severity: "B",
    problem: "ADD PRIMARY KEY ou ADD UNIQUE sem USING INDEX.",
    why: "O Postgres constrói o índice dentro do lock exclusivo da tabela. Em tabela grande a escrita fica bloqueada.",
    alternative: "Crie o índice antes (fora desta transação, se a tabela for grande) e adicione a constraint com USING INDEX.",
  },
  "LK-04": {
    severity: "B",
    problem: "Operação que reescreve a tabela ou toma lock exclusivo.",
    why: "SET LOGGED/UNLOGGED, SET TABLESPACE, CLUSTER, VACUUM FULL, REINDEX sem CONCURRENTLY e LOCK TABLE bloqueiam leitura e escrita.",
    alternative: "Não coloque essas operações numa migration da API. Agende uma janela se forem inevitáveis.",
  },
  "LK-05": {
    severity: "W",
    problem: "A mesma migration faz operação pesada em mais de uma tabela que já existe.",
    why: "Os locks se somam dentro da mesma transação do Drizzle. Uma tabela lenta segura todas as outras.",
    alternative: "Separe uma tabela por migration.",
  },
  "EN-01": {
    severity: "B",
    problem: "ALTER TYPE ... ADD VALUE e o valor novo é usado no mesmo arquivo.",
    why: "O valor novo de um enum não pode ser usado na mesma transação em que foi adicionado. A migration falha no commit.",
    alternative: "Deixe o ADD VALUE sozinho nesta migration e use o valor só numa migration seguinte.",
  },
  "EN-02": {
    severity: "B",
    problem: "Rename de valor ou de tipo enum, ou recriação do tipo.",
    why: "RENAME VALUE / RENAME TO quebra o código que ainda grava o valor antigo. DROP TYPE + CREATE TYPE apaga o tipo em uso.",
    alternative: "Adicione o valor novo, migre os dados e o código, e só depois retire o valor antigo.",
  },
  "SC-01": {
    severity: "B",
    problem: "A migration altera papéis ou privilégios.",
    why: "GRANT, REVOKE, ROLE, USER e ALTER DEFAULT PRIVILEGES mudam quem acessa o banco, fora do contrato do schema da API.",
    alternative: "Faça essa mudança no provisionamento do banco, não numa migration do Drizzle.",
  },
  "SC-02": {
    severity: "B",
    problem: "A migration altera extensão, configuração global, trigger de sessão, RLS ou policy.",
    why: "Extension, ALTER SYSTEM, session_replication_role, TRIGGER enable/disable, RLS e POLICY mudam o comportamento do banco inteiro.",
    alternative: "Aplique isso no provisionamento ou numa janela operacional, com revisão explícita.",
  },
  "SC-03": {
    severity: "B",
    problem: "A migration cria ou remove trigger, função, procedure ou rule.",
    why: "Código dentro do banco passa a rodar em toda escrita, sem passar pelo lint da API, e é difícil de reverter.",
    alternative: "Mantenha a regra na aplicação. Se a função for indispensável, aprove com o motivo e o dono do schema.",
  },
  "SC-04": {
    severity: "B",
    problem: "Comando dinâmico, COPY, meta-comando do psql ou SQL que o parser não entende.",
    why: "DO, EXECUTE e COPY fogem da revisão. Um statement que o parser rejeita pode ser destrutivo e passar sem as outras regras.",
    alternative: "Reescreva em SQL estático que o parser reconheça. Não use comandos \\ do psql.",
  },
  "SC-05": {
    severity: "B",
    problem: "A migration controla transação, timeout ou papel da sessão.",
    why: "BEGIN, COMMIT, ROLLBACK e SET de lock_timeout, statement_timeout, role ou search_path brigam com o que scripts/migrate.ts já configura.",
    alternative: "Tire esses comandos do arquivo. O timeout sai de MIGRATION_STATEMENT_TIMEOUT no deploy.",
  },
  "SC-06": {
    severity: "B",
    problem: "Migration vazia ou escrita à mão sem mudança de schema.",
    why: "Snapshot igual ao anterior (ignorando id e prevId), ou arquivo sem statements, indica SQL customizado que o db:check não acompanha.",
    alternative: "Gere a migration com db:generate. Se o SQL manual for intencional, aprove e explique o que ele faz.",
  },
  "AP-01": {
    severity: "B",
    problem: "RULE-ID desconhecido em -- lint-approved.",
    why: "Uma aprovação com id inexistente não cobre achado nenhum e pode parecer que a exceção foi aceita.",
    alternative: "Use o id exato do achado, como DL-01 ou ban-drop-column.",
  },
  "AP-02": {
    severity: "B",
    problem: "Motivo de -- lint-approved curto demais.",
    why: "Sem um motivo legível, o Code Owner não consegue revisar a exceção no PR.",
    alternative: "Escreva pelo menos 15 caracteres explicando por que a exceção é segura.",
  },
  "adding-required-field": {
    severity: "B",
    problem: "ADD COLUMN NOT NULL sem default.",
    why: "Em tabela com linhas, o Postgres recusa o comando ou reescreve a tabela sob lock exclusivo. O código antigo não preenche a coluna.",
    alternative: "Adicione a coluna nullable (ou com DEFAULT constante), faça o backfill e só depois imponha NOT NULL.",
  },
  "adding-field-with-default": {
    severity: "B",
    problem: "ADD COLUMN com DEFAULT volátil ou coluna GENERATED armazenada.",
    why: "No Postgres 16, default constante não reescreve a tabela. Default volátil e GENERATED STORED reescrevem e seguram lock exclusivo.",
    alternative: "Use um default constante, ou adicione a coluna nullable e preencha depois.",
  },
  "adding-serial-primary-key-field": {
    severity: "B",
    problem: "ADD COLUMN serial como chave primária.",
    why: "Cria sequência e índice varrendo a tabela sob lock exclusivo.",
    alternative: "Use identidade numa coluna nova de uma tabela nova, ou crie o índice antes e anexe com USING INDEX.",
  },
  "changing-column-type": {
    severity: "B",
    problem: "Mudança de tipo de coluna.",
    why: "Reescreve a tabela. O código em produção pode ainda gravar o tipo antigo.",
    alternative: "Crie outra coluna, copie os dados e remova a antiga num deploy posterior.",
  },
  "renaming-column": {
    severity: "B",
    problem: "RENAME COLUMN.",
    why: "O código que está no ar continua usando o nome antigo e quebra na hora da migration.",
    alternative: "Adicione a coluna nova, migre o código e só então remova a antiga.",
  },
  "renaming-table": {
    severity: "B",
    problem: "RENAME TABLE.",
    why: "O código em produção ainda aponta para o nome antigo.",
    alternative: "Crie a tabela nova, copie os dados e troque o código antes de remover a antiga.",
  },
  "ban-drop-column": {
    severity: "B",
    problem: "DROP COLUMN.",
    why: "Apaga dados e quebra o código que ainda lê a coluna.",
    alternative: "Pare de usar a coluna num deploy e só a remova no seguinte.",
  },
  "ban-drop-table": {
    severity: "B",
    problem: "DROP TABLE.",
    why: "Apaga a tabela inteira. O código em produção pode ainda consultá-la.",
    alternative: "Remova o uso no código, faça o deploy e só então drop a tabela.",
  },
  "ban-drop-not-null": {
    severity: "B",
    problem: "DROP NOT NULL.",
    why: "Passa a aceitar nulo. O código antigo pode não tratar nulo e gravar dado inválido.",
    alternative: "Atualize o código para aceitar nulo antes de afrouxar a coluna.",
  },
  "ban-drop-database": {
    severity: "B",
    problem: "DROP DATABASE.",
    why: "Destrói o banco inteiro.",
    alternative: "Não coloque DROP DATABASE numa migration.",
  },
  "ban-truncate-cascade": {
    severity: "B",
    problem: "TRUNCATE ... CASCADE.",
    why: "Além de esvaziar a tabela, o CASCADE esvazia as tabelas que dependem dela.",
    alternative: "Não use TRUNCATE em produção.",
  },
  "ban-concurrent-index-creation-in-transaction": {
    severity: "B",
    problem: "CREATE INDEX CONCURRENTLY dentro da transação do Drizzle.",
    why: "O Postgres recusa CONCURRENTLY dentro de um bloco de transação, e o Drizzle envolve todas as migrations numa transação só. O deploy falha.",
    alternative: INDEX_GRANDE,
  },
  "adding-foreign-key-constraint": {
    severity: "B",
    problem: "ADD FOREIGN KEY valida a tabela inteira na hora.",
    why: "A validação toma SHARE ROW EXCLUSIVE e bloqueia escrita enquanto varre as linhas.",
    alternative: "Adicione a FK com NOT VALID e rode VALIDATE CONSTRAINT numa migration seguinte.",
  },
  "constraint-missing-not-valid": {
    severity: "B",
    problem: "Constraint nova sem NOT VALID.",
    why: "A validação imediata varre a tabela e bloqueia escrita.",
    alternative: "Crie com NOT VALID e valide depois, fora do pico.",
  },
  "disallowed-unique-constraint": {
    severity: "B",
    problem: "UNIQUE ou PRIMARY KEY construído junto com a constraint.",
    why: "Constrói o índice sob lock exclusivo.",
    alternative: "Crie o índice único antes e anexe a constraint com USING INDEX.",
  },
  "require-concurrent-index-creation": {
    severity: "W",
    problem: "CREATE INDEX sem CONCURRENTLY.",
    why: "Em tabela grande o índice bloqueia escrita até terminar. CONCURRENTLY não funciona na transação do Drizzle, então o aviso fica para você decidir.",
    alternative: INDEX_GRANDE,
  },
  "require-concurrent-index-deletion": {
    severity: "W",
    problem: "DROP INDEX sem CONCURRENTLY.",
    why: "DROP INDEX comum toma ACCESS EXCLUSIVE. DROP INDEX CONCURRENTLY também não roda dentro da transação do Drizzle.",
    alternative:
      "Em tabela grande, remova o índice com CONCURRENTLY manualmente antes do deploy e deixe DROP INDEX IF EXISTS na migration.",
  },
  "ban-char-field": {
    severity: "W",
    problem: "Coluna character/char.",
    why: "char preenche com espaços e costuma surpreender comparação e índice.",
    alternative: "Use text ou varchar.",
  },
  "prefer-timestamp-tz": {
    severity: "W",
    problem: "timestamp sem fuso.",
    why: "timestamp without time zone guarda a hora sem o fuso e muda de significado entre sessões.",
    alternative: "Use timestamptz.",
  },
  "prefer-bigint-over-int": {
    severity: "W",
    problem: "integer onde bigint costuma ser mais seguro.",
    why: "integer estoura em torno de 2 bilhões. Sequências de pedido e movimento passam disso.",
    alternative: "Use bigint nas chaves e contadores que crescem sem teto claro.",
  },
  "prefer-identity": {
    severity: "W",
    problem: "serial em vez de identidade.",
    why: "serial é o mecanismo antigo. A identidade é o que o Postgres recomenda hoje.",
    alternative: "Use GENERATED BY DEFAULT AS IDENTITY.",
  },
};

export const SQUAWK_BLOCKING = [
  "adding-required-field",
  "adding-field-with-default",
  "adding-serial-primary-key-field",
  "changing-column-type",
  "renaming-column",
  "renaming-table",
  "ban-drop-column",
  "ban-drop-table",
  "ban-drop-not-null",
  "ban-drop-database",
  "ban-truncate-cascade",
  "ban-concurrent-index-creation-in-transaction",
  "adding-foreign-key-constraint",
  "constraint-missing-not-valid",
  "disallowed-unique-constraint",
] as const;

export const SQUAWK_WARNING = [
  "require-concurrent-index-creation",
  "require-concurrent-index-deletion",
  "ban-char-field",
  "prefer-timestamp-tz",
  "prefer-bigint-over-int",
  "prefer-identity",
] as const;

export const SQUAWK_EXEMPT_ON_NEW_TABLE = new Set<string>([
  "require-concurrent-index-creation",
  "adding-foreign-key-constraint",
  "constraint-missing-not-valid",
  "disallowed-unique-constraint",
  "adding-field-with-default",
]);

/**
 * Nomes pedidos que o reporter da Squawk 2.70 não emite.
 * O equivalente aparece com outro id e está no catálogo.
 */
export const SQUAWK_RULES_NOT_EMITTED = [
  {
    requested: "adding-not-nullable-field",
    emittedAs: "adding-required-field",
  },
  {
    requested: "prefer-timestamptz",
    emittedAs: "prefer-timestamp-tz",
  },
] as const;

const EXTRA_KNOWN_SQUAWK = [
  "prefer-robust-stmts",
  "require-lock-timeout",
  "require-statement-timeout",
  "transaction-nesting",
  "prefer-text-field",
];

export const KNOWN_RULE_IDS = new Set<string>([
  ...Object.keys(RULES),
  ...EXTRA_KNOWN_SQUAWK,
]);

export function approvalExample(ruleId: string): string {
  return `-- lint-approved: ${ruleId} <motivo com pelo menos 15 caracteres>`;
}
