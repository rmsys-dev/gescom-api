import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { conferirCampo, deCentavos, paraCentavos } from "../../src/modules/nfe/compras/conferencia.js";
import { conferirEntrada } from "../../src/modules/nfe/compras/entrada-conferir.js";
import { sugerirCfopEntrada } from "../../src/modules/nfe/compras/entrada-cfop.js";
import {
  custoMedioPonderado,
  custoUnitarioEntrada,
  precoVendaSugerido,
} from "../../src/modules/nfe/compras/entrada-custo.js";
import {
  parseEntradaProcNFe,
  type EntradaItemXml,
  type EntradaTotais,
} from "../../src/modules/nfe/compras/entrada-xml.js";

const chave = "52261012345678000199550010000000101123456789";

const item = (parcial: Partial<EntradaItemXml> & { nItem: number }): EntradaItemXml => ({
  cProd: null,
  cEan: null,
  xProd: "Item",
  ncm: null,
  cest: null,
  cfop: "5102",
  uCom: "UN",
  qCom: "1.0000",
  vUnCom: "10.0000000000",
  vProd: "10.00",
  uTrib: "UN",
  qTrib: "1.0000",
  vUnTrib: "10.0000000000",
  vFrete: null,
  vSeg: null,
  vDesc: null,
  vOutro: null,
  indTot: "1",
  imposto: {
    icmsGrupo: "ICMS00",
    icmsOrig: "0",
    icmsCst: "00",
    icmsCsosn: null,
    icmsModBc: "3",
    icmsVBc: "10.00",
    icmsPIcms: "18.0000",
    icmsVIcms: "1.80",
    icmsPFcp: null,
    icmsVFcp: null,
    icmsPRedBc: null,
    icmsVIcmsDeson: null,
    icmsMotDesIcms: null,
    icmsIndDeduzDeson: null,
    icmsModBcSt: null,
    icmsPMvaSt: null,
    icmsPRedBcSt: null,
    icmsVBcSt: null,
    icmsPIcmsSt: null,
    icmsVIcmsSt: null,
    icmsVBcFcpSt: null,
    icmsPFcpSt: null,
    icmsVFcpSt: null,
    icmsVBcFcpStRet: null,
    icmsPFcpStRet: null,
    icmsVFcpStRet: null,
    ipiCst: null,
    ipiCEnq: null,
    ipiVBc: null,
    ipiPIpi: null,
    ipiVIpi: null,
    pisGrupo: null,
    pisCst: null,
    pisVBc: null,
    pisPPis: null,
    pisVPis: null,
    cofinsGrupo: null,
    cofinsCst: null,
    cofinsVBc: null,
    cofinsPCofins: null,
    cofinsVCofins: null,
    iiVIi: null,
    vIpiDevol: null,
    vTotTrib: null,
    ibsCbsCst: null,
    ibsCbsCClassTrib: null,
    ibsCbsVBc: null,
    ibsUfPIbs: null,
    ibsUfVIbs: null,
    ibsMunPIbs: null,
    ibsMunVIbs: null,
    ibsVIbs: null,
    cbsPCbs: null,
    cbsVCbs: null,
    isCst: null,
    isCClassTrib: null,
    isVBc: null,
    isPIs: null,
    isVIs: null,
  },
  ...parcial,
  imposto: {
    icmsGrupo: "ICMS00",
    icmsOrig: "0",
    icmsCst: "00",
    icmsCsosn: null,
    icmsModBc: "3",
    icmsVBc: "10.00",
    icmsPIcms: "18.0000",
    icmsVIcms: "1.80",
    icmsPFcp: null,
    icmsVFcp: null,
    icmsPRedBc: null,
    icmsVIcmsDeson: null,
    icmsMotDesIcms: null,
    icmsIndDeduzDeson: null,
    icmsModBcSt: null,
    icmsPMvaSt: null,
    icmsPRedBcSt: null,
    icmsVBcSt: null,
    icmsPIcmsSt: null,
    icmsVIcmsSt: null,
    icmsVBcFcpSt: null,
    icmsPFcpSt: null,
    icmsVFcpSt: null,
    icmsVBcFcpStRet: null,
    icmsPFcpStRet: null,
    icmsVFcpStRet: null,
    ipiCst: null,
    ipiCEnq: null,
    ipiVBc: null,
    ipiPIpi: null,
    ipiVIpi: null,
    pisGrupo: null,
    pisCst: null,
    pisVBc: null,
    pisPPis: null,
    pisVPis: null,
    cofinsGrupo: null,
    cofinsCst: null,
    cofinsVBc: null,
    cofinsPCofins: null,
    cofinsVCofins: null,
    iiVIi: null,
    vIpiDevol: null,
    vTotTrib: null,
    ibsCbsCst: null,
    ibsCbsCClassTrib: null,
    ibsCbsVBc: null,
    ibsUfPIbs: null,
    ibsUfVIbs: null,
    ibsMunPIbs: null,
    ibsMunVIbs: null,
    ibsVIbs: null,
    cbsPCbs: null,
    cbsVCbs: null,
    isCst: null,
    isCClassTrib: null,
    isVBc: null,
    isPIs: null,
    isVIs: null,
    ...parcial.imposto,
  },
});

const totais = (parcial: Partial<EntradaTotais> = {}): EntradaTotais => ({
  vBc: "10.00",
  vIcms: "1.80",
  vIcmsDeson: null,
  vFcp: null,
  vBcSt: null,
  vSt: null,
  vFcpSt: null,
  vFcpStRet: null,
  vProd: "10.00",
  vFrete: null,
  vSeg: null,
  vDesc: null,
  vIi: null,
  vIpi: null,
  vIpiDevol: null,
  vPis: null,
  vCofins: null,
  vOutro: null,
  vNf: "10.00",
  vTotTrib: null,
  vIs: null,
  vBcIbsCbs: null,
  vIbsUf: null,
  vIbsMun: null,
  vIbs: null,
  vCbs: null,
  issqnVServ: null,
  nFat: null,
  vOrig: null,
  cobrVDesc: null,
  vLiq: null,
  ...parcial,
});

describe("entrada: centavos", () => {
  it("nao ajusta quando a soma ja fecha", () => {
    const resultado = conferirCampo({
      campo: "vProd",
      totalCentavos: 1000,
      itens: [{ nItem: 1, centavos: 1000 }],
    });
    assert.equal(resultado.ajuste, null);
    assert.equal(resultado.bloqueio, null);
  });

  it("poe o centavo que falta no ultimo item", () => {
    const resultado = conferirCampo({
      campo: "vProd",
      totalCentavos: 1003,
      itens: [
        { nItem: 1, centavos: 500 },
        { nItem: 2, centavos: 502 },
      ],
    });
    assert.deepEqual(resultado.ajuste, {
      campo: "vProd",
      nItem: 2,
      centavos: 1,
    });
    assert.equal(deCentavos(1003), "10.03");
    assert.equal(paraCentavos("10.030"), 1003);
  });

  it("bloqueia diferenca maior que o limite", () => {
    const resultado = conferirCampo({
      campo: "vBC",
      totalCentavos: 1012,
      itens: [
        { nItem: 1, centavos: 500 },
        { nItem: 2, centavos: 500 },
      ],
    });
    assert.equal(resultado.ajuste, null);
    assert.equal(resultado.bloqueio?.somaCentavos, 1000);
    assert.equal(resultado.bloqueio?.totalCentavos, 1012);
  });

  it("nao soma produto com indTot 0 e grava o centavo no ultimo item", () => {
    const conferencia = conferirEntrada(
      [
        item({ nItem: 1, vProd: "5.00", imposto: { icmsVBc: "5.00", icmsVIcms: "0.90" } }),
        item({ nItem: 2, vProd: "5.01", imposto: { icmsVBc: "5.00", icmsVIcms: "0.90" } }),
        item({
          nItem: 3,
          indTot: "0",
          vProd: "9.00",
          imposto: { icmsVBc: null, icmsVIcms: null },
        }),
      ],
      totais({ vProd: "10.02", vBc: "10.00", vIcms: "1.80", vNf: "10.02" }),
    );
    assert.equal(conferencia.bloqueios.length, 0);
    assert.equal(conferencia.ajustes[0]?.nItem, 2);
    assert.equal(conferencia.itens[1]?.vProd, "5.02");
    assert.equal(conferencia.itens[2]?.vProd, "9.00");
  });

  it("mantem o valor da nota quando o desonerado nao traz o indicador", () => {
    const conferencia = conferirEntrada(
      [
        item({
          nItem: 1,
          vProd: "27059.50",
          imposto: {
            icmsVBc: "0.00",
            icmsVIcms: "0.00",
            icmsVIcmsDeson: "5141.31",
          },
        }),
      ],
      totais({
        vProd: "27059.50",
        vBc: "0.00",
        vIcms: "0.00",
        vIcmsDeson: "5141.31",
        vNf: "27059.50",
      }),
    );
    assert.equal(conferencia.bloqueios.some((bloqueio) => bloqueio.campo === "vNF"), false);
  });

  it("nao tira do valor da nota o ICMS desonerado com indDeduzDeson 0", () => {
    const conferencia = conferirEntrada(
      [
        item({
          nItem: 1,
          vProd: "27059.50",
          imposto: {
            icmsVBc: "21918.19",
            icmsVIcms: "0.00",
            icmsVIcmsDeson: "5141.31",
            icmsIndDeduzDeson: "0",
          },
        }),
      ],
      totais({
        vProd: "27059.50",
        vBc: "21918.19",
        vIcms: "0.00",
        vIcmsDeson: "5141.31",
        vNf: "27059.50",
      }),
    );
    assert.equal(conferencia.bloqueios.some((bloqueio) => bloqueio.campo === "vNF"), false);
  });

  it("tira do valor da nota o ICMS desonerado com indDeduzDeson 1", () => {
    const conferencia = conferirEntrada(
      [
        item({
          nItem: 1,
          vProd: "100.00",
          imposto: {
            icmsVBc: "100.00",
            icmsVIcms: "0.00",
            icmsVIcmsDeson: "18.00",
            icmsIndDeduzDeson: "1",
          },
        }),
      ],
      totais({
        vProd: "100.00",
        vBc: "100.00",
        vIcms: "0.00",
        vIcmsDeson: "18.00",
        vNf: "82.00",
      }),
    );
    assert.equal(conferencia.bloqueios.some((bloqueio) => bloqueio.campo === "vNF"), false);
  });
});

describe("entrada: rateio e CFOP", () => {
  it("distribui o frete do total pelo valor do produto e fecha no centavo", () => {
    const conferencia = conferirEntrada(
      [
        item({ nItem: 1, vProd: "10.00", imposto: { icmsVBc: "10.00", icmsVIcms: "0.00" } }),
        item({ nItem: 2, vProd: "30.00", imposto: { icmsVBc: "0.00", icmsVIcms: "0.00" } }),
      ],
      totais({
        vProd: "40.00",
        vBc: "10.00",
        vIcms: "0.00",
        vFrete: "4.00",
        vNf: "44.00",
      }),
    );
    assert.equal(conferencia.bloqueios.length, 0);
    assert.equal(conferencia.itens[0]?.vFrete, "1.00");
    assert.equal(conferencia.itens[1]?.vFrete, "3.00");
  });

  it("recusa rateio sem valor de produto para peso", () => {
    const conferencia = conferirEntrada(
      [item({ nItem: 1, indTot: "0", vProd: "0.00", imposto: { icmsVBc: null, icmsVIcms: null } })],
      totais({ vProd: null, vBc: null, vIcms: null, vFrete: "4.00", vNf: "4.00" }),
    );
    assert.equal(conferencia.bloqueios.some((row) => row.campo === "vFrete"), true);
  });

  it("sugere o CFOP de entrada pelo primeiro digito", () => {
    assert.equal(sugerirCfopEntrada("5102"), "1102");
    assert.equal(sugerirCfopEntrada("6102"), "2102");
    assert.equal(sugerirCfopEntrada("7101"), "3101");
    assert.equal(sugerirCfopEntrada("1102"), "1102");
    assert.equal(sugerirCfopEntrada(null), null);
  });
});

describe("entrada: custo e preco", () => {
  it("compoe o custo unitario com frete, IPI e ICMS ST", () => {
    assert.equal(
      custoUnitarioEntrada({
        vProd: "10.00",
        vDesc: "1.00",
        vFrete: "2.00",
        vSeg: "0.50",
        vOutro: "0.50",
        vIpi: "1.00",
        vIcmsSt: "1.00",
        qCom: "2.0000",
      }),
      "7.0000",
    );
  });

  it("pondera o custo medio pelo saldo e sugere o preco pela margem", () => {
    assert.equal(
      custoMedioPonderado({
        saldo: 10,
        custoMedioAtual: 4,
        quantidade: 10,
        custoUnitario: 6,
      }),
      "5.0000",
    );
    assert.equal(
      custoMedioPonderado({
        saldo: 0,
        custoMedioAtual: 4,
        quantidade: 2,
        custoUnitario: 6,
      }),
      "6.0000",
    );
    assert.equal(precoVendaSugerido(10, 30), "13.00");
    assert.equal(precoVendaSugerido(10, null), null);
  });
});

describe("entrada: leitura do XML", () => {
  it("le item, imposto e total do procNFe", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe><infNFe Id="NFe${chave}" versao="4.00">
    <ide><cUF>52</cUF><cNF>12345678</cNF><mod>55</mod><serie>1</serie><nNF>10</nNF>
      <dhEmi>2026-10-15T10:00:00-03:00</dhEmi><cMunFG>5208707</cMunFG><tpEmis>1</tpEmis><tpAmb>2</tpAmb></ide>
    <emit><CNPJ>12345678000199</CNPJ><xNome>Fornecedor Teste</xNome><xFant>Fantasia</xFant>
      <enderEmit><xLgr>Rua A</xLgr><nro>100</nro><xCpl>Sala 2</xCpl><xBairro>Centro</xBairro>
        <cMun>5208707</cMun><xMun>Goiania</xMun><UF>GO</UF><CEP>74000-000</CEP><fone>6233334444</fone>
      </enderEmit><IE>ISENTO</IE><IM>123</IM></emit>
    <dest><CNPJ>11222333000181</CNPJ></dest>
    <det nItem="1"><prod>
      <cProd>ABC</cProd><cEAN>SEM GTIN</cEAN><xProd>Racao</xProd><NCM>23099090</NCM><CFOP>5102</CFOP>
      <uCom>UN</uCom><qCom>2.0000</qCom><vUnCom>5.2500000000</vUnCom><vProd>10.50</vProd><indTot>1</indTot>
    </prod><imposto>
      <ICMS><ICMS00><orig>0</orig><CST>00</CST><modBC>3</modBC><vBC>10.50</vBC><pICMS>18.00</pICMS><vICMS>1.89</vICMS></ICMS00></ICMS>
      <IPI><cEnq>999</cEnq><IPINT><CST>53</CST></IPINT></IPI>
      <PIS><PISAliq><CST>01</CST><vBC>10.50</vBC><pPIS>1.65</pPIS><vPIS>0.17</vPIS></PISAliq></PIS>
    </imposto></det>
    <total><ICMSTot>
      <vBC>10.50</vBC><vICMS>1.89</vICMS><vProd>10.50</vProd><vPIS>0.17</vPIS><vNF>10.50</vNF>
    </ICMSTot></total>
    <cobr><dup><nDup>001</nDup><dVenc>2026-11-15</dVenc><vDup>10.50</vDup></dup></cobr>
  </infNFe></NFe>
  <protNFe><infProt><chNFe>${chave}</chNFe><nProt>152260000000001</nProt><cStat>100</cStat></infProt></protNFe>
</nfeProc>`;
    const nota = parseEntradaProcNFe(xml);
    assert.equal(nota.emitente.nome, "Fornecedor Teste");
    assert.equal(nota.emitente.fantasia, "Fantasia");
    assert.equal(nota.emitente.ie, "ISENTO");
    assert.equal(nota.emitente.im, "123");
    assert.equal(nota.emitente.fone, "6233334444");
    assert.equal(nota.emitente.cep, "74000000");
    assert.equal(nota.emitente.logradouro, "Rua A");
    assert.equal(nota.emitente.numero, "100");
    assert.equal(nota.emitente.municipio, "Goiania");
    assert.equal(nota.emitente.uf, "GO");
    assert.equal(nota.itens.length, 1);
    assert.equal(nota.itens[0]?.xProd, "Racao");
    assert.equal(nota.itens[0]?.cfop, "5102");
    assert.equal(nota.itens[0]?.imposto.icmsCst, "00");
    assert.equal(nota.itens[0]?.imposto.icmsVIcms, "1.89");
    assert.equal(nota.itens[0]?.imposto.pisVPis, "0.17");
    assert.equal(nota.itens[0]?.imposto.ipiCst, "53");
    assert.equal(nota.totais.vNf, "10.50");
    assert.equal(nota.duplicatas[0]?.dVenc, "2026-11-15");
    const conferencia = conferirEntrada(nota.itens, nota.totais);
    assert.equal(conferencia.bloqueios.length, 0);
    assert.equal(conferencia.ajustes.length, 0);
  });

  it("le IBS e CBS do total dentro de gIBS e gCBS", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00"><NFe><infNFe Id="NFe${chave}" versao="4.00">
  <ide><cUF>52</cUF><cNF>12345678</cNF><mod>55</mod><serie>1</serie><nNF>10</nNF>
    <dhEmi>2026-09-04T09:03:25-03:00</dhEmi><cMunFG>5208707</cMunFG><tpEmis>1</tpEmis><tpAmb>2</tpAmb></ide>
  <emit><CNPJ>12345678000199</CNPJ><xNome>Fornecedor</xNome></emit>
  <dest><CNPJ>11222333000181</CNPJ></dest>
  <det nItem="1"><prod><cProd>1</cProd><xProd>Racao</xProd><CFOP>5102</CFOP><uCom>UN</uCom><qCom>1</qCom><vUnCom>10</vUnCom><vProd>27059.50</vProd><indTot>1</indTot></prod>
  <imposto><ICMS><ICMS20><orig>0</orig><CST>20</CST><vBC>0.00</vBC><vICMS>0.00</vICMS><vICMSDeson>5141.31</vICMSDeson><motDesICMS>9</motDesICMS></ICMS20></ICMS>
  <IBSCBS><CST>000</CST><cClassTrib>000001</cClassTrib><gIBSCBS><vBC>27059.50</vBC><gIBSUF><vIBSUF>10.82</vIBSUF></gIBSUF><vIBS>10.82</vIBS><gCBS><vCBS>97.41</vCBS></gCBS></gIBSCBS></IBSCBS>
  </imposto></det>
  <total><ICMSTot><vBC>0.00</vBC><vICMS>0.00</vICMS><vICMSDeson>5141.31</vICMSDeson><vProd>27059.50</vProd><vNF>27059.50</vNF></ICMSTot>
  <IBSCBSTot><vBCIBSCBS>27059.50</vBCIBSCBS><gIBS><gIBSUF><vIBSUF>10.82</vIBSUF></gIBSUF><gIBSMun><vIBSMun>0.00</vIBSMun></gIBSMun><vIBS>10.82</vIBS></gIBS><gCBS><vCBS>97.41</vCBS></gCBS></IBSCBSTot>
  </total>
</infNFe></NFe><protNFe><infProt><chNFe>${chave}</chNFe></infProt></protNFe></nfeProc>`;
    const nota = parseEntradaProcNFe(xml);
    assert.equal(nota.totais.vIbsUf, "10.82");
    assert.equal(nota.totais.vIbs, "10.82");
    assert.equal(nota.totais.vCbs, "97.41");
    assert.equal(nota.itens[0]?.imposto.ibsUfVIbs, "10.82");
    assert.equal(nota.itens[0]?.imposto.cbsVCbs, "97.41");
    const conferencia = conferirEntrada(nota.itens, nota.totais);
    assert.deepEqual(conferencia.bloqueios.map((bloqueio) => bloqueio.campo), []);
  });
});
