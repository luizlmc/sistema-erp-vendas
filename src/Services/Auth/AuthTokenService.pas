unit AuthTokenService;

interface

uses
  AppConfig;

type
  TAuthTokenService = class
  public
    class function GenerateToken(
      const AUserId: Int64;
      const ALogin: string;
      const AConfig: TAppConfig
    ): string; static;
  end;

implementation

uses
  System.SysUtils,
  System.NetEncoding,
  System.Hash,
  System.DateUtils;

class function TAuthTokenService.GenerateToken(
  const AUserId: Int64;
  const ALogin: string;
  const AConfig: TAppConfig
): string;
var
  LIssuedAt: Int64;
  LExpiresAt: Int64;
  LPayload: string;
  LSignature: string;
begin
  LIssuedAt := DateTimeToUnix(Now, False);
  LExpiresAt := DateTimeToUnix(IncMinute(Now, AConfig.Auth.TokenTtlMinutes), False);
  LPayload := Format('%d|%s|%d|%d', [AUserId, ALogin, LIssuedAt, LExpiresAt]);
  LSignature := THashSHA2.GetHashString(LPayload + '|' + AConfig.Auth.Secret);
  Result := TNetEncoding.Base64URL.Encode(LPayload + '|' + LSignature);
end;

end.
