CREATE TABLE IF NOT EXISTS "presumed_credit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"c_cred_pres" varchar(2) NOT NULL,
	"description" text NOT NULL,
	"lc_redacao" text,
	"ind_nfe" varchar(1) NOT NULL,
	"ind_evento" varchar(1) NOT NULL,
	"ind_deduz_cred_pres" varchar(1) NOT NULL,
	"ind_g_cbs_cred_pres" varchar(1) NOT NULL,
	"ind_g_ibs_cred_pres" varchar(1) NOT NULL,
	"cbs_rate_type" varchar(100),
	"ibs_rate_type" varchar(100),
	"p_aliq_cred_pres_cbs" text,
	"p_aliq_cred_pres_ibs" text,
	"p_cred_pres_cbs" numeric(15, 10),
	"p_cred_pres_ibs" numeric(15, 10),
	"p_red_transicao_ibs" text,
	"c_class_ref" varchar(100),
	"d_ini_vig_cbs" date,
	"d_fim_vig_cbs" date,
	"d_ini_vig_ibs" date,
	"d_fim_vig_ibs" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "presumed_credit_cred_pres_chk" CHECK ("presumed_credit"."c_cred_pres" ~ '^[0-9]{2}$'),
	CONSTRAINT "presumed_credit_ind_nfe_chk" CHECK ("presumed_credit"."ind_nfe" in ('0', '1')),
	CONSTRAINT "presumed_credit_ind_evento_chk" CHECK ("presumed_credit"."ind_evento" in ('0', '1')),
	CONSTRAINT "presumed_credit_ind_deduz_chk" CHECK ("presumed_credit"."ind_deduz_cred_pres" in ('0', '1')),
	CONSTRAINT "presumed_credit_ind_g_cbs_chk" CHECK ("presumed_credit"."ind_g_cbs_cred_pres" in ('0', '1')),
	CONSTRAINT "presumed_credit_ind_g_ibs_chk" CHECK ("presumed_credit"."ind_g_ibs_cred_pres" in ('0', '1')),
	CONSTRAINT "presumed_credit_p_cred_pres_cbs_range" CHECK ("presumed_credit"."p_cred_pres_cbs" is null or ("presumed_credit"."p_cred_pres_cbs" >= 0 and "presumed_credit"."p_cred_pres_cbs" <= 100)),
	CONSTRAINT "presumed_credit_p_cred_pres_ibs_range" CHECK ("presumed_credit"."p_cred_pres_ibs" is null or ("presumed_credit"."p_cred_pres_ibs" >= 0 and "presumed_credit"."p_cred_pres_ibs" <= 100))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "presumed_credit_cred_pres_unique" ON "presumed_credit" USING btree ("c_cred_pres");
--> statement-breakpoint
ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'PRESUMED_CREDIT';
--> statement-breakpoint
INSERT INTO "presumed_credit" ("c_cred_pres", "description", "lc_redacao", "ind_nfe", "ind_evento", "ind_deduz_cred_pres", "ind_g_cbs_cred_pres", "ind_g_ibs_cred_pres", "cbs_rate_type", "ibs_rate_type", "p_aliq_cred_pres_cbs", "p_aliq_cred_pres_ibs", "p_cred_pres_cbs", "p_cred_pres_ibs", "p_red_transicao_ibs", "c_class_ref", "d_ini_vig_cbs", "d_fim_vig_cbs", "d_ini_vig_ibs", "d_fim_vig_ibs") VALUES
('01', 'Crédito presumido da aquisição de bens e serviços de produtor rural e produtor rural integrado não contribuinte, observado o art. 168 da Lei Complementar nº 214, de 2025.', 'Art. 168. O contribuinte de IBS e de CBS sujeito ao regime regular poderá apropriar créditos presumidos dos referidos tributos relativos às aquisições de bens e serviços de produtor rural ou de produtor rural integrado, não contribuintes, de que trata o art. 164 desta Lei Complementar.', '1', '1', '0', '1', '1', 'Alíquota calculada e divulgada anualmente', 'Alíquota calculada e divulgada anualmente', 'pAliqCalculadaCBS', 'pAliqCalculadaIBS', NULL, NULL, NULL, '410014', '2027-01-01', NULL, '2027-01-01', NULL),
('02', 'Crédito presumido da aquisição de serviço de transportador autônomo de carga pessoa física não contribuinte, observado o art. 169 da Lei Complementar nº 214, de 2025.', 'Art. 169. O contribuinte de IBS e de CBS sujeito ao regime regular poderá apropriar créditos presumidos dos referidos tributos relativos às aquisições de serviço de transporte de carga de transportador autônomo pessoa física que não seja contribuinte dos referidos tributos ou que seja inscrito como MEI.', '0', '1', '0', '1', '1', 'Alíquota calculada e divulgada anualmente', 'Alíquota calculada e divulgada anualmente', 'pAliqCalculadaCBS', 'pAliqCalculadaIBS', NULL, NULL, NULL, '410015', '2027-01-01', NULL, '2027-01-01', NULL),
('03', 'Crédito presumido da aquisição de resíduos e demais materiais destinados à reciclagem, reutilização ou logística reversa adquiridos de pessoa física, cooperativa ou outra forma de organização popular, observado o art. 170 da Lei Complementar nº 214, de 2025.', 'Art. 170. O contribuinte de IBS e de CBS sujeito ao regime regular poderá apropriar créditos presumidos dos referidos tributos relativos às aquisições de resíduos sólidos de coletores incentivados para utilização em processo de destinação final ambientalmente adequada.', '1', '1', '0', '1', '1', 'Alíquota fixa', 'Alíquota fixa', '7%', 'a) em 2029, 1,3% (um inteiro e três décimos por cento);
b) em 2030, 2,6% (dois inteiros e seis décimos por cento);
c) em 2031, 3,9% (três inteiros e nove décimos por cento);
d) em 2032, 5,2% (cinco inteiros e dois décimos por cento);
e) a partir de 2033, 13% (treze por cento);', 7, NULL, NULL, '410016', '2027-01-01', NULL, '2029-01-01', NULL),
('04', 'Crédito presumido da aquisição de bens móveis usados de pessoa física não contribuinte para revenda, observado o art. 171 da Lei Complementar nº 214, de 2025.', 'Art. 171. O contribuinte de IBS e de CBS sujeito ao regime regular poderá apropriar créditos presumidos dos referidos tributos relativos às aquisições, para revenda, de bem móvel usado de pessoa física que não seja contribuinte dos referidos tributos ou que seja inscrita como MEI.', '1', '0', '1', '1', '1', 'Alíquota efetiva', 'Alíquota efetiva', 'pAliqEfet', 'pAliqEfet', NULL, NULL, NULL, '410017', '2027-01-01', NULL, '2027-01-01', NULL),
('05', 'Crédito presumido no regime automotivo, observado o art. 311 da Lei Complementar nº 214, de 2025.', 'Art. 311. Em relação aos projetos habilitados à fruição dos benefícios estabelecidos pelo art. 11-C da Lei nº 9.440, de 14 de março de 1997, o crédito presumido de que trata o art. 309 desta Lei Complementar será calculado mediante a aplicação dos seguintes percentuais sobre o valor das vendas no mercado interno, em cada mês, dos produtos constantes nos projetos de que trata o art. 309, fabricados ou montados nos estabelecimentos incentivados:
I - 11,60% (onze inteiros e sessenta centésimos por cento) até o 12º (décimo segundo) mês de fruição do benefício;
II - 10% (dez inteiros por cento) do 13º (décimo terceiro) ao 48º (quadragésimo oitavo) mês de fruição do benefício;
III - 8,70% (oito inteiros e setenta centésimos por cento) do 49º (quadragésimo nono) ao 60º (sexagésimo) mês de fruição do benefício.', '1', '0', '0', '1', '0', 'Alíquota fixa', NULL, NULL, NULL, NULL, NULL, NULL, 'Com incidência de CBS', '2027-01-01', NULL, NULL, NULL),
('06', 'Crédito presumido no regime automotivo, observado o art. 312 da Lei Complementar nº 214, de 2025.', 'Art. 312. Em relação aos projetos habilitados à fruição dos benefícios estabelecidos pelos arts. 1º a 4º da Lei nº 9.826, de 23 de agosto de 1999, o crédito presumido de que trata o art. 309 desta Lei Complementar corresponderá ao produto da multiplicação dos seguintes fatores:
I - valor das vendas no mercado interno, em cada mês, dos produtos constantes nos projetos de que trata o art. 309 desta Lei Complementar, fabricados ou montados nos estabelecimentos incentivados;
II - alíquotas do Imposto sobre Produtos Industrializados - IPI vigentes em 31 de dezembro de 2025, conforme a Tabela de Incidência do Imposto sobre Produtos Industrializados - Tipi, inclusive Notas Complementares, referentes aos produtos classificados nas posições 8702 a 8704;
III - fator de eficiência, que será o resultado do cálculo de 1 (um inteiro) diminuído da alíquota referida no inciso II, para cada posição na Tipi; e
IV - fator multiplicador, que será de:
a) 32,00% (trinta e dois por cento) nos anos de 2027 e 2028;
b) 25,60% (vinte e cinco inteiros e sessenta centésimos por cento) no ano de 2029;
c) 19,20% (dezenove inteiros e vinte centésimos por cento) no ano de 2030;
d) 12,80% (doze inteiros e oitenta centésimos por cento) no ano de 2031; e
e) 6,40 % (seis inteiros e quarenta centésimos por cento) no ano de 2032.', '1', '0', '0', '1', '0', 'Alíquota fixa', NULL, NULL, NULL, NULL, NULL, NULL, 'Com incidência de CBS', '2027-01-01', NULL, NULL, NULL),
('07', 'Crédito presumido na aquisição por contribuinte na Zona Franca de Manaus, observado o art. 444 da Lei Complementar nº 214, de 2025.', 'Art. 444. Fica concedido ao contribuinte habilitado na forma do art. 442 e sujeito ao regime regular ou ao Simples Nacional crédito presumido de IBS relativo à importação de bem material para revenda presencial na Zona Franca de Manaus.', '1', '0', '1', '0', '1', NULL, 'Alíquota efetiva com redução', NULL, 'pAliqEfet * 50%', NULL, NULL, NULL, 'Com incidência de IBS', NULL, NULL, '2027-01-01', NULL),
('08', 'Crédito presumido na aquisição por contribuinte na Zona Franca de Manaus, observado o art. 447 da Lei Complementar nº 214, de 2025.', 'Art. 447. Fica concedido ao contribuinte sujeito ao regime regular do IBS e habilitado nos termos do art. 442 desta Lei Complementar crédito presumido de IBS relativo à aquisição de bem material industrializado de origem nacional contemplado pela redução a zero da alíquota do IBS nos termos do art. 445 desta Lei Complementar.', '0', '1', '0', '0', '1', NULL, 'Alíquota fixa', NULL, 'I - 7,5% (sete inteiros e cinco décimos por cento), no caso de bens provenientes das regiões Sul e Sudeste, exceto do Estado do Espírito Santo; e 

II - 13,5% (treze inteiros e cinco décimos por cento), no caso de bens provenientes das regiões Norte, Nordeste e Centro-Oeste e do Estado do Espírito Santo.', NULL, NULL, 'Redução:
I - 9/10 (nove décimos), em 2029;
II - 8/10 (oito décimos), em 2030;
III - 7/10 (sete décimos), em 2031; e
IV - 6/10 (seis décimos), em 2032.', 'cClass de alíquota zero', NULL, NULL, '2029-01-01', NULL),
('09', 'Crédito presumido na aquisição por contribuinte na Zona Franca de Manaus, observado o art. 449 da Lei Complementar nº 214, de 2025.', 'Art. 449. Fica concedido à indústria incentivada na Zona Franca de Manaus, sujeita ao regime regular do IBS e da CBS, crédito presumido de IBS relativo à aquisição de bem intermediário produzido na referida área, desde que o bem esteja contemplado pela redução a zero de alíquota estabelecida pelo art. 448 desta Lei Complementar e seja utilizado para incorporação ou consumo na produção de bens finais.', '0', '1', '0', '0', '1', NULL, 'Alíquota fixa', NULL, '7,5%', NULL, 7.5, 'Redução:
I - 9/10 (nove décimos), em 2029;
II - 8/10 (oito décimos), em 2030;
III - 7/10 (sete décimos), em 2031; e
IV - 6/10 (seis décimos), em 2032.', 'cClass de alíquota zero', NULL, NULL, '2029-01-01', NULL),
('10', 'Crédito presumido na aquisição por contribuinte na Zona Franca de Manaus, observado o art. 450 da Lei Complementar nº 214, de 2025.', 'Art. 450. Ficam concedidos à indústria incentivada na Zona Franca de Manaus créditos presumidos de IBS e de CBS relativos à operação que destine ao território nacional, inclusive para a própria Zona Franca de Manaus, bem material produzido pela própria indústria incentivada na referida área nos termos do projeto econômico aprovado, exceto em relação às operações previstas no art. 447 desta Lei Complementar.', '1', '0', '0', '1', '0', 'Alíquota fixa', NULL, 'I - 6% (seis por cento) na venda de produtos, nos termos do art. 454 desta Lei Complementar; ou 

II - 2% (dois por cento) nos demais casos.', NULL, NULL, NULL, NULL, 'Com incidência de CBS', '2027-01-01', NULL, NULL, NULL),
('11', 'Crédito presumido na aquisição por contribuinte na Área de Livre Comércio, observado o art. 462 da Lei Complementar nº 214, de 2025.', 'Art. 462. Fica concedido ao contribuinte habilitado na forma do art. 460 e sujeito ao regime regular ou ao Simples Nacional crédito presumido de IBS relativo à importação de bem material para revenda presencial na Área de Livre Comércio.', '1', '0', '1', '0', '1', NULL, 'Alíquota efetiva com redução', NULL, 'pAliqEfet * 50%', NULL, NULL, NULL, 'Com incidência de IBS', NULL, NULL, '2027-01-01', NULL),
('12', 'Crédito presumido na aquisição por contribuinte na Área de Livre Comércio, observado o art. 465 da Lei Complementar nº 214, de 2025.', 'Art. 465. Fica concedido ao contribuinte sujeito ao regime regular do IBS e da CBS e habilitado na forma do art. 460 desta Lei Complementar crédito presumido de IBS relativo à aquisição de bem material industrializado de origem nacional contemplado pela redução a zero da alíquota do IBS nos termos do art. 463 desta Lei Complementar.', '0', '1', '0', '0', '1', NULL, 'Alíquota fixa', NULL, 'I - 7,5% (sete inteiros e cinco décimos por cento), no caso de bens provenientes das regiões Sul e Sudeste, exceto do Estado do Espírito Santo; e 

II - 13,5% (treze inteiros e cinco décimos por cento), no caso de bens provenientes das regiões Norte, Nordeste e Centro-Oeste e do Estado do Espírito Santo.', NULL, NULL, 'Redução:
I - 9/10 (nove décimos), em 2029;
II - 8/10 (oito décimos), em 2030;
III - 7/10 (sete décimos), em 2031; e
IV - 6/10 (seis décimos), em 2032.', 'cClass de alíquota zero', NULL, NULL, '2029-01-01', NULL),
('13', 'Crédito presumido na aquisição pela indústria na Área de Livre Comércio, observado o art. 467 da Lei Complementar nº 214, de 2025.', 'Art. 467. Fica concedido à indústria sujeita ao regime regular de IBS e de CBS e habilitada na forma do inciso II do caput do art. 460 desta Lei Complementar créditos presumidos de CBS relativo à operação que destine ao território nacional bem material produzido pela própria indústria na referida área nos termos do projeto econômico aprovado.', '1', '0', '0', '1', '0', 'Alíquota fixa', NULL, '7%', NULL, 7, NULL, NULL, 'Com incidência de CBS', '2027-01-01', NULL, NULL, NULL)
ON CONFLICT ("c_cred_pres") DO NOTHING;
