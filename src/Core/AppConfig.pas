unit AppConfig;

interface

uses
  System.SysUtils;

type
  TDatabaseConfig = record
    Host: string;
    Port: Integer;
    Database: string;
    UserName: string;
    Password: string;
    VendorLib: string;
    Pooling: Boolean;
    PoolMaxItems: Integer;
    ConnectionTimeout: Integer;
    LoginTimeout: Integer;
    DriverID: string;
  end;

  TAuthConfig = record
    Secret: string;
    TokenTtlMinutes: Integer;
    RefreshTokenTtlMinutes: Integer;
  end;

  TFiscalConfig = record
    ProviderMode: string;
    Ambiente: string;
    CNPJ: string;
    UF: string;
    CertificatePath: string;
    CertificatePassword: string;
  end;

  TAppConfig = record
    Database: TDatabaseConfig;
    Auth: TAuthConfig;
    Fiscal: TFiscalConfig;
    ServerPort: Integer;
    class function LoadDefault: TAppConfig; static;
  end;

implementation

uses
  System.IniFiles,
  System.IOUtils;

const
  CONFIG_FILE_NAME = 'appsettings.ini';

class function TAppConfig.LoadDefault: TAppConfig;
var
  LIniFile: TIniFile;
  LConfigPath: string;
begin
  LConfigPath := TPath.Combine(ExtractFilePath(ParamStr(0)), CONFIG_FILE_NAME);
  if not TFile.Exists(LConfigPath) then
    raise Exception.CreateFmt(
      'Arquivo de configuracao nao encontrado: %s',
      [LConfigPath]
    );

  LIniFile := TIniFile.Create(LConfigPath);
  try
    Result.Database.Host := LIniFile.ReadString('database', 'host', '127.0.0.1');
    Result.Database.Port := LIniFile.ReadInteger('database', 'port', 5432);
    Result.Database.Database := LIniFile.ReadString('database', 'name', 'postgres');
    Result.Database.UserName := LIniFile.ReadString('database', 'user', 'postgres');
    Result.Database.Password := LIniFile.ReadString('database', 'password', 'postgres');
    Result.Database.VendorLib := LIniFile.ReadString(
      'database',
      'vendor_lib',
      'C:\Program Files\PostgreSQL\18\bin\libpq.dll'
    );
    Result.Database.DriverID := LIniFile.ReadString('database', 'driver_id', 'PG');
    Result.Database.Pooling := LIniFile.ReadBool('database', 'pooling', True);
    Result.Database.PoolMaxItems := LIniFile.ReadInteger('database', 'pool_max_items', 50);
    Result.Database.ConnectionTimeout := LIniFile.ReadInteger('database', 'connection_timeout', 15000);
    Result.Database.LoginTimeout := LIniFile.ReadInteger('database', 'login_timeout', 5);
    Result.Auth.Secret := LIniFile.ReadString('auth', 'secret', 'trocar-em-producao');
    Result.Auth.TokenTtlMinutes := LIniFile.ReadInteger('auth', 'token_ttl_minutes', 480);
    Result.Auth.RefreshTokenTtlMinutes := LIniFile.ReadInteger('auth', 'refresh_token_ttl_minutes', 10080);
    Result.Fiscal.ProviderMode := UpperCase(Trim(LIniFile.ReadString('fiscal', 'provider_mode', 'MOCK')));
    Result.Fiscal.Ambiente := UpperCase(Trim(LIniFile.ReadString('fiscal', 'ambiente', 'HOMOLOGACAO')));
    Result.Fiscal.CNPJ := Trim(LIniFile.ReadString('fiscal', 'cnpj', ''));
    Result.Fiscal.UF := UpperCase(Trim(LIniFile.ReadString('fiscal', 'uf', 'SP')));
    Result.Fiscal.CertificatePath := Trim(LIniFile.ReadString('fiscal', 'certificate_path', ''));
    Result.Fiscal.CertificatePassword := LIniFile.ReadString('fiscal', 'certificate_password', '');
    Result.ServerPort := LIniFile.ReadInteger('server', 'port', 9000);
  finally
    LIniFile.Free;
  end;
end;

end.
