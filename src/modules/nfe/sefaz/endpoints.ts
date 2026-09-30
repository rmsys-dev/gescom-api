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
