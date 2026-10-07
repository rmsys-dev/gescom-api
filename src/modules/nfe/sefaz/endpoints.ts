import { resolveAutorizador } from "./autorizadores.js";
import { nfeEndpointNotFoundError } from "./errors.js";
import type { Autorizador, NfeModelo, SefazAmbiente } from "./types.js";
import type { UfSigla } from "./uf.js";

type AmbienteUrls = {
  nfe: string;
  nfce?: string;
};

type AutorizadorUrls = {
  producao: AmbienteUrls;
  homologacao: AmbienteUrls;
};

const STATUS_SERVICO_URLS: Record<Autorizador, AutorizadorUrls> = {
  AM: {
    homologacao: {
      nfe: "https://homnfe.sefaz.am.gov.br/services2/services/NfeStatusServico4",
      nfce: "https://homnfe.sefaz.am.gov.br/services2/services/NfeStatusServico4",
    },
    producao: {
      nfe: "https://nfe.sefaz.am.gov.br/services2/services/NfeStatusServico4",
      nfce: "https://nfce.sefaz.am.gov.br/nfce-services/services/NfeStatusServico4",
    },
  },
  BA: {
    homologacao: {
      nfe: "https://hnfe.sefaz.ba.gov.br/webservices/NFeStatusServico4/NFeStatusServico4.asmx",
    },
    producao: {
      nfe: "https://nfe.sefaz.ba.gov.br/webservices/NFeStatusServico4/NFeStatusServico4.asmx",
    },
  },
  CE: {
    homologacao: {
      nfe: "https://nfeh.sefaz.ce.gov.br/nfe4/services/NFeStatusServico4",
    },
    producao: {
      nfe: "https://nfe.sefaz.ce.gov.br/nfe4/services/NFeStatusServico4",
    },
  },
  GO: {
    homologacao: {
      nfe: "https://homolog.sefaz.go.gov.br/nfe/services/NFeStatusServico4",
    },
    producao: {
      nfe: "https://nfe.sefaz.go.gov.br/nfe/services/NFeStatusServico4",
    },
  },
  MG: {
    homologacao: {
      nfe: "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4",
    },
    producao: {
      nfe: "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4",
    },
  },
  MS: {
    homologacao: {
      nfe: "https://hom.nfe.sefaz.ms.gov.br/ws/NFeStatusServico4",
      nfce: "https://homologacao.nfce.fazenda.ms.gov.br/ws/NFeStatusServico4",
    },
    producao: {
      nfe: "https://nfe.fazenda.ms.gov.br/ws/NFeStatusServico4",
      nfce: "https://nfce.fazenda.ms.gov.br/ws/NFeStatusServico4",
    },
  },
  MT: {
    homologacao: {
      nfe: "https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeStatusServico4",
    },
    producao: {
      nfe: "https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeStatusServico4",
    },
  },
  PE: {
    homologacao: {
      nfe: "https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeStatusServico4",
    },
    producao: {
      nfe: "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeStatusServico4",
    },
  },
  PR: {
    homologacao: {
      nfe: "https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeStatusServico4",
      nfce: "https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeStatusServico4",
    },
    producao: {
      nfe: "https://nfe.sefa.pr.gov.br/nfe/NFeStatusServico4",
      nfce: "https://nfce.sefa.pr.gov.br/nfce/NFeStatusServico4",
    },
  },
  RS: {
    homologacao: {
      nfe: "https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
      nfce: "https://nfce-homologacao.sefazrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
    },
    producao: {
      nfe: "https://nfe.sefazrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
      nfce: "https://nfce.sefazrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
    },
  },
  SP: {
    homologacao: {
      nfe: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx",
      nfce: "https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeStatusServico4.asmx",
    },
    producao: {
      nfe: "https://nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx",
      nfce: "https://nfce.fazenda.sp.gov.br/ws/NFeStatusServico4.asmx",
    },
  },
  SVAN: {
    homologacao: {
      nfe: "https://hom.sefazvirtual.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx",
    },
    producao: {
      nfe: "https://www.sefazvirtual.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx",
    },
  },
  SVRS: {
    homologacao: {
      nfe: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
      nfce: "https://nfce-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
    },
    producao: {
      nfe: "https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
      nfce: "https://nfce.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
    },
  },
};

const ambienteKey = (
  ambiente: SefazAmbiente,
): keyof AutorizadorUrls => (ambiente === 1 ? "producao" : "homologacao");

export const resolveStatusServicoUrl = (input: {
  uf: UfSigla;
  modelo: NfeModelo;
  ambiente: SefazAmbiente;
}): string => {
  const autorizador = resolveAutorizador(input.uf, input.modelo);
  const urls = STATUS_SERVICO_URLS[autorizador][ambienteKey(input.ambiente)];
  const url = input.modelo === "65" ? (urls.nfce ?? urls.nfe) : urls.nfe;

  if (!url) {
    throw nfeEndpointNotFoundError(
      `Endpoint de status do servico nao encontrado para UF ${input.uf} modelo ${input.modelo}`,
    );
  }

  return url;
};

export const STATUS_SERVICO_SOAP_ACTION =
  "http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4/nfeStatusServicoNF";

export const STATUS_SERVICO_SOAP_NAMESPACE =
  "http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4";

const AUTORIZACAO_URLS: Record<Autorizador, AutorizadorUrls> = {
  AM: {
    homologacao: {
      nfe: "https://homnfe.sefaz.am.gov.br/services2/services/NfeAutorizacao4",
      nfce: "https://homnfce.sefaz.am.gov.br/nfce-services/services/NfeAutorizacao4",
    },
    producao: {
      nfe: "https://nfe.sefaz.am.gov.br/services2/services/NfeAutorizacao4",
      nfce: "https://nfce.sefaz.am.gov.br/nfce-services/services/NfeAutorizacao4",
    },
  },
  BA: {
    homologacao: {
      nfe: "https://hnfe.sefaz.ba.gov.br/webservices/NFeAutorizacao4/NFeAutorizacao4.asmx",
    },
    producao: {
      nfe: "https://nfe.sefaz.ba.gov.br/webservices/NFeAutorizacao4/NFeAutorizacao4.asmx",
    },
  },
  CE: {
    homologacao: {
      nfe: "https://nfeh.sefaz.ce.gov.br/nfe4/services/NFeAutorizacao4",
    },
    producao: {
      nfe: "https://nfe.sefaz.ce.gov.br/nfe4/services/NFeAutorizacao4",
    },
  },
  GO: {
    homologacao: {
      nfe: "https://homolog.sefaz.go.gov.br/nfe/services/NFeAutorizacao4",
    },
    producao: {
      nfe: "https://nfe.sefaz.go.gov.br/nfe/services/NFeAutorizacao4",
    },
  },
  MG: {
    homologacao: {
      nfe: "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4",
      nfce: "https://hnfce.fazenda.mg.gov.br/nfce/services/NFeAutorizacao4",
    },
    producao: {
      nfe: "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4",
      nfce: "https://nfce.fazenda.mg.gov.br/nfce/services/NFeAutorizacao4",
    },
  },
  MS: {
    homologacao: {
      nfe: "https://hom.nfe.sefaz.ms.gov.br/ws/NFeAutorizacao4",
      nfce: "https://hom.nfce.sefaz.ms.gov.br/ws/NFeAutorizacao4",
    },
    producao: {
      nfe: "https://nfe.sefaz.ms.gov.br/ws/NFeAutorizacao4",
      nfce: "https://nfce.sefaz.ms.gov.br/ws/NFeAutorizacao4",
    },
  },
  MT: {
    homologacao: {
      nfe: "https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeAutorizacao4",
      nfce: "https://homologacao.sefaz.mt.gov.br/nfcews/services/NfeAutorizacao4",
    },
    producao: {
      nfe: "https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeAutorizacao4",
      nfce: "https://nfce.sefaz.mt.gov.br/nfcews/services/NfeAutorizacao4",
    },
  },
  PE: {
    homologacao: {
      nfe: "https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeAutorizacao4",
    },
    producao: {
      nfe: "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeAutorizacao4",
    },
  },
  PR: {
    homologacao: {
      nfe: "https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4",
      nfce: "https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeAutorizacao4",
    },
    producao: {
      nfe: "https://nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4",
      nfce: "https://nfce.sefa.pr.gov.br/nfce/NFeAutorizacao4",
    },
  },
  RS: {
    homologacao: {
      nfe: "https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
      nfce: "https://nfce-homologacao.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
    },
    producao: {
      nfe: "https://nfe.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
      nfce: "https://nfce.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
    },
  },
  SP: {
    homologacao: {
      nfe: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx",
      nfce: "https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeAutorizacao4.asmx",
    },
    producao: {
      nfe: "https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx",
      nfce: "https://nfce.fazenda.sp.gov.br/ws/NFeAutorizacao4.asmx",
    },
  },
  SVAN: {
    homologacao: {
      nfe: "https://hom.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx",
    },
    producao: {
      nfe: "https://www.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx",
    },
  },
  SVRS: {
    homologacao: {
      nfe: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
      nfce: "https://nfce-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
    },
    producao: {
      nfe: "https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
      nfce: "https://nfce.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
    },
  },
};

export const resolveAutorizacaoUrl = (input: {
  uf: UfSigla;
  modelo: NfeModelo;
  ambiente: SefazAmbiente;
}): string => {
  const autorizador = resolveAutorizador(input.uf, input.modelo);
  const urls = AUTORIZACAO_URLS[autorizador][ambienteKey(input.ambiente)];
  const url = input.modelo === "65" ? (urls.nfce ?? urls.nfe) : urls.nfe;
  if (!url) {
    throw nfeEndpointNotFoundError(
      `Endpoint de autorizacao nao encontrado para UF ${input.uf} modelo ${input.modelo}`,
    );
  }
  return url;
};

export const AUTORIZACAO_SOAP_ACTION =
  "http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote";

export const AUTORIZACAO_SOAP_NAMESPACE =
  "http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4";

const resolveModelUrl = (
  table: Record<Autorizador, AutorizadorUrls>,
  service: string,
  input: { uf: UfSigla; modelo: NfeModelo; ambiente: SefazAmbiente },
): string => {
  const autorizador = resolveAutorizador(input.uf, input.modelo);
  const urls = table[autorizador][ambienteKey(input.ambiente)];
  const url = input.modelo === "65" ? (urls.nfce ?? urls.nfe) : urls.nfe;
  if (!url) {
    throw nfeEndpointNotFoundError(
      `Endpoint de ${service} nao encontrado para UF ${input.uf} modelo ${input.modelo}`,
    );
  }
  return url;
};

const RECEPCAO_EVENTO_URLS: Record<Autorizador, AutorizadorUrls> = {
  AM: {
    homologacao: {
      nfe: "https://homnfe.sefaz.am.gov.br/services2/services/RecepcaoEvento4",
      nfce: "https://homnfce.sefaz.am.gov.br/nfce-services/services/RecepcaoEvento4",
    },
    producao: {
      nfe: "https://nfe.sefaz.am.gov.br/services2/services/RecepcaoEvento4",
      nfce: "https://nfce.sefaz.am.gov.br/nfce-services/services/RecepcaoEvento4",
    },
  },
  BA: {
    homologacao: {
      nfe: "https://hnfe.sefaz.ba.gov.br/webservices/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
    },
    producao: {
      nfe: "https://nfe.sefaz.ba.gov.br/webservices/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
    },
  },
  CE: {
    homologacao: {
      nfe: "https://nfeh.sefaz.ce.gov.br/nfe4/services/NFeRecepcaoEvento4",
    },
    producao: {
      nfe: "https://nfe.sefaz.ce.gov.br/nfe4/services/NFeRecepcaoEvento4",
    },
  },
  GO: {
    homologacao: {
      nfe: "https://homolog.sefaz.go.gov.br/nfe/services/NFeRecepcaoEvento4",
    },
    producao: {
      nfe: "https://nfe.sefaz.go.gov.br/nfe/services/NFeRecepcaoEvento4",
    },
  },
  MG: {
    homologacao: {
      nfe: "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeRecepcaoEvento4",
      nfce: "https://hnfce.fazenda.mg.gov.br/nfce/services/NFeRecepcaoEvento4",
    },
    producao: {
      nfe: "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeRecepcaoEvento4",
      nfce: "https://nfce.fazenda.mg.gov.br/nfce/services/NFeRecepcaoEvento4",
    },
  },
  MS: {
    homologacao: {
      nfe: "https://hom.nfe.sefaz.ms.gov.br/ws/NFeRecepcaoEvento4",
      nfce: "https://hom.nfce.sefaz.ms.gov.br/ws/NFeRecepcaoEvento4",
    },
    producao: {
      nfe: "https://nfe.sefaz.ms.gov.br/ws/NFeRecepcaoEvento4",
      nfce: "https://nfce.sefaz.ms.gov.br/ws/NFeRecepcaoEvento4",
    },
  },
  MT: {
    homologacao: {
      nfe: "https://homologacao.sefaz.mt.gov.br/nfews/v2/services/RecepcaoEvento4",
      nfce: "https://homologacao.sefaz.mt.gov.br/nfcews/services/RecepcaoEvento4",
    },
    producao: {
      nfe: "https://nfe.sefaz.mt.gov.br/nfews/v2/services/RecepcaoEvento4",
      nfce: "https://nfce.sefaz.mt.gov.br/nfcews/services/RecepcaoEvento4",
    },
  },
  PE: {
    homologacao: {
      nfe: "https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeRecepcaoEvento4",
    },
    producao: {
      nfe: "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeRecepcaoEvento4",
    },
  },
  PR: {
    homologacao: {
      nfe: "https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeRecepcaoEvento4",
      nfce: "https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeRecepcaoEvento4",
    },
    producao: {
      nfe: "https://nfe.sefa.pr.gov.br/nfe/NFeRecepcaoEvento4",
      nfce: "https://nfce.sefa.pr.gov.br/nfce/NFeRecepcaoEvento4",
    },
  },
  RS: {
    homologacao: {
      nfe: "https://nfe-homologacao.sefazrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
      nfce: "https://nfce-homologacao.sefazrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
    },
    producao: {
      nfe: "https://nfe.sefazrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
      nfce: "https://nfce.sefazrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
    },
  },
  SP: {
    homologacao: {
      nfe: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx",
      nfce: "https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeRecepcaoEvento4.asmx",
    },
    producao: {
      nfe: "https://nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx",
      nfce: "https://nfce.fazenda.sp.gov.br/ws/NFeRecepcaoEvento4.asmx",
    },
  },
  SVAN: {
    homologacao: {
      nfe: "https://hom.sefazvirtual.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
    },
    producao: {
      nfe: "https://www.sefazvirtual.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
    },
  },
  SVRS: {
    homologacao: {
      nfe: "https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
      nfce: "https://nfce-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
    },
    producao: {
      nfe: "https://nfe.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
      nfce: "https://nfce.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
    },
  },
};

export const resolveRecepcaoEventoUrl = (input: {
  uf: UfSigla;
  modelo: NfeModelo;
  ambiente: SefazAmbiente;
}): string => resolveModelUrl(RECEPCAO_EVENTO_URLS, "recepcao de evento", input);

export const RECEPCAO_EVENTO_SOAP_ACTION =
  "http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento";

export const RECEPCAO_EVENTO_SOAP_NAMESPACE =
  "http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4";

const INUTILIZACAO_URLS: Record<Autorizador, AutorizadorUrls> = {
  AM: {
    homologacao: {
      nfe: "https://homnfe.sefaz.am.gov.br/services2/services/NfeInutilizacao4",
      nfce: "https://homnfce.sefaz.am.gov.br/nfce-services/services/NfeInutilizacao4",
    },
    producao: {
      nfe: "https://nfe.sefaz.am.gov.br/services2/services/NfeInutilizacao4",
      nfce: "https://nfce.sefaz.am.gov.br/nfce-services/services/NfeInutilizacao4",
    },
  },
  BA: {
    homologacao: {
      nfe: "https://hnfe.sefaz.ba.gov.br/webservices/NFeInutilizacao4/NFeInutilizacao4.asmx",
    },
    producao: {
      nfe: "https://nfe.sefaz.ba.gov.br/webservices/NFeInutilizacao4/NFeInutilizacao4.asmx",
    },
  },
  CE: {
    homologacao: {
      nfe: "https://nfeh.sefaz.ce.gov.br/nfe4/services/NFeInutilizacao4",
    },
    producao: {
      nfe: "https://nfe.sefaz.ce.gov.br/nfe4/services/NFeInutilizacao4",
    },
  },
  GO: {
    homologacao: {
      nfe: "https://homolog.sefaz.go.gov.br/nfe/services/NFeInutilizacao4",
    },
    producao: {
      nfe: "https://nfe.sefaz.go.gov.br/nfe/services/NFeInutilizacao4",
    },
  },
  MG: {
    homologacao: {
      nfe: "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeInutilizacao4",
      nfce: "https://hnfce.fazenda.mg.gov.br/nfce/services/NFeInutilizacao4",
    },
    producao: {
      nfe: "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeInutilizacao4",
      nfce: "https://nfce.fazenda.mg.gov.br/nfce/services/NFeInutilizacao4",
    },
  },
  MS: {
    homologacao: {
      nfe: "https://hom.nfe.sefaz.ms.gov.br/ws/NFeInutilizacao4",
      nfce: "https://hom.nfce.sefaz.ms.gov.br/ws/NFeInutilizacao4",
    },
    producao: {
      nfe: "https://nfe.sefaz.ms.gov.br/ws/NFeInutilizacao4",
      nfce: "https://nfce.sefaz.ms.gov.br/ws/NFeInutilizacao4",
    },
  },
  MT: {
    homologacao: {
      nfe: "https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeInutilizacao4",
      nfce: "https://homologacao.sefaz.mt.gov.br/nfcews/services/NfeInutilizacao4",
    },
    producao: {
      nfe: "https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeInutilizacao4",
      nfce: "https://nfce.sefaz.mt.gov.br/nfcews/services/NfeInutilizacao4",
    },
  },
  PE: {
    homologacao: {
      nfe: "https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeInutilizacao4",
    },
    producao: {
      nfe: "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeInutilizacao4",
    },
  },
  PR: {
    homologacao: {
      nfe: "https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeInutilizacao4",
      nfce: "https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeInutilizacao4",
    },
    producao: {
      nfe: "https://nfe.sefa.pr.gov.br/nfe/NFeInutilizacao4",
      nfce: "https://nfce.sefa.pr.gov.br/nfce/NFeInutilizacao4",
    },
  },
  RS: {
    homologacao: {
      nfe: "https://nfe-homologacao.sefazrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx",
      nfce: "https://nfce-homologacao.sefazrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx",
    },
    producao: {
      nfe: "https://nfe.sefazrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx",
      nfce: "https://nfce.sefazrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx",
    },
  },
  SP: {
    homologacao: {
      nfe: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx",
      nfce: "https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeInutilizacao4.asmx",
    },
    producao: {
      nfe: "https://nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx",
      nfce: "https://nfce.fazenda.sp.gov.br/ws/NFeInutilizacao4.asmx",
    },
  },
  SVAN: {
    homologacao: {
      nfe: "https://hom.sefazvirtual.fazenda.gov.br/NFeInutilizacao4/NFeInutilizacao4.asmx",
    },
    producao: {
      nfe: "https://www.sefazvirtual.fazenda.gov.br/NFeInutilizacao4/NFeInutilizacao4.asmx",
    },
  },
  SVRS: {
    homologacao: {
      nfe: "https://nfe-homologacao.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx",
      nfce: "https://nfce-homologacao.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx",
    },
    producao: {
      nfe: "https://nfe.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx",
      nfce: "https://nfce.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx",
    },
  },
};

export const resolveInutilizacaoUrl = (input: {
  uf: UfSigla;
  modelo: NfeModelo;
  ambiente: SefazAmbiente;
}): string => resolveModelUrl(INUTILIZACAO_URLS, "inutilizacao", input);

export const INUTILIZACAO_SOAP_ACTION =
  "http://www.portalfiscal.inf.br/nfe/wsdl/NFeInutilizacao4/nfeInutilizacaoNF";

export const INUTILIZACAO_SOAP_NAMESPACE =
  "http://www.portalfiscal.inf.br/nfe/wsdl/NFeInutilizacao4";

type ConsultaCadastroUrls = { producao: string; homologacao: string };

const SVRS_CONSULTA_CADASTRO: ConsultaCadastroUrls = {
  homologacao:
    "https://cad.svrs.rs.gov.br/ws/cadconsultacadastro/cadconsultacadastro4.asmx",
  producao:
    "https://cad.svrs.rs.gov.br/ws/cadconsultacadastro/cadconsultacadastro4.asmx",
};

/** Só as UFs que oferecem o CadConsultaCadastro4; a consulta vai na SEFAZ da UF pesquisada. */
const CONSULTA_CADASTRO_URLS: Partial<Record<UfSigla, ConsultaCadastroUrls>> = {
  AM: {
    homologacao:
      "https://homnfe.sefaz.am.gov.br/services2/services/CadConsultaCadastro4",
    producao: "https://nfe.sefaz.am.gov.br/services2/services/CadConsultaCadastro4",
  },
  BA: {
    homologacao:
      "https://hnfe.sefaz.ba.gov.br/webservices/CadConsultaCadastro4/CadConsultaCadastro4.asmx",
    producao:
      "https://nfe.sefaz.ba.gov.br/webservices/CadConsultaCadastro4/CadConsultaCadastro4.asmx",
  },
  CE: {
    homologacao: "https://nfeh.sefaz.ce.gov.br/nfe4/services/CadConsultaCadastro4",
    producao: "https://nfe.sefaz.ce.gov.br/nfe4/services/CadConsultaCadastro4",
  },
  GO: {
    homologacao:
      "https://homolog.sefaz.go.gov.br/nfe/services/CadConsultaCadastro4",
    producao: "https://nfe.sefaz.go.gov.br/nfe/services/CadConsultaCadastro4",
  },
  MG: {
    homologacao:
      "https://hnfe.fazenda.mg.gov.br/nfe2/services/CadConsultaCadastro4",
    producao: "https://nfe.fazenda.mg.gov.br/nfe2/services/CadConsultaCadastro4",
  },
  MS: {
    homologacao: "https://hom.nfe.sefaz.ms.gov.br/ws/CadConsultaCadastro4",
    producao: "https://nfe.sefaz.ms.gov.br/ws/CadConsultaCadastro4",
  },
  MT: {
    homologacao:
      "https://homologacao.sefaz.mt.gov.br/nfews/v2/services/CadConsultaCadastro4",
    producao:
      "https://nfe.sefaz.mt.gov.br/nfews/v2/services/CadConsultaCadastro4",
  },
  PE: {
    homologacao:
      "https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/CadConsultaCadastro4",
    producao:
      "https://nfe.sefaz.pe.gov.br/nfe-service/services/CadConsultaCadastro4",
  },
  PR: {
    homologacao:
      "https://homologacao.nfe.sefa.pr.gov.br/nfe/CadConsultaCadastro4",
    producao: "https://nfe.sefa.pr.gov.br/nfe/CadConsultaCadastro4",
  },
  RS: {
    homologacao:
      "https://cad.sefazrs.rs.gov.br/ws/cadconsultacadastro/cadconsultacadastro4.asmx",
    producao:
      "https://cad.sefazrs.rs.gov.br/ws/cadconsultacadastro/cadconsultacadastro4.asmx",
  },
  SP: {
    homologacao:
      "https://homologacao.nfe.fazenda.sp.gov.br/ws/cadconsultacadastro4.asmx",
    producao: "https://nfe.fazenda.sp.gov.br/ws/cadconsultacadastro4.asmx",
  },
  AC: SVRS_CONSULTA_CADASTRO,
  PB: SVRS_CONSULTA_CADASTRO,
  RN: SVRS_CONSULTA_CADASTRO,
  SC: SVRS_CONSULTA_CADASTRO,
};

export const resolveConsultaCadastroUrl = (input: {
  uf: UfSigla;
  ambiente: SefazAmbiente;
}): string => {
  const urls = CONSULTA_CADASTRO_URLS[input.uf];
  if (!urls) {
    throw nfeEndpointNotFoundError(
      `A UF ${input.uf} nao oferece consulta cadastro`,
    );
  }
  return urls[ambienteKey(input.ambiente)];
};

export const CONSULTA_CADASTRO_SOAP_ACTION =
  "http://www.portalfiscal.inf.br/nfe/wsdl/CadConsultaCadastro4/consultaCadastro";

export const CONSULTA_CADASTRO_SOAP_NAMESPACE =
  "http://www.portalfiscal.inf.br/nfe/wsdl/CadConsultaCadastro4";
