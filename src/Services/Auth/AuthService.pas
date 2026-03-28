unit AuthService;

interface

uses
  AppConfig;

type
  TLoginResult = record
    Success: Boolean;
    UserId: Int64;
    Login: string;
    FullName: string;
    Role: string;
    AccessToken: string;
    RefreshToken: string;
    ErrorMessage: string;
  end;

  TAuthService = class
  public
    class function Login(
      const ALogin: string;
      const APassword: string;
      const AConfig: TAppConfig
    ): TLoginResult; static;
    class function Refresh(
      const ARefreshToken: string;
      const AConfig: TAppConfig
    ): TLoginResult; static;
  end;

implementation

uses
  System.SysUtils,
  System.Hash,
  FireDAC.Comp.Client,
  DBConnectionFactory,
  JwtService,
  RefreshTokenService;

function BuildLoginResultFromUserId(
  const AUserId: Int64;
  const AConfig: TAppConfig
): TLoginResult;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
begin
  Result.Success := False;
  Result.UserId := 0;
  Result.Login := '';
  Result.FullName := '';
  Result.Role := '';
  Result.AccessToken := '';
  Result.RefreshToken := '';
  Result.ErrorMessage := 'Usuario invalido ou inativo.';

  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  try
    LQuery.Connection := LConnection;
    LQuery.SQL.Text :=
      'SELECT id, login, full_name, COALESCE(role, ''USER'') AS role ' +
      'FROM erp_users ' +
      'WHERE id = :id ' +
      '  AND is_active = TRUE ' +
      'LIMIT 1';
    LQuery.ParamByName('id').AsLargeInt := AUserId;
    LQuery.Open;

    if LQuery.IsEmpty then
      Exit;

    Result.Success := True;
    Result.UserId := LQuery.FieldByName('id').AsLargeInt;
    Result.Login := LQuery.FieldByName('login').AsString;
    Result.FullName := LQuery.FieldByName('full_name').AsString;
    Result.Role := LQuery.FieldByName('role').AsString;
    Result.AccessToken := TJwtService.GenerateAccessToken(
      Result.UserId,
      Result.Login,
      Result.Role,
      AConfig
    );
    Result.RefreshToken := TRefreshTokenService.IssueToken(Result.UserId, AConfig);
    Result.ErrorMessage := '';
  finally
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TAuthService.Login(
  const ALogin: string;
  const APassword: string;
  const AConfig: TAppConfig
): TLoginResult;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
  LPasswordHashSHA256: string;
  LStoredHash: string;
begin
  Result.Success := False;
  Result.UserId := 0;
  Result.Login := '';
  Result.FullName := '';
  Result.Role := '';
  Result.AccessToken := '';
  Result.RefreshToken := '';
  Result.ErrorMessage := 'Usuario ou senha invalidos.';

  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  try
    LPasswordHashSHA256 := THashSHA2.GetHashString(APassword);

    LQuery.Connection := LConnection;
    LQuery.SQL.Text :=
      'SELECT id, login, full_name, COALESCE(role, ''USER'') AS role, password_hash ' +
      'FROM erp_users ' +
      'WHERE LOWER(login) = LOWER(:login) ' +
      '  AND is_active = TRUE ' +
      '  AND ( ' +
      '        (password_hash LIKE ''$2%'' AND password_hash = crypt(:password_plain, password_hash)) ' +
      '     OR (password_hash = :password_sha256) ' +
      '      ) ' +
      'LIMIT 1';
    LQuery.ParamByName('login').AsString := Trim(ALogin);
    LQuery.ParamByName('password_plain').AsString := APassword;
    LQuery.ParamByName('password_sha256').AsString := LPasswordHashSHA256;
    LQuery.Open;

    if not LQuery.IsEmpty then
    begin
      Result.Success := True;
      Result.UserId := LQuery.FieldByName('id').AsLargeInt;
      Result.Login := LQuery.FieldByName('login').AsString;
      Result.FullName := LQuery.FieldByName('full_name').AsString;
      Result.Role := LQuery.FieldByName('role').AsString;
      Result.AccessToken := TJwtService.GenerateAccessToken(
        Result.UserId,
        Result.Login,
        Result.Role,
        AConfig
      );
      Result.RefreshToken := TRefreshTokenService.IssueToken(Result.UserId, AConfig);
      Result.ErrorMessage := '';

      LStoredHash := LQuery.FieldByName('password_hash').AsString;
      if Copy(LStoredHash, 1, 2) <> '$2' then
      begin
        LConnection.ExecSQL(
          'UPDATE erp_users ' +
          'SET password_hash = crypt(:password_plain, gen_salt(''bf'', 12)) ' +
          'WHERE id = :id',
          [APassword, Result.UserId]
        );
      end;
    end;
  finally
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TAuthService.Refresh(
  const ARefreshToken: string;
  const AConfig: TAppConfig
): TLoginResult;
var
  LUserId: Int64;
begin
  Result.Success := False;
  Result.UserId := 0;
  Result.Login := '';
  Result.FullName := '';
  Result.Role := '';
  Result.AccessToken := '';
  Result.RefreshToken := '';
  Result.ErrorMessage := 'Refresh token invalido ou expirado.';

  if not TRefreshTokenService.ConsumeToken(ARefreshToken, LUserId) then
    Exit;

  Result := BuildLoginResultFromUserId(LUserId, AConfig);
  if not Result.Success then
    Result.ErrorMessage := 'Usuario invalido ou inativo.';
end;

end.
