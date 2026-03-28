unit AuditMiddleware;

interface

type
  TAuditMiddleware = class
  public
    class procedure Register; static;
  end;

implementation

uses
  System.SysUtils,
  Horse,
  AuthSession,
  AuditService,
  RequestContext;

function GetResourceFromPath(const APath: string): string;
var
  LPath: string;
begin
  LPath := LowerCase(APath);
  if LPath.StartsWith('/api/v1/auth') then
    Exit('auth');
  if LPath.StartsWith('/api/v1/users') then
    Exit('users');
  if LPath.StartsWith('/api/v1/clients') then
    Exit('clients');
  if LPath.StartsWith('/api/v1/categories') then
    Exit('categories');
  if LPath.StartsWith('/api/v1/orders') then
    Exit('orders');
  if LPath.StartsWith('/api/v1/receivables') then
    Exit('receivables');
  if LPath.StartsWith('/api/v1/products') then
    Exit('products');
  if LPath.StartsWith('/api/v1/companies') then
    Exit('companies');
  Result := '';
end;

function GetAction(const AMethod, APath: string): string;
var
  LMethod: string;
  LPath: string;
begin
  LMethod := UpperCase(AMethod);
  LPath := LowerCase(APath);
  if LPath = '/api/v1/auth/login' then
    Exit('LOGIN');
  if LPath = '/api/v1/auth/refresh' then
    Exit('REFRESH');
  if LPath = '/api/v1/auth/logout' then
    Exit('LOGOUT');

  if LMethod = 'GET' then Exit('READ');
  if LMethod = 'POST' then Exit('CREATE');
  if LMethod = 'PUT' then Exit('UPDATE');
  if LMethod = 'DELETE' then Exit('DELETE');
  Result := LMethod;
end;

class procedure TAuditMiddleware.Register;
begin
  THorse.Use(
    procedure(AReq: THorseRequest; ARes: THorseResponse; ANext: TNextProc)
    var
      LAudit: TAuditEntry;
      LSession: TAuthSession;
      LResource: string;
      LPayload: string;
    begin
      LResource := GetResourceFromPath(AReq.RawWebRequest.RawPathInfo);
      if LResource = '' then
      begin
        ANext;
        Exit;
      end;

      ANext;

      LAudit.UserId := 0;
      LAudit.UserLogin := '';
      LAudit.UserRole := '';
      if AReq.Sessions.TryGetSession<TAuthSession>(LSession) then
      begin
        LAudit.UserId := LSession.UserId;
        LAudit.UserLogin := LSession.Login;
        LAudit.UserRole := LSession.Role;
      end;

      LPayload := AReq.Body;
      if Length(LPayload) > 1500 then
        LPayload := Copy(LPayload, 1, 1500);

      LAudit.Action := GetAction(AReq.RawWebRequest.Method, AReq.RawWebRequest.RawPathInfo);
      LAudit.Resource := LResource;
      LAudit.ResourceId := AReq.Params['id'];
      LAudit.HttpMethod := AReq.RawWebRequest.Method;
      LAudit.Path := AReq.RawWebRequest.RawPathInfo;
      LAudit.StatusCode := ARes.Status;
      LAudit.Ip := AReq.RawWebRequest.RemoteIP;
      LAudit.UserAgent := AReq.RawWebRequest.UserAgent;
      LAudit.CorrelationId := TRequestContext.CorrelationId;
      LAudit.RequestPayload := LPayload;
      TAuditService.Log(LAudit);
    end
  );
end;

end.
