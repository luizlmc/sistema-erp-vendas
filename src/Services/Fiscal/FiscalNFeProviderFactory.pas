unit FiscalNFeProviderFactory;

interface

type
  TFiscalNFeProviderFactory = class
  public
    class function AuthorizeNFe(
      const AFiscalId: Int64;
      const AOrderId: Int64;
      out AAccessKey: string;
      out AProtocol: string;
      out AXml: string;
      out AError: string
    ): Boolean; static;
    class function CurrentProviderMode: string; static;
  end;

implementation

uses
  System.SysUtils,
  FiscalContext,
  AcbrNFeProvider,
  MockNFeProvider;

class function TFiscalNFeProviderFactory.CurrentProviderMode: string;
begin
  Result := UpperCase(Trim(TFiscalContext.Config.ProviderMode));
  if Result = '' then
    Result := 'MOCK';
end;

class function TFiscalNFeProviderFactory.AuthorizeNFe(
  const AFiscalId: Int64;
  const AOrderId: Int64;
  out AAccessKey: string;
  out AProtocol: string;
  out AXml: string;
  out AError: string
): Boolean;
begin
  if CurrentProviderMode = 'ACBR' then
    Exit(TAcbrNFeProvider.AuthorizeNFe(AFiscalId, AOrderId, AAccessKey, AProtocol, AXml, AError));

  Result := TMockNFeProvider.AuthorizeNFe(AFiscalId, AOrderId, AAccessKey, AProtocol, AXml, AError);
end;

end.
