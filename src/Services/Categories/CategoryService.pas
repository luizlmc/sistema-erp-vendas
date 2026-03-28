unit CategoryService;

interface

uses
  ListQueryParams;

type
  TCreateCategoryInput = record
    Code: string;
    Name: string;
    IsActive: Boolean;
  end;

  TUpdateCategoryInput = record
    Code: string;
    Name: string;
    IsActive: Boolean;
    HasCode: Boolean;
    HasName: Boolean;
    HasIsActive: Boolean;
  end;

  TCategoryService = class
  public
    class function ListCategoriesJson(const AParams: TListQueryParams): string; static;
    class function GetCategoryJson(const AId: Int64): string; static;
    class function Exists(const AId: Int64): Boolean; static;
    class function CreateCategory(const AInput: TCreateCategoryInput): Int64; static;
    class function UpdateCategory(const AId: Int64; const AInput: TUpdateCategoryInput): Boolean; static;
    class function DeleteCategory(const AId: Int64): Boolean; static;
  end;

implementation

uses
  System.SysUtils,
  System.Classes,
  System.JSON,
  FireDAC.Comp.Client,
  DBConnectionFactory;

class function TCategoryService.CreateCategory(const AInput: TCreateCategoryInput): Int64;
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
      'INSERT INTO erp_categories (code, name, is_active) ' +
      'VALUES (:code, :name, :is_active) RETURNING id';
    LQuery.ParamByName('code').AsString := UpperCase(Trim(AInput.Code));
    LQuery.ParamByName('name').AsString := Trim(AInput.Name);
    LQuery.ParamByName('is_active').AsBoolean := AInput.IsActive;
    LQuery.Open;
    Result := LQuery.Fields[0].AsLargeInt;
  finally
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TCategoryService.DeleteCategory(const AId: Int64): Boolean;
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
      'UPDATE erp_categories ' +
      'SET is_active = FALSE, updated_at = NOW() ' +
      'WHERE id = :id RETURNING id';
    LQuery.ParamByName('id').AsLargeInt := AId;
    LQuery.Open;
    Result := not LQuery.IsEmpty;
  finally
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TCategoryService.Exists(const AId: Int64): Boolean;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
begin
  Result := False;
  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  try
    LQuery.Connection := LConnection;
    LQuery.SQL.Text := 'SELECT 1 FROM erp_categories WHERE id = :id LIMIT 1';
    LQuery.ParamByName('id').AsLargeInt := AId;
    LQuery.Open;
    Result := not LQuery.IsEmpty;
  finally
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TCategoryService.GetCategoryJson(const AId: Int64): string;
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
      'SELECT id, code, name, is_active, created_at, updated_at ' +
      'FROM erp_categories WHERE id = :id LIMIT 1';
    LQuery.ParamByName('id').AsLargeInt := AId;
    LQuery.Open;
    if LQuery.IsEmpty then
      Exit;

    LItem := TJSONObject.Create;
    try
      LItem.AddPair('id', TJSONNumber.Create(LQuery.FieldByName('id').AsLargeInt));
      LItem.AddPair('code', LQuery.FieldByName('code').AsString);
      LItem.AddPair('name', LQuery.FieldByName('name').AsString);
      LItem.AddPair('is_active', TJSONBool.Create(LQuery.FieldByName('is_active').AsBoolean));
      LItem.AddPair('created_at', LQuery.FieldByName('created_at').AsString);
      if LQuery.FieldByName('updated_at').IsNull then
        LItem.AddPair('updated_at', TJSONNull.Create)
      else
        LItem.AddPair('updated_at', LQuery.FieldByName('updated_at').AsString);
      Result := LItem.ToJSON;
    finally
      LItem.Free;
    end;
  finally
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TCategoryService.ListCategoriesJson(const AParams: TListQueryParams): string;
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
    if SameText(AValue, 'code') then Exit('code');
    if SameText(AValue, 'name') then Exit('name');
    if SameText(AValue, 'is_active') then Exit('is_active');
    if SameText(AValue, 'created_at') then Exit('created_at');
    if SameText(AValue, 'updated_at') then Exit('updated_at');
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
    if AParams.IsActiveSet then
      LConditions.Add('is_active = :is_active');
    if Trim(AParams.Q) <> '' then
      LConditions.Add('(code ILIKE :q OR name ILIKE :q)');

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
      'SELECT COUNT(*) AS total FROM erp_categories' + LWhere;
    if AParams.IsActiveSet then
      LCountQuery.ParamByName('is_active').AsBoolean := AParams.IsActive;
    if Trim(AParams.Q) <> '' then
      LCountQuery.ParamByName('q').AsString := LLike;
    LCountQuery.Open;
    LTotal := LCountQuery.FieldByName('total').AsLargeInt;
    LCountQuery.Close;

    LQuery.Connection := LConnection;
    LQuery.SQL.Text :=
      'SELECT id, code, name, is_active, created_at, updated_at ' +
      'FROM erp_categories ' + LWhere + ' ' +
      'ORDER BY ' + LSortBy + ' ' + LSortDir + ' ' +
      'LIMIT :limit OFFSET :offset';
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
      LItem.AddPair('code', LQuery.FieldByName('code').AsString);
      LItem.AddPair('name', LQuery.FieldByName('name').AsString);
      LItem.AddPair('is_active', TJSONBool.Create(LQuery.FieldByName('is_active').AsBoolean));
      LItem.AddPair('created_at', LQuery.FieldByName('created_at').AsString);
      if LQuery.FieldByName('updated_at').IsNull then
        LItem.AddPair('updated_at', TJSONNull.Create)
      else
        LItem.AddPair('updated_at', LQuery.FieldByName('updated_at').AsString);
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

class function TCategoryService.UpdateCategory(const AId: Int64; const AInput: TUpdateCategoryInput): Boolean;
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
    if AInput.HasCode then LFields.Add('code = :code');
    if AInput.HasName then LFields.Add('name = :name');
    if AInput.HasIsActive then LFields.Add('is_active = :is_active');
    LFields.Add('updated_at = NOW()');

    LSql := 'UPDATE erp_categories SET ';
    for I := 0 to LFields.Count - 1 do
    begin
      if I > 0 then
        LSql := LSql + ', ';
      LSql := LSql + LFields[I];
    end;
    LSql := LSql + ' WHERE id = :id RETURNING id';

    LQuery.Connection := LConnection;
    LQuery.SQL.Text := LSql;
    if AInput.HasCode then LQuery.ParamByName('code').AsString := UpperCase(Trim(AInput.Code));
    if AInput.HasName then LQuery.ParamByName('name').AsString := Trim(AInput.Name);
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
