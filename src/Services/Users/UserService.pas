unit UserService;

interface

uses
  ListQueryParams;

type
  TCreateUserInput = record
    Login: string;
    FullName: string;
    Password: string;
    Role: string;
    IsActive: Boolean;
  end;

  TUpdateUserInput = record
    Login: string;
    FullName: string;
    Password: string;
    Role: string;
    IsActive: Boolean;
    HasLogin: Boolean;
    HasFullName: Boolean;
    HasPassword: Boolean;
    HasRole: Boolean;
    HasIsActive: Boolean;
  end;

  TUserService = class
  public
    class function ListUsersJson(const AParams: TListQueryParams): string; static;
    class function GetUserJson(const AId: Int64): string; static;
    class function CreateUser(const AInput: TCreateUserInput): Int64; static;
    class function UpdateUser(const AId: Int64; const AInput: TUpdateUserInput): Boolean; static;
    class function DeleteUser(const AId: Int64): Boolean; static;
  end;

implementation

uses
  System.SysUtils,
  System.Classes,
  System.JSON,
  FireDAC.Comp.Client,
  DBConnectionFactory;

class function TUserService.CreateUser(const AInput: TCreateUserInput): Int64;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
begin
  Result := 0;
  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  try
    LQuery.Connection := LConnection;
    LQuery.SQL.Text :=
      'INSERT INTO erp_users (login, full_name, password_hash, role, is_active) ' +
      'VALUES (:login, :full_name, crypt(:password_plain, gen_salt(''bf'', 12)), :role, :is_active) ' +
      'RETURNING id';
    LQuery.ParamByName('login').AsString := Trim(AInput.Login);
    LQuery.ParamByName('full_name').AsString := Trim(AInput.FullName);
    LQuery.ParamByName('password_plain').AsString := AInput.Password;
    LQuery.ParamByName('role').AsString := UpperCase(Trim(AInput.Role));
    LQuery.ParamByName('is_active').AsBoolean := AInput.IsActive;
    LQuery.Open;
    Result := LQuery.Fields[0].AsLargeInt;
  finally
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TUserService.DeleteUser(const AId: Int64): Boolean;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
begin
  Result := False;
  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  try
    LQuery.Connection := LConnection;
    LQuery.SQL.Text :=
      'UPDATE erp_users ' +
      'SET is_active = FALSE ' +
      'WHERE id = :id ' +
      'RETURNING id';
    LQuery.ParamByName('id').AsLargeInt := AId;
    LQuery.Open;
    Result := not LQuery.IsEmpty;
  finally
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TUserService.GetUserJson(const AId: Int64): string;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
  LItem: TJSONObject;
begin
  Result := '';
  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  try
    LQuery.Connection := LConnection;
    LQuery.SQL.Text :=
      'SELECT id, login, full_name, COALESCE(role, ''USER'') AS role, is_active, created_at ' +
      'FROM erp_users ' +
      'WHERE id = :id ' +
      'LIMIT 1';
    LQuery.ParamByName('id').AsLargeInt := AId;
    LQuery.Open;
    if LQuery.IsEmpty then
      Exit;

    LItem := TJSONObject.Create;
    try
      LItem.AddPair('id', TJSONNumber.Create(LQuery.FieldByName('id').AsLargeInt));
      LItem.AddPair('login', LQuery.FieldByName('login').AsString);
      LItem.AddPair('full_name', LQuery.FieldByName('full_name').AsString);
      LItem.AddPair('role', LQuery.FieldByName('role').AsString);
      LItem.AddPair('is_active', TJSONBool.Create(LQuery.FieldByName('is_active').AsBoolean));
      LItem.AddPair('created_at', LQuery.FieldByName('created_at').AsString);
      Result := LItem.ToJSON;
    finally
      LItem.Free;
    end;
  finally
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TUserService.ListUsersJson(const AParams: TListQueryParams): string;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
  LCountQuery: TFDQuery;
  LList: TJSONArray;
  LRoot: TJSONObject;
  LPagination: TJSONObject;
  LSort: TJSONObject;
  LFilters: TJSONObject;
  LItem: TJSONObject;
  LConditions: TStringList;
  LWhere: string;
  LSortBy: string;
  LSortDir: string;
  LLike: string;
  LTotal: Int64;
  LTotalPages: Int64;
  I: Integer;

  function ResolveSortBy(const AValue: string): string;
  begin
    if SameText(AValue, 'login') then Exit('login');
    if SameText(AValue, 'full_name') then Exit('full_name');
    if SameText(AValue, 'role') then Exit('role');
    if SameText(AValue, 'is_active') then Exit('is_active');
    if SameText(AValue, 'created_at') then Exit('created_at');
    Result := 'id';
  end;
begin
  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  LCountQuery := TFDQuery.Create(nil);
  LList := TJSONArray.Create;
  LRoot := TJSONObject.Create;
  LPagination := TJSONObject.Create;
  LSort := TJSONObject.Create;
  LFilters := TJSONObject.Create;
  LConditions := TStringList.Create;
  try
    if Trim(AParams.Role) <> '' then
      LConditions.Add('UPPER(COALESCE(role, ''USER'')) = :role');
    if AParams.IsActiveSet then
      LConditions.Add('is_active = :is_active');
    if Trim(AParams.Q) <> '' then
      LConditions.Add('(login ILIKE :q OR full_name ILIKE :q)');

    LWhere := '';
    if LConditions.Count > 0 then
    begin
      LWhere := ' WHERE ';
      for I := 0 to LConditions.Count - 1 do
      begin
        if I > 0 then
          LWhere := LWhere + ' AND ';
        LWhere := LWhere + LConditions[I];
      end;
    end;

    LSortBy := ResolveSortBy(AParams.SortBy);
    LSortDir := AParams.NormalizedSortDir;
    LLike := '%' + Trim(AParams.Q) + '%';

    LCountQuery.Connection := LConnection;
    LCountQuery.SQL.Text :=
      'SELECT COUNT(*) AS total ' +
      'FROM erp_users' + LWhere;
    if Trim(AParams.Role) <> '' then
      LCountQuery.ParamByName('role').AsString := UpperCase(Trim(AParams.Role));
    if AParams.IsActiveSet then
      LCountQuery.ParamByName('is_active').AsBoolean := AParams.IsActive;
    if Trim(AParams.Q) <> '' then
      LCountQuery.ParamByName('q').AsString := LLike;
    LCountQuery.Open;
    LTotal := LCountQuery.FieldByName('total').AsLargeInt;
    LCountQuery.Close;

    LQuery.Connection := LConnection;
    LQuery.SQL.Text :=
      'SELECT id, login, full_name, COALESCE(role, ''USER'') AS role, is_active, created_at ' +
      'FROM erp_users ' +
      LWhere + ' ' +
      'ORDER BY ' + LSortBy + ' ' + LSortDir + ' ' +
      'LIMIT :limit OFFSET :offset';
    if Trim(AParams.Role) <> '' then
      LQuery.ParamByName('role').AsString := UpperCase(Trim(AParams.Role));
    if AParams.IsActiveSet then
      LQuery.ParamByName('is_active').AsBoolean := AParams.IsActive;
    if Trim(AParams.Q) <> '' then
      LQuery.ParamByName('q').AsString := LLike;
    LQuery.ParamByName('limit').AsInteger := AParams.PageSize;
    LQuery.ParamByName('offset').AsInteger := AParams.Offset;
    LQuery.Open;
    while not LQuery.Eof do
    begin
      LItem := TJSONObject.Create;
      LItem.AddPair('id', TJSONNumber.Create(LQuery.FieldByName('id').AsLargeInt));
      LItem.AddPair('login', LQuery.FieldByName('login').AsString);
      LItem.AddPair('full_name', LQuery.FieldByName('full_name').AsString);
      LItem.AddPair('role', LQuery.FieldByName('role').AsString);
      LItem.AddPair('is_active', TJSONBool.Create(LQuery.FieldByName('is_active').AsBoolean));
      LItem.AddPair('created_at', LQuery.FieldByName('created_at').AsString);
      LList.AddElement(LItem);
      LQuery.Next;
    end;

    if AParams.PageSize <= 0 then
      LTotalPages := 1
    else
      LTotalPages := (LTotal + AParams.PageSize - 1) div AParams.PageSize;
    if LTotalPages = 0 then
      LTotalPages := 1;

    LPagination.AddPair('page', TJSONNumber.Create(AParams.Page));
    LPagination.AddPair('page_size', TJSONNumber.Create(AParams.PageSize));
    LPagination.AddPair('total', TJSONNumber.Create(LTotal));
    LPagination.AddPair('total_pages', TJSONNumber.Create(LTotalPages));

    LSort.AddPair('by', LSortBy);
    LSort.AddPair('dir', LSortDir);

    if Trim(AParams.Q) = '' then
      LFilters.AddPair('q', TJSONNull.Create)
    else
      LFilters.AddPair('q', Trim(AParams.Q));
    if Trim(AParams.Role) = '' then
      LFilters.AddPair('role', TJSONNull.Create)
    else
      LFilters.AddPair('role', UpperCase(Trim(AParams.Role)));
    if AParams.IsActiveSet then
      LFilters.AddPair('is_active', TJSONBool.Create(AParams.IsActive))
    else
      LFilters.AddPair('is_active', TJSONNull.Create);

    LRoot.AddPair('items', LList);
    LRoot.AddPair('pagination', LPagination);
    LRoot.AddPair('sort', LSort);
    LRoot.AddPair('filters', LFilters);
    LList := nil;
    LPagination := nil;
    LSort := nil;
    LFilters := nil;
    Result := LRoot.ToJSON;
  finally
    LConditions.Free;
    if Assigned(LFilters) then LFilters.Free;
    if Assigned(LSort) then LSort.Free;
    if Assigned(LPagination) then LPagination.Free;
    LRoot.Free;
    if Assigned(LList) then LList.Free;
    LCountQuery.Free;
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TUserService.UpdateUser(const AId: Int64; const AInput: TUpdateUserInput): Boolean;
var
  LConnection: TFDConnection;
  LFields: TStringList;
  LSql: string;
  LQuery: TFDQuery;
  I: Integer;
begin
  Result := False;
  LFields := TStringList.Create;
  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  try
    if AInput.HasLogin then
      LFields.Add('login = :login');
    if AInput.HasFullName then
      LFields.Add('full_name = :full_name');
    if AInput.HasPassword then
      LFields.Add('password_hash = crypt(:password_plain, gen_salt(''bf'', 12))');
    if AInput.HasRole then
      LFields.Add('role = :role');
    if AInput.HasIsActive then
      LFields.Add('is_active = :is_active');

    if LFields.Count = 0 then
      Exit(False);

    LSql := 'UPDATE erp_users SET ';
    for I := 0 to LFields.Count - 1 do
    begin
      if I > 0 then
        LSql := LSql + ', ';
      LSql := LSql + LFields[I];
    end;
    LSql := LSql + ' WHERE id = :id RETURNING id';
    LQuery.Connection := LConnection;
    LQuery.SQL.Text := LSql;
    if AInput.HasLogin then
      LQuery.ParamByName('login').AsString := Trim(AInput.Login);
    if AInput.HasFullName then
      LQuery.ParamByName('full_name').AsString := Trim(AInput.FullName);
    if AInput.HasPassword then
      LQuery.ParamByName('password_plain').AsString := AInput.Password;
    if AInput.HasRole then
      LQuery.ParamByName('role').AsString := UpperCase(Trim(AInput.Role));
    if AInput.HasIsActive then
      LQuery.ParamByName('is_active').AsBoolean := AInput.IsActive;
    LQuery.ParamByName('id').AsLargeInt := AId;
    LQuery.Open;
    Result := not LQuery.IsEmpty;
  finally
    LQuery.Free;
    LConnection.Free;
    LFields.Free;
  end;
end;

end.
