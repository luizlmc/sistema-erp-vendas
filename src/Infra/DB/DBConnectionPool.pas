unit DBConnectionPool;

interface

uses
  AppConfig;

type
  TConnectionPool = class
  strict private
    class var FInitialized: Boolean;
    class var FConnectionDefName: string;
    class procedure EnsureInitialized;
  public
    class procedure Initialize(const AConfig: TAppConfig);
    class procedure Finalize;
    class function ConnectionDefName: string;
  end;

implementation

uses
  System.SysUtils,
  System.Classes,
  FireDAC.Comp.Client,
  FireDAC.Stan.Def,
  FireDAC.Stan.Intf,
  FireDAC.Stan.Async,
  FireDAC.Stan.Pool,
  FireDAC.Phys,
  FireDAC.Phys.PG,
  FireDAC.Phys.PGDef,
  FireDAC.Phys.Intf,
  FireDAC.DApt;

const
  DEFAULT_CONNECTION_DEF_NAME = 'ERP_POSTGRES_POOL';

class function TConnectionPool.ConnectionDefName: string;
begin
  EnsureInitialized;
  Result := FConnectionDefName;
end;

class procedure TConnectionPool.EnsureInitialized;
begin
  if not FInitialized then
    raise Exception.Create('Pool de conexoes ainda nao foi inicializado.');
end;

class procedure TConnectionPool.Finalize;
begin
  if not FInitialized then
    Exit;

  FDManager.CloseConnectionDef(FConnectionDefName);
  FDManager.DeleteConnectionDef(FConnectionDefName);
  FInitialized := False;
  FConnectionDefName := '';
end;

class procedure TConnectionPool.Initialize(const AConfig: TAppConfig);
var
  LParams: TStringList;
begin
  if FInitialized then
    Exit;

  FDManager.Active := False;
  FDManager.SilentMode := True;
  FConnectionDefName := DEFAULT_CONNECTION_DEF_NAME;

  LParams := TStringList.Create;
  try
    LParams.Values['DriverID'] := AConfig.Database.DriverID;
    LParams.Values['Server'] := AConfig.Database.Host;
    LParams.Values['Port'] := AConfig.Database.Port.ToString;
    LParams.Values['Database'] := AConfig.Database.Database;
    LParams.Values['User_Name'] := AConfig.Database.UserName;
    LParams.Values['Password'] := AConfig.Database.Password;
    LParams.Values['VendorLib'] := AConfig.Database.VendorLib;
    LParams.Values['Pooled'] := BoolToStr(AConfig.Database.Pooling, True);
    LParams.Values['POOL_MaximumItems'] := AConfig.Database.PoolMaxItems.ToString;
    LParams.Values['ConnectTimeout'] := AConfig.Database.ConnectionTimeout.ToString;
    LParams.Values['LoginTimeout'] := AConfig.Database.LoginTimeout.ToString;

    if FDManager.ConnectionDefs.FindConnectionDef(FConnectionDefName) <> nil then
      FDManager.DeleteConnectionDef(FConnectionDefName);

    FDManager.AddConnectionDef(FConnectionDefName, AConfig.Database.DriverID, LParams, False);
    FDManager.Active := True;
    FInitialized := True;
  finally
    LParams.Free;
  end;
end;

end.
