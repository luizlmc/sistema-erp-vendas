unit JwtService;

interface

uses
  AppConfig;

type
  TJwtService = class
  public
    class function GenerateAccessToken(
      const AUserId: Int64;
      const ALogin: string;
      const ARole: string;
      const AConfig: TAppConfig
    ): string; static;
    class function TryValidateAccessToken(
      const AToken: string;
      const AConfig: TAppConfig;
      out AUserId: Int64;
      out ALogin: string;
      out ARole: string;
      out AError: string
    ): Boolean; static;
  end;

implementation

uses
  System.SysUtils,
  System.Hash,
  System.JSON,
  System.NetEncoding,
  System.DateUtils,
  System.Classes;

class function TJwtService.GenerateAccessToken(
  const AUserId: Int64;
  const ALogin: string;
  const ARole: string;
  const AConfig: TAppConfig
): string;
var
  LHeader: TJSONObject;
  LPayload: TJSONObject;
  LHeaderB64: string;
  LPayloadB64: string;
  LSigningInput: string;
  LSignature: TBytes;
  LSignatureB64: string;
  LIssuedAt: Int64;
  LExpiresAt: Int64;
begin
  LIssuedAt := DateTimeToUnix(Now, False);
  LExpiresAt := DateTimeToUnix(IncMinute(Now, AConfig.Auth.TokenTtlMinutes), False);

  LHeader := TJSONObject.Create;
  LPayload := TJSONObject.Create;
  try
    LHeader.AddPair('alg', 'HS256');
    LHeader.AddPair('typ', 'JWT');

    LPayload.AddPair('sub', TJSONNumber.Create(AUserId));
    LPayload.AddPair('login', ALogin);
    LPayload.AddPair('role', ARole);
    LPayload.AddPair('iat', TJSONNumber.Create(LIssuedAt));
    LPayload.AddPair('exp', TJSONNumber.Create(LExpiresAt));

    LHeaderB64 := TNetEncoding.Base64URL.Encode(LHeader.ToJSON);
    LPayloadB64 := TNetEncoding.Base64URL.Encode(LPayload.ToJSON);
    LSigningInput := LHeaderB64 + '.' + LPayloadB64;
    LSignature := THashSHA2.GetHMACAsBytes(
      LSigningInput,
      AConfig.Auth.Secret
    );
    LSignatureB64 := TNetEncoding.Base64URL.EncodeBytesToString(LSignature);
    Result := LSigningInput + '.' + LSignatureB64;
  finally
    LHeader.Free;
    LPayload.Free;
  end;
end;

class function TJwtService.TryValidateAccessToken(
  const AToken: string;
  const AConfig: TAppConfig;
  out AUserId: Int64;
  out ALogin: string;
  out ARole: string;
  out AError: string
): Boolean;
var
  LParts: TStringList;
  LSigningInput: string;
  LExpectedSignature: string;
  LPayloadJson: string;
  LPayloadObj: TJSONObject;
  LNowUnix: Int64;
  LExp: Int64;
begin
  Result := False;
  AUserId := 0;
  ALogin := '';
  ARole := '';
  AError := 'Token invalido.';

  LParts := TStringList.Create;
  LPayloadObj := nil;
  try
    LParts.Delimiter := '.';
    LParts.StrictDelimiter := True;
    LParts.DelimitedText := AToken;

    if LParts.Count <> 3 then
      Exit;

    LSigningInput := LParts[0] + '.' + LParts[1];
    LExpectedSignature := TNetEncoding.Base64URL.EncodeBytesToString(
      THashSHA2.GetHMACAsBytes(
        LSigningInput,
        AConfig.Auth.Secret
      )
    );
    if LExpectedSignature <> LParts[2] then
    begin
      AError := 'Assinatura do token invalida.';
      Exit;
    end;

    LPayloadJson := TEncoding.UTF8.GetString(
      TNetEncoding.Base64URL.DecodeStringToBytes(LParts[1])
    );
    LPayloadObj := TJSONObject.ParseJSONValue(LPayloadJson) as TJSONObject;
    if LPayloadObj = nil then
      Exit;

    if not LPayloadObj.TryGetValue<Int64>('sub', AUserId) then
      Exit;
    if not LPayloadObj.TryGetValue<string>('login', ALogin) then
      Exit;
    if not LPayloadObj.TryGetValue<string>('role', ARole) then
      Exit;
    if not LPayloadObj.TryGetValue<Int64>('exp', LExp) then
      Exit;

    LNowUnix := DateTimeToUnix(Now, False);
    if LExp <= LNowUnix then
    begin
      AError := 'Token expirado.';
      Exit;
    end;

    Result := True;
    AError := '';
  finally
    LPayloadObj.Free;
    LParts.Free;
  end;
end;

end.
