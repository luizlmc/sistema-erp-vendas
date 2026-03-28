unit AuthMiddleware;

interface

uses
  AppConfig,
  Horse;

type
  TAuthMiddleware = class
  strict private
    class var FConfig: TAppConfig;
    class function InternalAuthorize(
      AReq: THorseRequest;
      ARes: THorseResponse;
      const ARequiredRole: string = '';
      const ARequiredPermission: string = ''
    ): Boolean; static;
  public
    class procedure Register(const AConfig: TAppConfig); static;
    class function Authorize(AReq: THorseRequest; ARes: THorseResponse): Boolean; static;
    class function AuthorizeRole(AReq: THorseRequest; ARes: THorseResponse; const ARequiredRole: string): Boolean; static;
    class function AuthorizePermission(AReq: THorseRequest; ARes: THorseResponse; const APermissionCode: string): Boolean; static;
  end;

implementation

uses
  System.SysUtils,
  JwtService,
  AuthSession,
  PermissionService;

class function TAuthMiddleware.Authorize(AReq: THorseRequest; ARes: THorseResponse): Boolean;
begin
  Result := InternalAuthorize(AReq, ARes);
end;

class function TAuthMiddleware.AuthorizeRole(AReq: THorseRequest; ARes: THorseResponse; const ARequiredRole: string): Boolean;
begin
  Result := InternalAuthorize(AReq, ARes, ARequiredRole);
end;

class function TAuthMiddleware.AuthorizePermission(AReq: THorseRequest; ARes: THorseResponse; const APermissionCode: string): Boolean;
begin
  Result := InternalAuthorize(AReq, ARes, '', APermissionCode);
end;

class function TAuthMiddleware.InternalAuthorize(
  AReq: THorseRequest;
  ARes: THorseResponse;
  const ARequiredRole: string;
  const ARequiredPermission: string
): Boolean;
var
  LAuthHeader: string;
  LToken: string;
  LUserId: Int64;
  LLogin: string;
  LRole: string;
  LError: string;
begin
  Result := False;
  LAuthHeader := Trim(AReq.Headers['Authorization']);
  if not SameText(Copy(LAuthHeader, 1, 7), 'Bearer ') then
  begin
    ARes
      .Status(401)
      .ContentType('application/json')
      .Send('{"status":"error","message":"Token Bearer nao informado."}');
    Exit;
  end;

  LToken := Trim(Copy(LAuthHeader, 8, MaxInt));
  if not TJwtService.TryValidateAccessToken(
    LToken,
    FConfig,
    LUserId,
    LLogin,
    LRole,
    LError
  ) then
  begin
    ARes
      .Status(401)
      .ContentType('application/json')
      .Send('{"status":"error","message":"' + LError + '"}');
    Exit;
  end;

  if (ARequiredRole <> '') and (not SameText(LRole, ARequiredRole)) then
  begin
    ARes
      .Status(403)
      .ContentType('application/json')
      .Send('{"status":"error","message":"Acesso negado para este recurso."}');
    Exit;
  end;

  if (Trim(ARequiredPermission) <> '') and
     (not TPermissionService.UserHasPermission(LUserId, LRole, ARequiredPermission)) then
  begin
    ARes
      .Status(403)
      .ContentType('application/json')
      .Send('{"status":"error","message":"Permissao insuficiente para este recurso."}');
    Exit;
  end;

  AReq.Sessions.SetSession(TAuthSession, TAuthSession.Create(LUserId, LLogin, LRole));
  Result := True;
end;

class procedure TAuthMiddleware.Register(const AConfig: TAppConfig);
begin
  FConfig := AConfig;
  THorse.Use(
    procedure(AReq: THorseRequest; ARes: THorseResponse; ANext: TNextProc)
    var
      LPath: string;
    begin
      LPath := LowerCase(AReq.RawWebRequest.RawPathInfo);
      if Pos('/api/v1/users', LPath) <> 1 then
      begin
        ANext;
        Exit;
      end;
      if InternalAuthorize(AReq, ARes) then
        ANext;
    end
  );
end;

end.
