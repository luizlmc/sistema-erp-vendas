unit MockNFeProvider;

interface

type
  TMockNFeProvider = class
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
  System.Hash;

class function TMockNFeProvider.AuthorizeNFe(
  const AFiscalId: Int64;
  const AOrderId: Int64;
  out AAccessKey: string;
  out AProtocol: string;
  out AXml: string;
  out AError: string
): Boolean;
var
  LSeed: string;
  LHash: string;
begin
  AError := '';
  LSeed := Format('%d|%d|%s', [AFiscalId, AOrderId, FormatDateTime('yyyymmddhhnnsszzz', Now)]);
  LHash := LowerCase(THashSHA2.GetHashString(LSeed));

  AAccessKey := Copy('35' + LHash, 1, 44);
  AProtocol := Copy('135' + LHash, 1, 15);
  AXml :=
    '<NFe>' +
    '<infNFe Id="' + AAccessKey + '">' +
    '<ide><mod>55</mod></ide>' +
    '<emit><xNome>ERP VENDAS</xNome></emit>' +
    '<dest><xNome>CLIENTE</xNome></dest>' +
    '</infNFe>' +
    '</NFe>';

  Result := True;
end;

end.
