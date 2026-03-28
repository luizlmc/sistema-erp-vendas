unit RefreshTokenService;

interface

uses
  AppConfig;

type
  TRefreshTokenService = class
  public
    class function IssueToken(
      const AUserId: Int64;
      const AConfig: TAppConfig
    ): string; static;
    class function ConsumeToken(
      const ARefreshToken: string;
      out AUserId: Int64
    ): Boolean; static;
    class function RevokeToken(const ARefreshToken: string): Boolean; static;
  end;

implementation

uses
  System.SysUtils,
  System.Hash,
  System.DateUtils,
  FireDAC.Comp.Client,
  DBConnectionFactory;

class function TRefreshTokenService.ConsumeToken(
  const ARefreshToken: string;
  out AUserId: Int64
): Boolean;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
  LHash: string;
  LExpiresAt: TDateTime;
begin
  Result := False;
  AUserId := 0;
  LHash := THashSHA2.GetHashString(ARefreshToken);

  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  try
    LQuery.Connection := LConnection;
    LQuery.SQL.Text :=
      'SELECT user_id, expires_at, revoked_at ' +
      'FROM erp_refresh_tokens ' +
      'WHERE token_hash = :token_hash ' +
      'LIMIT 1';
    LQuery.ParamByName('token_hash').AsString := LHash;
    LQuery.Open;

    if LQuery.IsEmpty then
      Exit;

    if not LQuery.FieldByName('revoked_at').IsNull then
      Exit;

    LExpiresAt := LQuery.FieldByName('expires_at').AsDateTime;
    if LExpiresAt <= Now then
      Exit;

    AUserId := LQuery.FieldByName('user_id').AsLargeInt;
    LConnection.ExecSQL(
      'UPDATE erp_refresh_tokens ' +
      'SET revoked_at = NOW() ' +
      'WHERE token_hash = :token_hash',
      [LHash]
    );
    Result := True;
  finally
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TRefreshTokenService.IssueToken(
  const AUserId: Int64;
  const AConfig: TAppConfig
): string;
var
  LConnection: TFDConnection;
  LHash: string;
  LGuid: TGUID;
begin
  CreateGUID(LGuid);
  Result := THashSHA2.GetHashString(
    GUIDToString(LGuid) + '|' + IntToStr(DateTimeToUnix(Now, False))
  );
  LHash := THashSHA2.GetHashString(Result);

  LConnection := TConnectionFactory.NewConnection;
  try
    LConnection.ExecSQL(
      'INSERT INTO erp_refresh_tokens (user_id, token_hash, expires_at) ' +
      'VALUES (:user_id, :token_hash, :expires_at)',
      [
        AUserId,
        LHash,
        IncMinute(Now, AConfig.Auth.RefreshTokenTtlMinutes)
      ]
    );
  finally
    LConnection.Free;
  end;
end;

class function TRefreshTokenService.RevokeToken(const ARefreshToken: string): Boolean;
var
  LConnection: TFDConnection;
  LHash: string;
begin
  Result := False;
  LHash := THashSHA2.GetHashString(ARefreshToken);
  LConnection := TConnectionFactory.NewConnection;
  try
    Result := LConnection.ExecSQL(
      'UPDATE erp_refresh_tokens ' +
      'SET revoked_at = NOW() ' +
      'WHERE token_hash = :token_hash ' +
      '  AND revoked_at IS NULL',
      [LHash]
    ) > 0;
  finally
    LConnection.Free;
  end;
end;

end.
