unit ClientService;

interface

uses
  ListQueryParams;

type
  TCreateClientInput = record
    DocumentType: string;
    Document: string;
    Name: string;
    Email: string;
    Phone: string;
    IsActive: Boolean;
  end;

  TUpdateClientInput = record
    DocumentType: string;
    Document: string;
    Name: string;
    Email: string;
    Phone: string;
    IsActive: Boolean;
    HasDocumentType: Boolean;
    HasDocument: Boolean;
    HasName: Boolean;
    HasEmail: Boolean;
    HasPhone: Boolean;
    HasIsActive: Boolean;
  end;

  TClientService = class
  public
    class function ListClientsJson(const AParams: TListQueryParams): string; static;
    class function GetClientJson(const AId: Int64): string; static;
    class function CreateClient(const AInput: TCreateClientInput): Int64; static;
    class function UpdateClient(const AId: Int64; const AInput: TUpdateClientInput): Boolean; static;
    class function DeleteClient(const AId: Int64): Boolean; static;
  end;

implementation

uses
  System.SysUtils,
  System.Classes,
  System.JSON,
  FireDAC.Comp.Client,
  DBConnectionFactory;

class function TClientService.CreateClient(const AInput: TCreateClientInput): Int64;
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
      'INSERT INTO erp_clients (document_type, document, name, email, phone, is_active) ' +
      'VALUES (:document_type, :document, :name, :email, :phone, :is_active) ' +
      'RETURNING id';
    LQuery.ParamByName('document_type').AsString := UpperCase(Trim(AInput.DocumentType));
    LQuery.ParamByName('document').AsString := Trim(AInput.Document);
    LQuery.ParamByName('name').AsString := Trim(AInput.Name);
    LQuery.ParamByName('email').AsString := Trim(AInput.Email);
    LQuery.ParamByName('phone').AsString := Trim(AInput.Phone);
    LQuery.ParamByName('is_active').AsBoolean := AInput.IsActive;
    LQuery.Open;
    Result := LQuery.Fields[0].AsLargeInt;
  finally
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TClientService.DeleteClient(const AId: Int64): Boolean;
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
      'UPDATE erp_clients SET is_active = FALSE WHERE id = :id RETURNING id';
    LQuery.ParamByName('id').AsLargeInt := AId;
    LQuery.Open;
    Result := not LQuery.IsEmpty;
  finally
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TClientService.GetClientJson(const AId: Int64): string;
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
      'SELECT id, document_type, document, name, email, phone, is_active, created_at ' +
      'FROM erp_clients WHERE id = :id LIMIT 1';
    LQuery.ParamByName('id').AsLargeInt := AId;
    LQuery.Open;
    if LQuery.IsEmpty then
      Exit;

    LItem := TJSONObject.Create;
    try
      LItem.AddPair('id', TJSONNumber.Create(LQuery.FieldByName('id').AsLargeInt));
      LItem.AddPair('document_type', LQuery.FieldByName('document_type').AsString);
      LItem.AddPair('document', LQuery.FieldByName('document').AsString);
      LItem.AddPair('name', LQuery.FieldByName('name').AsString);
      LItem.AddPair('email', LQuery.FieldByName('email').AsString);
      LItem.AddPair('phone', LQuery.FieldByName('phone').AsString);
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

class function TClientService.ListClientsJson(const AParams: TListQueryParams): string;
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
    if SameText(AValue, 'document') then Exit('document');
    if SameText(AValue, 'document_type') then Exit('document_type');
    if SameText(AValue, 'name') then Exit('name');
    if SameText(AValue, 'email') then Exit('email');
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
    if Trim(AParams.DocumentType) <> '' then
      LConditions.Add('UPPER(document_type) = :document_type');
    if AParams.IsActiveSet then
      LConditions.Add('is_active = :is_active');
    if Trim(AParams.Q) <> '' then
      LConditions.Add('(document ILIKE :q OR name ILIKE :q OR email ILIKE :q OR phone ILIKE :q)');

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
      'SELECT COUNT(*) AS total FROM erp_clients' + LWhere;
    if Trim(AParams.DocumentType) <> '' then
      LCountQuery.ParamByName('document_type').AsString := UpperCase(Trim(AParams.DocumentType));
    if AParams.IsActiveSet then
      LCountQuery.ParamByName('is_active').AsBoolean := AParams.IsActive;
    if Trim(AParams.Q) <> '' then
      LCountQuery.ParamByName('q').AsString := LLike;
    LCountQuery.Open;
    LTotal := LCountQuery.FieldByName('total').AsLargeInt;
    LCountQuery.Close;

    LQuery.Connection := LConnection;
    LQuery.SQL.Text :=
      'SELECT id, document_type, document, name, email, phone, is_active, created_at ' +
      'FROM erp_clients ' + LWhere + ' ' +
      'ORDER BY ' + LSortBy + ' ' + LSortDir + ' ' +
      'LIMIT :limit OFFSET :offset';
    if Trim(AParams.DocumentType) <> '' then
      LQuery.ParamByName('document_type').AsString := UpperCase(Trim(AParams.DocumentType));
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
      LItem.AddPair('document_type', LQuery.FieldByName('document_type').AsString);
      LItem.AddPair('document', LQuery.FieldByName('document').AsString);
      LItem.AddPair('name', LQuery.FieldByName('name').AsString);
      LItem.AddPair('email', LQuery.FieldByName('email').AsString);
      LItem.AddPair('phone', LQuery.FieldByName('phone').AsString);
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
    if Trim(AParams.DocumentType) = '' then
      LFilters.AddPair('document_type', TJSONNull.Create)
    else
      LFilters.AddPair('document_type', UpperCase(Trim(AParams.DocumentType)));
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

class function TClientService.UpdateClient(const AId: Int64; const AInput: TUpdateClientInput): Boolean;
var
  LConnection: TFDConnection;
  LFields: TStringList;
  LSql: string;
  LQuery: TFDQuery;
  I: Integer;
begin
  Result := False;
  LConnection := TConnectionFactory.NewConnection;
  LFields := TStringList.Create;
  LQuery := TFDQuery.Create(nil);
  try
    if AInput.HasDocumentType then LFields.Add('document_type = :document_type');
    if AInput.HasDocument then LFields.Add('document = :document');
    if AInput.HasName then LFields.Add('name = :name');
    if AInput.HasEmail then LFields.Add('email = :email');
    if AInput.HasPhone then LFields.Add('phone = :phone');
    if AInput.HasIsActive then LFields.Add('is_active = :is_active');
    if LFields.Count = 0 then Exit(False);

    LSql := 'UPDATE erp_clients SET ';
    for I := 0 to LFields.Count - 1 do
    begin
      if I > 0 then LSql := LSql + ', ';
      LSql := LSql + LFields[I];
    end;
    LSql := LSql + ' WHERE id = :id RETURNING id';

    LQuery.Connection := LConnection;
    LQuery.SQL.Text := LSql;
    if AInput.HasDocumentType then LQuery.ParamByName('document_type').AsString := UpperCase(Trim(AInput.DocumentType));
    if AInput.HasDocument then LQuery.ParamByName('document').AsString := Trim(AInput.Document);
    if AInput.HasName then LQuery.ParamByName('name').AsString := Trim(AInput.Name);
    if AInput.HasEmail then LQuery.ParamByName('email').AsString := Trim(AInput.Email);
    if AInput.HasPhone then LQuery.ParamByName('phone').AsString := Trim(AInput.Phone);
    if AInput.HasIsActive then LQuery.ParamByName('is_active').AsBoolean := AInput.IsActive;
    LQuery.ParamByName('id').AsLargeInt := AId;
    LQuery.Open;
    Result := not LQuery.IsEmpty;
  finally
    LQuery.Free;
    LFields.Free;
    LConnection.Free;
  end;
end;

end.
