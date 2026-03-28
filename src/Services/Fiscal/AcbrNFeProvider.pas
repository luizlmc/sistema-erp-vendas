unit AcbrNFeProvider;

interface

type
  TAcbrNFeProvider = class
  public
    class function AuthorizeNFe(
      const AFiscalId: Int64;
      const AOrderId: Int64;
      out AAccessKey: string;
      out AProtocol: string;
      out AXml: string;
      out AError: string
    ): Boolean; static;
  end;

implementation

uses
  System.SysUtils,
  AppConfig,
  FiscalContext;

class function TAcbrNFeProvider.AuthorizeNFe(
  const AFiscalId: Int64;
  const AOrderId: Int64;
  out AAccessKey: string;
  out AProtocol: string;
  out AXml: string;
  out AError: string
): Boolean;
var
  LCfg: AppConfig.TFiscalConfig;
begin
  LCfg := TFiscalContext.Config;
  AAccessKey := '';
  AProtocol := '';
  AXml := '';

  if Trim(LCfg.CertificatePath) = '' then
  begin
    AError := 'Config fiscal.certificate_path nao informada para modo ACBR.';
    Exit(False);
  end;
  if Trim(LCfg.CNPJ) = '' then
  begin
    AError := 'Config fiscal.cnpj nao informada para modo ACBR.';
    Exit(False);
  end;

  AError := 'Integracao real com ACBr pendente: conectar ACBrNFe e retorno da SEFAZ.';
  Result := False;
end;

end.
