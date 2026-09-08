import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatCep,
  formatDocument,
  formatMoney,
  formatOrderNumber,
  isZeroish,
  renderWorkOrderPrintHtml,
  workOrderPdfFilename,
  type WorkOrderPrintInput,
} from "../../src/modules/sales/print/os-print-html.js";

const baseInput = (): WorkOrderPrintInput => ({
  printedAt: new Date("2026-09-08T12:00:00.000Z"),
  enterprise: {
    legalName: "Oficina Gescom LTDA",
    tradeName: "Gescom Motors",
    registration: "12345678000195",
    phone: "+551133334444",
    email: "contato@gescom.test",
    whatsapp: "+5511999990000",
    addresses: [
      {
        adressType: "PRINCIPAL",
        number: "100",
        complement: "Sala 2",
        cep: {
          cepNumber: "01310100",
          address: "Av. Paulista",
          neighborhood: "Bela Vista",
          city: { citieName: "São Paulo", state: { acronym: "SP" } },
        },
      },
    ],
  },
  sale: {
    orderNumber: 123,
    type: "ORDEM DE SERVICO",
    status: "FINALIZADA",
    serviceType: "SERVICO",
    modelService: "VEICULO",
    createdAt: new Date("2026-09-01T10:00:00.000Z"),
    completedionDate: new Date("2026-09-08T00:00:00.000Z"),
    vehicleMileage: 45210,
    defect: "Barulho no motor",
    observations: "Cliente autorizou troca",
    subTotal: "605.00",
    discountValuetems: "20.00",
    valueAcresceItems: "0.00",
    valueProduct: "305.00",
    valueService: "300.00",
    valueLiquid: "585.00",
    percentageDiscountProduct: "0",
    valueDiscountFinancialProduct: "0",
    returnSituation: "SEM_DEVOLUCAO",
    user: { userName: "Operador" },
    seller: { userName: "Vendedor" },
    userClosedService: { userName: "Chefe oficina" },
    member: {
      memberLegalName: "Maria Cliente",
      registration: "52998224725",
      memberAddress: "Rua A, 10",
      memberCep: "01001000",
      memberCity: "São Paulo",
      memberState: "SP",
      memberPhone: "+55113333",
      memberMobile: "+55119999",
    },
    vehiclesEnterprisesMembers: {
      plate: "ABC1D23",
      model: "Uno",
      vehicleYear: 2018,
      color: "Prata",
      fuelType: "GASOLINA",
      fleetNumber: "F-01",
      renavam: "12345678901",
      vehicleType: "UTILITARIO",
      bodyType: "ABERTA",
      axleType: "VEICULO 2 EIXOS",
      ownerType: "PROPRIETARIO",
      capacityKg: "800.0000",
    },
    sourceBudget: { orderNumber: 50 },
    generatedSales: [{ orderNumber: 200 }],
    payments: [
      {
        valueTotal: "585.00",
        paymentType: { description: "Pix", paymentType: "A_VISTA" },
        dues: [
          {
            valueInstallment: "585.00",
            dueDate: new Date("2026-09-08T12:00:00.000Z"),
          },
        ],
      },
    ],
    items: [
      {
        productCode: 10045,
        productDescription: "Filtro de óleo",
        quantity: "1",
        valueUnit: "45.00",
        valueDiscount: "0",
        valueAcresce: "0",
        valueTotal: "45.00",
        productType: { type: "00" },
        unit: { unit: "UN" },
        sector: { description: "Almox" },
        location: { box: "A-12", description: "Prateleira" },
      },
      {
        productCode: 20881,
        description: "Pastilha de freio diant.",
        quantity: "1",
        valueUnit: "280.00",
        valueDiscount: "20.00",
        valueAcresce: "0",
        valueTotal: "260.00",
        productType: { type: "00" },
        unit: { unit: "JG" },
      },
      {
        productCode: 90012,
        productDescription: "Troca de óleo e filtro",
        quantity: "1",
        valueUnit: "120.00",
        valueDiscount: "0",
        valueAcresce: "0",
        valueTotal: "120.00",
        typeService: "PROPRIO",
        productType: { type: "09" },
        unit: { unit: "HR" },
        mechanics: [{ member: { userName: "João Silva" } }],
      },
      {
        productCode: 90033,
        productDescription: "Alinhamento e balanceamento",
        quantity: "1",
        valueUnit: "180.00",
        valueDiscount: "0",
        valueAcresce: "0",
        valueTotal: "180.00",
        typeService: "OUTROS",
        productType: { type: "09" },
        unit: { unit: "UN" },
        mechanics: [{ member: { userName: "Pedro Costa" } }],
      },
    ],
  },
});

describe("os-print-html formatters", () => {
  it("formata numero da OS, documento, CEP e moeda", () => {
    assert.equal(formatOrderNumber(123), "000123");
    assert.equal(formatDocument("52998224725"), "529.982.247-25");
    assert.equal(formatDocument("12345678000195"), "12.345.678/0001-95");
    assert.equal(formatCep("01310100"), "01310-100");
    assert.equal(formatMoney("305.00"), "R$\u00a0305,00");
    assert.equal(isZeroish("0.00"), true);
    assert.equal(isZeroish("20.00"), false);
  });
});

describe("renderWorkOrderPrintHtml", () => {
  it("imprime os 9 blocos e separa pecas de servicos", () => {
    const html = renderWorkOrderPrintHtml(baseInput());

    assert.match(html, /@page \{ size: A4/);
    assert.match(html, /ORDEM DE SERVIÇO/);
    assert.match(html, /Nº 000123/);
    assert.match(html, /Tipo: SERVICO/);
    assert.match(html, /Situação: FINALIZADA/);
    assert.doesNotMatch(html, /VEICULO/);
    assert.match(html, /Gescom Motors/);
    assert.match(html, /class="logo"/);
    assert.match(html, /data:image\/jpeg;base64,/);
    assert.match(html, /Razão social:<\/span> Oficina Gescom LTDA/);
    assert.match(
      html,
      /Endereço:<\/span> Av\. Paulista, 100, <span class="lbl">Complemento:<\/span> Sala 2/,
    );
    assert.match(
      html,
      /Setor:<\/span> Bela Vista, <span class="lbl">Cidade:<\/span> São Paulo, <span class="lbl">Estado:<\/span> SP/,
    );
    assert.match(
      html,
      /CEP:<\/span> 01310-100, <span class="lbl">Telefone:<\/span>/,
    );
    assert.match(html, /E-mail:<\/span> contato@gescom.test/);
    assert.match(html, /Maria Cliente/);
    assert.match(html, /ABC1D23/);
    assert.match(html, /45\.210 km/);
    assert.match(html, /Barulho no motor/);
    assert.match(html, /Discriminação de peças/);
    assert.match(html, /Filtro de óleo/);
    assert.match(html, /Pastilha de freio diant\./);
    assert.match(html, /Setor: Almox/);
    assert.match(html, /Discriminação de serviços/);
    assert.match(html, /Troca de óleo e filtro/);
    assert.match(html, /Mecânico: João Silva/);
    assert.match(html, /Pedro Costa/);
    assert.match(html, /Subtotal peças/);
    assert.match(html, /Subtotal serviços/);
    assert.match(html, /Valor líquido/);
    assert.match(html, /Pix/);
    assert.match(html, /Aberto por: Operador/);
    assert.match(html, /Encerrado por: Chefe oficina/);
    assert.doesNotMatch(html, /Vendedor:/);
    assert.doesNotMatch(html, /Alterado por/);
    assert.match(html, /Oficina \/ responsável técnico/);
    assert.match(
      html,
      /<table class="signs">[\s\S]*<td class="sign">[\s\S]*Cliente \/ responsável[\s\S]*<td class="sign">[\s\S]*Oficina \/ responsável técnico/,
    );
    assert.equal((html.match(/class="sign-line"/g) ?? []).length, 2);
    assert.match(html, /<\/article>\s*<div class="printed-at">Impresso em:/);
    assert.doesNotMatch(html, />Renavam</);
    assert.doesNotMatch(html, />Tipo<\/dt>/);
    assert.doesNotMatch(html, />Carroceria</);
    assert.doesNotMatch(html, />Eixos</);
    assert.doesNotMatch(html, />Proprietário</);
    assert.doesNotMatch(html, /UTILITARIO/);
    assert.doesNotMatch(html, /VEICULO 2 EIXOS/);
    assert.doesNotMatch(html, /PROPRIETARIO/);
    assert.match(html, /Orçamento Nº 000050/);
    assert.match(html, /Venda gerada: Nº 000200/);

    const partsIdx = html.indexOf("Discriminação de peças");
    const servicesIdx = html.indexOf("Discriminação de serviços");
    const filtroIdx = html.indexOf("Filtro de óleo");
    const trocaIdx = html.indexOf("Troca de óleo e filtro");
    assert.ok(partsIdx > 0 && servicesIdx > partsIdx);
    assert.ok(filtroIdx > partsIdx && filtroIdx < servicesIdx);
    assert.ok(trocaIdx > servicesIdx);
  });

  it("omite tabela vazia e escapa HTML do defeito", () => {
    const input = baseInput();
    input.sale.items = [
      {
        productCode: 1,
        productDescription: "Peça só",
        quantity: "1",
        valueUnit: "10",
        valueDiscount: "0",
        valueAcresce: "0",
        valueTotal: "10",
        productType: { type: "00" },
        unit: { unit: "UN" },
      },
    ];
    input.sale.defect = `<img src=x onerror="alert(1)">`;
    input.sale.status = "ABERTA";
    input.sale.payments = [];
    const html = renderWorkOrderPrintHtml(input);
    assert.match(html, /Discriminação de peças/);
    assert.doesNotMatch(html, /Discriminação de serviços/);
    assert.match(html, /&lt;img src=x onerror=/);
    assert.doesNotMatch(html, /<img src=x/);
    assert.match(html, /Pagamento ainda não registrado/);
  });

  it("omite toolbar no modo pdf e monta o nome do arquivo", () => {
    const html = renderWorkOrderPrintHtml({ ...baseInput(), mode: "pdf" });
    assert.doesNotMatch(html, /Imprimir/);
    assert.doesNotMatch(html, /autoPrint/);
    assert.equal(workOrderPdfFilename(123), "OS-000123.pdf");
  });

  it("omite campos vazios do cliente em vez de imprimir travessao", () => {
    const input = baseInput();
    input.sale.member = {
      memberLegalName: "Maria Cliente",
      registration: null,
      memberAddress: null,
      memberCep: null,
      memberCity: null,
      memberState: null,
      memberPhone: "  ",
      memberMobile: null,
    };
    const html = renderWorkOrderPrintHtml(input);
    assert.match(html, />Cliente<\/dt>/);
    assert.match(html, /Maria Cliente/);
    const clienteBlock = html.slice(
      html.indexOf("block-title\">Cliente"),
      html.indexOf("block-title\">Veículo"),
    );
    assert.doesNotMatch(clienteBlock, />CPF\/CNPJ</);
    assert.doesNotMatch(clienteBlock, />Endereço</);
    assert.doesNotMatch(clienteBlock, />CEP</);
    assert.doesNotMatch(clienteBlock, />Cidade\/UF</);
    assert.doesNotMatch(clienteBlock, />Telefone</);
    assert.doesNotMatch(clienteBlock, />Celular</);
    assert.doesNotMatch(clienteBlock, />—</);
  });
});
