unit DatabaseBootstrap;

interface

uses
  AppConfig;

type
  TDatabaseBootstrap = class
  public
    class procedure Initialize(const AConfig: TAppConfig); static;
    class procedure Finalize; static;
  end;

implementation

uses
  System.SysUtils,
  System.IOUtils,
  Winapi.Windows,
  DBConnectionPool,
  DatabaseMigrator;

class procedure TDatabaseBootstrap.Finalize;
begin
  TConnectionPool.Finalize;
end;

class procedure TDatabaseBootstrap.Initialize(const AConfig: TAppConfig);
var
  LCurrentPath: string;
  LVendorLibDir: string;
begin
  LVendorLibDir := ExtractFileDir(AConfig.Database.VendorLib);
  if (LVendorLibDir <> '') and TDirectory.Exists(LVendorLibDir) then
  begin
    LCurrentPath := GetEnvironmentVariable('PATH');
    if not LCurrentPath.Contains(LVendorLibDir) then
      SetEnvironmentVariable('PATH', PChar(LVendorLibDir + PathSep + LCurrentPath));
  end;

  TConnectionPool.Initialize(AConfig);
  TDatabaseMigrator.RunPendingMigrations;
end;

end.
