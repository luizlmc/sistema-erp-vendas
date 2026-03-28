unit AuditService;

interface

type
  TAuditEntry = record
    UserId: Int64;
    UserLogin: string;
    UserRole: string;
    Action: string;
    Resource: string;
    ResourceId: string;
    HttpMethod: string;
    Path: string;
    StatusCode: Integer;
    Ip: string;
    UserAgent: string;
    CorrelationId: string;
    RequestPayload: string;
  end;

  TAuditService = class
  public
    class procedure Log(const AEntry: TAuditEntry); static;
  end;

implementation

uses
  FireDAC.Comp.Client,
  DBConnectionFactory;

class procedure TAuditService.Log(const AEntry: TAuditEntry);
var
  LConnection: TFDConnection;
begin
  LConnection := TConnectionFactory.NewConnection;
  try
    LConnection.ExecSQL(
      'INSERT INTO erp_audit_log (' +
      ' user_id, user_login, user_role, action, resource, resource_id,' +
      ' http_method, path, status_code, ip, user_agent, correlation_id, request_payload' +
      ') VALUES (' +
      ' :user_id, :user_login, :user_role, :action, :resource, :resource_id,' +
      ' :http_method, :path, :status_code, :ip, :user_agent, :correlation_id, :request_payload' +
      ')',
      [
        AEntry.UserId,
        AEntry.UserLogin,
        AEntry.UserRole,
        AEntry.Action,
        AEntry.Resource,
        AEntry.ResourceId,
        AEntry.HttpMethod,
        AEntry.Path,
        AEntry.StatusCode,
        AEntry.Ip,
        AEntry.UserAgent,
        AEntry.CorrelationId,
        AEntry.RequestPayload
      ]
    );
  finally
    LConnection.Free;
  end;
end;

end.
