unit FiscalContext;

interface

uses
  AppConfig;

type
  TFiscalContext = class
  public
    class procedure Initialize(const AConfig: TFiscalConfig); static;
    class function Config: TFiscalConfig; static;
  end;

implementation

uses
  System.SysUtils;

var
  GFiscalConfig: TFiscalConfig;
  GFiscalInitialized: Boolean = False;

class procedure TFiscalContext.Initialize(const AConfig: TFiscalConfig);
begin
  GFiscalConfig := AConfig;
  GFiscalInitialized := True;
end;

class function TFiscalContext.Config: TFiscalConfig;
begin
  if not GFiscalInitialized then
    raise Exception.Create('FiscalContext nao inicializado.');
  Result := GFiscalConfig;
end;

end.
