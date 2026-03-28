unit PermissionService;

interface

type
  TPermissionService = class
  public
    class function UserHasPermission(
      const AUserId: Int64;
      const ARole: string;
      const APermissionCode: string
    ): Boolean; static;
  end;

implementation

uses
  System.SysUtils,
  FireDAC.Comp.Client,
  DBConnectionFactory;

class function TPermissionService.UserHasPermission(
  const AUserId: Int64;
  const ARole: string;
  const APermissionCode: string
): Boolean;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
  LRole: string;
  LCode: string;
begin
  LCode := Trim(APermissionCode);
  if LCode = '' then
    Exit(True);

  LRole := UpperCase(Trim(ARole));
  if SameText(LRole, 'ADMIN') then
    Exit(True);

  if AUserId <= 0 then
    Exit(False);

  Result := False;
  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  try
    LQuery.Connection := LConnection;
    LQuery.SQL.Text :=
      'SELECT EXISTS ( ' +
      '  SELECT 1 ' +
      '  FROM erp_permissions p ' +
      '  LEFT JOIN erp_role_permissions rp ' +
      '    ON rp.permission_id = p.id ' +
      '   AND rp.role = :role ' +
      '  LEFT JOIN erp_user_permissions up ' +
      '    ON up.permission_id = p.id ' +
      '   AND up.user_id = :user_id ' +
      '  WHERE p.code = :code ' +
      '    AND COALESCE(up.is_allowed, CASE WHEN rp.permission_id IS NOT NULL THEN TRUE ELSE FALSE END) = TRUE ' +
      ') AS allowed';
    LQuery.ParamByName('role').AsString := LRole;
    LQuery.ParamByName('user_id').AsLargeInt := AUserId;
    LQuery.ParamByName('code').AsString := LCode;
    LQuery.Open;
    Result := LQuery.FieldByName('allowed').AsBoolean;
  finally
    LQuery.Free;
    LConnection.Free;
  end;
end;

end.
