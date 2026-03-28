unit QuoteService;

interface

uses
  ListQueryParams;

type
  TQuoteItemInput = record
    ProductId: Int64;
    Quantity: Double;
  end;

  TCreateQuoteInput = record
    ClientId: Int64;
    Notes: string;
    CreatedByUserId: Int64;
    Items: TArray<TQuoteItemInput>;
  end;

  TUpdateQuoteInput = record
    ClientId: Int64;
    Notes: string;
    UpdatedByUserId: Int64;
    Items: TArray<TQuoteItemInput>;
  end;

  TQuoteService = class
  public
    class function ListQuotesJson(const AParams: TListQueryParams): string; static;
    class function GetQuoteJson(const AId: Int64): string; static;
    class function GetQuoteHistoryJson(const AId: Int64): string; static;
    class function CreateQuote(const AInput: TCreateQuoteInput): Int64; static;
    class function UpdateQuote(const AId: Int64; const AInput: TUpdateQuoteInput): Boolean; static;
    class function ApproveQuote(const AId: Int64; const AUserId: Int64 = 0): Boolean; static;
    class function RejectQuote(const AId: Int64; const AUserId: Int64 = 0): Boolean; static;
    class function CancelQuote(const AId: Int64; const AUserId: Int64 = 0): Boolean; static;
    class function ConvertQuoteToOrder(const AId: Int64; const AUserId: Int64 = 0): Int64; static;
  end;

implementation

uses
  System.SysUtils,
  System.Classes,
  System.JSON,
  FireDAC.Comp.Client,
  DBConnectionFactory;

function BuildQuoteCode(const AId: Int64): string;
begin
  Result := 'ORC-' + FormatFloat('000000', AId);
end;

function IsStatusIn(const AStatus: string; const AAllowed: array of string): Boolean;
var
  I: Integer;
begin
  Result := False;
  for I := Low(AAllowed) to High(AAllowed) do
  begin
    if SameText(AStatus, AAllowed[I]) then
      Exit(True);
  end;
end;

procedure ValidateClientActive(const AQuery: TFDQuery; const AClientId: Int64);
begin
  AQuery.SQL.Text := 'SELECT 1 FROM erp_clients WHERE id = :id AND is_active = TRUE LIMIT 1';
  AQuery.ParamByName('id').AsLargeInt := AClientId;
  AQuery.Open;
  if AQuery.IsEmpty then
    raise Exception.Create('Cliente nao encontrado ou inativo.');
  AQuery.Close;
end;

procedure LogQuoteStatus(
  const AQuery: TFDQuery;
  const AQuoteId: Int64;
  const AOldStatus: string;
  const ANewStatus: string;
  const AAction: string;
  const ANote: string;
  const AUserId: Int64
);
begin
  AQuery.SQL.Text :=
    'INSERT INTO erp_quote_status_history ' +
    '(quote_id, old_status, new_status, action, note, changed_by_user_id) ' +
    'VALUES (:quote_id, :old_status, :new_status, :action, :note, :changed_by_user_id)';
  AQuery.ParamByName('quote_id').AsLargeInt := AQuoteId;
  if Trim(AOldStatus) = '' then
    AQuery.ParamByName('old_status').Clear
  else
    AQuery.ParamByName('old_status').AsString := UpperCase(Trim(AOldStatus));
  AQuery.ParamByName('new_status').AsString := UpperCase(Trim(ANewStatus));
  AQuery.ParamByName('action').AsString := UpperCase(Trim(AAction));
  if Trim(ANote) = '' then
    AQuery.ParamByName('note').Clear
  else
    AQuery.ParamByName('note').AsString := Trim(ANote);
  if AUserId > 0 then
    AQuery.ParamByName('changed_by_user_id').AsLargeInt := AUserId
  else
    AQuery.ParamByName('changed_by_user_id').Clear;
  AQuery.ExecSQL;
end;

class function TQuoteService.ListQuotesJson(const AParams: TListQueryParams): string;
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
    if SameText(AValue, 'client_name') then Exit('c.name');
    if SameText(AValue, 'status') then Exit('q.status');
    if SameText(AValue, 'total_amount') then Exit('q.total_amount');
    if SameText(AValue, 'created_at') then Exit('q.created_at');
    if SameText(AValue, 'code') then Exit('q.code');
    Result := 'q.id';
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
    if AParams.ClientIdSet then
      LConditions.Add('q.client_id = :client_id');
    if Trim(AParams.Status) <> '' then
      LConditions.Add('UPPER(q.status) = :status');
    if Trim(AParams.Q) <> '' then
      LConditions.Add('(q.code ILIKE :q OR c.name ILIKE :q OR CAST(q.id AS VARCHAR) ILIKE :q)');

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
      'FROM erp_quotes q ' +
      'INNER JOIN erp_clients c ON c.id = q.client_id ' +
      LWhere;
    if AParams.ClientIdSet then
      LCountQuery.ParamByName('client_id').AsLargeInt := AParams.ClientId;
    if Trim(AParams.Status) <> '' then
      LCountQuery.ParamByName('status').AsString := UpperCase(Trim(AParams.Status));
    if Trim(AParams.Q) <> '' then
      LCountQuery.ParamByName('q').AsString := LLike;
    LCountQuery.Open;
    LTotal := LCountQuery.FieldByName('total').AsLargeInt;
    LCountQuery.Close;

    LQuery.Connection := LConnection;
    LQuery.SQL.Text :=
      'SELECT q.id, q.code, q.client_id, c.name AS client_name, q.status, q.total_amount, q.linked_order_id, q.created_at, ' +
      ' (SELECT COUNT(*) FROM erp_quote_items qi WHERE qi.quote_id = q.id) AS items_count ' +
      'FROM erp_quotes q ' +
      'INNER JOIN erp_clients c ON c.id = q.client_id ' +
      LWhere + ' ' +
      'ORDER BY ' + LSortBy + ' ' + LSortDir + ' ' +
      'LIMIT :limit OFFSET :offset';
    if AParams.ClientIdSet then
      LQuery.ParamByName('client_id').AsLargeInt := AParams.ClientId;
    if Trim(AParams.Status) <> '' then
      LQuery.ParamByName('status').AsString := UpperCase(Trim(AParams.Status));
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
      LItem.AddPair('client_id', TJSONNumber.Create(LQuery.FieldByName('client_id').AsLargeInt));
      LItem.AddPair('client_name', LQuery.FieldByName('client_name').AsString);
      LItem.AddPair('status', LQuery.FieldByName('status').AsString);
      LItem.AddPair('total_amount', TJSONNumber.Create(LQuery.FieldByName('total_amount').AsFloat));
      LItem.AddPair('items_count', TJSONNumber.Create(LQuery.FieldByName('items_count').AsInteger));
      if LQuery.FieldByName('linked_order_id').IsNull then
        LItem.AddPair('linked_order_id', TJSONNull.Create)
      else
        LItem.AddPair('linked_order_id', TJSONNumber.Create(LQuery.FieldByName('linked_order_id').AsLargeInt));
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

    LSort.AddPair('by', StringReplace(StringReplace(LSortBy, 'q.', '', [rfReplaceAll]), 'c.', '', [rfReplaceAll]));
    LSort.AddPair('dir', LSortDir);

    if Trim(AParams.Q) = '' then
      LFilters.AddPair('q', TJSONNull.Create)
    else
      LFilters.AddPair('q', Trim(AParams.Q));
    if Trim(AParams.Status) = '' then
      LFilters.AddPair('status', TJSONNull.Create)
    else
      LFilters.AddPair('status', UpperCase(Trim(AParams.Status)));
    if AParams.ClientIdSet then
      LFilters.AddPair('client_id', TJSONNumber.Create(AParams.ClientId))
    else
      LFilters.AddPair('client_id', TJSONNull.Create);

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

class function TQuoteService.GetQuoteJson(const AId: Int64): string;
var
  LConnection: TFDConnection;
  LQuoteQuery: TFDQuery;
  LItemsQuery: TFDQuery;
  LQuote: TJSONObject;
  LItems: TJSONArray;
  LItem: TJSONObject;
begin
  Result := '';
  LConnection := TConnectionFactory.NewConnection;
  LQuoteQuery := TFDQuery.Create(nil);
  LItemsQuery := TFDQuery.Create(nil);
  try
    LQuoteQuery.Connection := LConnection;
    LQuoteQuery.SQL.Text :=
      'SELECT q.id, q.code, q.client_id, c.name AS client_name, q.status, q.total_amount, q.notes, ' +
      ' q.linked_order_id, q.created_by_user_id, q.created_at, q.approved_at, q.rejected_at, q.canceled_at, q.converted_at ' +
      'FROM erp_quotes q ' +
      'INNER JOIN erp_clients c ON c.id = q.client_id ' +
      'WHERE q.id = :id LIMIT 1';
    LQuoteQuery.ParamByName('id').AsLargeInt := AId;
    LQuoteQuery.Open;
    if LQuoteQuery.IsEmpty then
      Exit;

    LQuote := TJSONObject.Create;
    try
      LQuote.AddPair('id', TJSONNumber.Create(LQuoteQuery.FieldByName('id').AsLargeInt));
      LQuote.AddPair('code', LQuoteQuery.FieldByName('code').AsString);
      LQuote.AddPair('client_id', TJSONNumber.Create(LQuoteQuery.FieldByName('client_id').AsLargeInt));
      LQuote.AddPair('client_name', LQuoteQuery.FieldByName('client_name').AsString);
      LQuote.AddPair('status', LQuoteQuery.FieldByName('status').AsString);
      LQuote.AddPair('total_amount', TJSONNumber.Create(LQuoteQuery.FieldByName('total_amount').AsFloat));
      LQuote.AddPair('notes', LQuoteQuery.FieldByName('notes').AsString);
      if LQuoteQuery.FieldByName('linked_order_id').IsNull then
        LQuote.AddPair('linked_order_id', TJSONNull.Create)
      else
        LQuote.AddPair('linked_order_id', TJSONNumber.Create(LQuoteQuery.FieldByName('linked_order_id').AsLargeInt));
      if LQuoteQuery.FieldByName('created_by_user_id').IsNull then
        LQuote.AddPair('created_by_user_id', TJSONNull.Create)
      else
        LQuote.AddPair('created_by_user_id', TJSONNumber.Create(LQuoteQuery.FieldByName('created_by_user_id').AsLargeInt));
      LQuote.AddPair('created_at', LQuoteQuery.FieldByName('created_at').AsString);
      if LQuoteQuery.FieldByName('approved_at').IsNull then LQuote.AddPair('approved_at', TJSONNull.Create) else LQuote.AddPair('approved_at', LQuoteQuery.FieldByName('approved_at').AsString);
      if LQuoteQuery.FieldByName('rejected_at').IsNull then LQuote.AddPair('rejected_at', TJSONNull.Create) else LQuote.AddPair('rejected_at', LQuoteQuery.FieldByName('rejected_at').AsString);
      if LQuoteQuery.FieldByName('canceled_at').IsNull then LQuote.AddPair('canceled_at', TJSONNull.Create) else LQuote.AddPair('canceled_at', LQuoteQuery.FieldByName('canceled_at').AsString);
      if LQuoteQuery.FieldByName('converted_at').IsNull then LQuote.AddPair('converted_at', TJSONNull.Create) else LQuote.AddPair('converted_at', LQuoteQuery.FieldByName('converted_at').AsString);

      LItems := TJSONArray.Create;
      LItemsQuery.Connection := LConnection;
      LItemsQuery.SQL.Text :=
        'SELECT qi.id, qi.line_no, qi.product_id, p.name AS product_name, qi.quantity, qi.unit_price, qi.line_total ' +
        'FROM erp_quote_items qi INNER JOIN erp_products p ON p.id = qi.product_id WHERE qi.quote_id = :quote_id ORDER BY qi.line_no';
      LItemsQuery.ParamByName('quote_id').AsLargeInt := AId;
      LItemsQuery.Open;
      while not LItemsQuery.Eof do
      begin
        LItem := TJSONObject.Create;
        LItem.AddPair('id', TJSONNumber.Create(LItemsQuery.FieldByName('id').AsLargeInt));
        LItem.AddPair('line_no', TJSONNumber.Create(LItemsQuery.FieldByName('line_no').AsInteger));
        LItem.AddPair('product_id', TJSONNumber.Create(LItemsQuery.FieldByName('product_id').AsLargeInt));
        LItem.AddPair('product_name', LItemsQuery.FieldByName('product_name').AsString);
        LItem.AddPair('quantity', TJSONNumber.Create(LItemsQuery.FieldByName('quantity').AsFloat));
        LItem.AddPair('unit_price', TJSONNumber.Create(LItemsQuery.FieldByName('unit_price').AsFloat));
        LItem.AddPair('line_total', TJSONNumber.Create(LItemsQuery.FieldByName('line_total').AsFloat));
        LItems.AddElement(LItem);
        LItemsQuery.Next;
      end;
      LQuote.AddPair('items', LItems);

      Result := LQuote.ToJSON;
    finally
      LQuote.Free;
    end;
  finally
    LItemsQuery.Free;
    LQuoteQuery.Free;
    LConnection.Free;
  end;
end;

class function TQuoteService.GetQuoteHistoryJson(const AId: Int64): string;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
  LRoot: TJSONObject;
  LList: TJSONArray;
  LItem: TJSONObject;
begin
  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  LRoot := TJSONObject.Create;
  LList := TJSONArray.Create;
  try
    LQuery.Connection := LConnection;
    LQuery.SQL.Text :=
      'SELECT h.id, h.old_status, h.new_status, h.action, h.note, h.changed_at, u.name AS changed_by_name ' +
      'FROM erp_quote_status_history h ' +
      'LEFT JOIN erp_users u ON u.id = h.changed_by_user_id ' +
      'WHERE h.quote_id = :quote_id ' +
      'ORDER BY h.changed_at DESC, h.id DESC';
    LQuery.ParamByName('quote_id').AsLargeInt := AId;
    LQuery.Open;

    while not LQuery.Eof do
    begin
      LItem := TJSONObject.Create;
      LItem.AddPair('id', TJSONNumber.Create(LQuery.FieldByName('id').AsLargeInt));
      if LQuery.FieldByName('old_status').IsNull then
        LItem.AddPair('old_status', TJSONNull.Create)
      else
        LItem.AddPair('old_status', LQuery.FieldByName('old_status').AsString);
      LItem.AddPair('new_status', LQuery.FieldByName('new_status').AsString);
      LItem.AddPair('action', LQuery.FieldByName('action').AsString);
      if LQuery.FieldByName('note').IsNull then
        LItem.AddPair('note', TJSONNull.Create)
      else
        LItem.AddPair('note', LQuery.FieldByName('note').AsString);
      if LQuery.FieldByName('changed_by_name').IsNull then
        LItem.AddPair('changed_by_name', TJSONNull.Create)
      else
        LItem.AddPair('changed_by_name', LQuery.FieldByName('changed_by_name').AsString);
      LItem.AddPair('changed_at', LQuery.FieldByName('changed_at').AsString);
      LList.AddElement(LItem);
      LQuery.Next;
    end;

    LRoot.AddPair('items', LList);
    LList := nil;
    Result := LRoot.ToJSON;
  finally
    if Assigned(LList) then
      LList.Free;
    LRoot.Free;
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TQuoteService.CreateQuote(const AInput: TCreateQuoteInput): Int64;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
  LQuoteId: Int64;
  LLineNo: Integer;
  LLineTotal: Double;
  LTotal: Double;
  LUnitPrice: Double;
  I: Integer;
begin
  if AInput.ClientId <= 0 then raise Exception.Create('Cliente invalido.');
  if Length(AInput.Items) = 0 then raise Exception.Create('Orcamento deve conter ao menos um item.');

  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  try
    LConnection.StartTransaction;
    try
      LQuery.Connection := LConnection;
      ValidateClientActive(LQuery, AInput.ClientId);
      LQuery.SQL.Text := 'SELECT nextval(''erp_quotes_id_seq'') AS id';
      LQuery.Open;
      LQuoteId := LQuery.FieldByName('id').AsLargeInt;
      LQuery.Close;
      LQuery.SQL.Text := 'INSERT INTO erp_quotes (id, code, client_id, status, total_amount, notes, created_by_user_id) VALUES (:id, :code, :client_id, :status, :total_amount, :notes, :created_by_user_id)';
      LQuery.ParamByName('id').AsLargeInt := LQuoteId;
      LQuery.ParamByName('code').AsString := BuildQuoteCode(LQuoteId);
      LQuery.ParamByName('client_id').AsLargeInt := AInput.ClientId;
      LQuery.ParamByName('status').AsString := 'DRAFTING';
      LQuery.ParamByName('total_amount').AsFloat := 0;
      LQuery.ParamByName('notes').AsString := Trim(AInput.Notes);
      if AInput.CreatedByUserId > 0 then LQuery.ParamByName('created_by_user_id').AsLargeInt := AInput.CreatedByUserId else LQuery.ParamByName('created_by_user_id').Clear;
      LQuery.ExecSQL;

      LLineNo := 1;
      LTotal := 0;
      for I := 0 to High(AInput.Items) do
      begin
        if AInput.Items[I].ProductId <= 0 then raise Exception.CreateFmt('Item %d com produto invalido.', [I + 1]);
        if AInput.Items[I].Quantity <= 0 then raise Exception.CreateFmt('Item %d com quantidade invalida.', [I + 1]);
        LQuery.SQL.Text := 'SELECT unit_price FROM erp_products WHERE id = :product_id AND is_active = TRUE';
        LQuery.ParamByName('product_id').AsLargeInt := AInput.Items[I].ProductId;
        LQuery.Open;
        if LQuery.IsEmpty then raise Exception.CreateFmt('Produto %d nao encontrado ou inativo.', [AInput.Items[I].ProductId]);
        LUnitPrice := LQuery.FieldByName('unit_price').AsFloat;
        LQuery.Close;
        LLineTotal := LUnitPrice * AInput.Items[I].Quantity;
        LTotal := LTotal + LLineTotal;
        LQuery.SQL.Text := 'INSERT INTO erp_quote_items (quote_id, line_no, product_id, quantity, unit_price, line_total) VALUES (:quote_id, :line_no, :product_id, :quantity, :unit_price, :line_total)';
        LQuery.ParamByName('quote_id').AsLargeInt := LQuoteId;
        LQuery.ParamByName('line_no').AsInteger := LLineNo;
        LQuery.ParamByName('product_id').AsLargeInt := AInput.Items[I].ProductId;
        LQuery.ParamByName('quantity').AsFloat := AInput.Items[I].Quantity;
        LQuery.ParamByName('unit_price').AsFloat := LUnitPrice;
        LQuery.ParamByName('line_total').AsFloat := LLineTotal;
        LQuery.ExecSQL;
        Inc(LLineNo);
      end;

      LQuery.SQL.Text := 'UPDATE erp_quotes SET total_amount = :total_amount, updated_at = NOW() WHERE id = :id';
      LQuery.ParamByName('total_amount').AsFloat := LTotal;
      LQuery.ParamByName('id').AsLargeInt := LQuoteId;
      LQuery.ExecSQL;
      LogQuoteStatus(
        LQuery,
        LQuoteId,
        '',
        'DRAFTING',
        'CREATED',
        'Orcamento criado.',
        AInput.CreatedByUserId
      );

      LConnection.Commit;
      Result := LQuoteId;
    except
      LConnection.Rollback;
      raise;
    end;
  finally
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TQuoteService.UpdateQuote(const AId: Int64; const AInput: TUpdateQuoteInput): Boolean;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
  LItemQuery: TFDQuery;
  LStatus: string;
  LLineNo: Integer;
  LLineTotal: Double;
  LUnitPrice: Double;
  LTotal: Double;
  I: Integer;
begin
  Result := False;
  if AInput.ClientId <= 0 then
    raise Exception.Create('Cliente invalido.');
  if Length(AInput.Items) = 0 then
    raise Exception.Create('Orcamento deve conter ao menos um item.');

  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  LItemQuery := TFDQuery.Create(nil);
  try
    LConnection.StartTransaction;
    try
      LQuery.Connection := LConnection;
      LItemQuery.Connection := LConnection;

      LQuery.SQL.Text := 'SELECT status FROM erp_quotes WHERE id = :id FOR UPDATE';
      LQuery.ParamByName('id').AsLargeInt := AId;
      LQuery.Open;
      if LQuery.IsEmpty then
      begin
        LConnection.Rollback;
        Exit(False);
      end;
      LStatus := UpperCase(LQuery.FieldByName('status').AsString);
      LQuery.Close;

      if IsStatusIn(LStatus, ['CONVERTED', 'CANCELED']) then
        raise Exception.Create('Orcamento convertido ou cancelado nao pode ser alterado.');

      ValidateClientActive(LQuery, AInput.ClientId);

      LQuery.SQL.Text := 'DELETE FROM erp_quote_items WHERE quote_id = :quote_id';
      LQuery.ParamByName('quote_id').AsLargeInt := AId;
      LQuery.ExecSQL;

      LLineNo := 1;
      LTotal := 0;
      for I := 0 to High(AInput.Items) do
      begin
        if AInput.Items[I].ProductId <= 0 then
          raise Exception.CreateFmt('Item %d com produto invalido.', [I + 1]);
        if AInput.Items[I].Quantity <= 0 then
          raise Exception.CreateFmt('Item %d com quantidade invalida.', [I + 1]);

        LItemQuery.SQL.Text := 'SELECT unit_price FROM erp_products WHERE id = :product_id AND is_active = TRUE';
        LItemQuery.ParamByName('product_id').AsLargeInt := AInput.Items[I].ProductId;
        LItemQuery.Open;
        if LItemQuery.IsEmpty then
          raise Exception.CreateFmt('Produto %d nao encontrado ou inativo.', [AInput.Items[I].ProductId]);
        LUnitPrice := LItemQuery.FieldByName('unit_price').AsFloat;
        LItemQuery.Close;

        LLineTotal := LUnitPrice * AInput.Items[I].Quantity;
        LTotal := LTotal + LLineTotal;

        LQuery.SQL.Text :=
          'INSERT INTO erp_quote_items (quote_id, line_no, product_id, quantity, unit_price, line_total) ' +
          'VALUES (:quote_id, :line_no, :product_id, :quantity, :unit_price, :line_total)';
        LQuery.ParamByName('quote_id').AsLargeInt := AId;
        LQuery.ParamByName('line_no').AsInteger := LLineNo;
        LQuery.ParamByName('product_id').AsLargeInt := AInput.Items[I].ProductId;
        LQuery.ParamByName('quantity').AsFloat := AInput.Items[I].Quantity;
        LQuery.ParamByName('unit_price').AsFloat := LUnitPrice;
        LQuery.ParamByName('line_total').AsFloat := LLineTotal;
        LQuery.ExecSQL;
        Inc(LLineNo);
      end;

      LQuery.SQL.Text :=
        'UPDATE erp_quotes ' +
        'SET client_id = :client_id, notes = :notes, total_amount = :total_amount, updated_at = NOW() ' +
        'WHERE id = :id';
      LQuery.ParamByName('client_id').AsLargeInt := AInput.ClientId;
      LQuery.ParamByName('notes').AsString := Trim(AInput.Notes);
      LQuery.ParamByName('total_amount').AsFloat := LTotal;
      LQuery.ParamByName('id').AsLargeInt := AId;
      LQuery.ExecSQL;

      LogQuoteStatus(
        LQuery,
        AId,
        LStatus,
        LStatus,
        'UPDATED',
        'Orcamento atualizado.',
        AInput.UpdatedByUserId
      );

      LConnection.Commit;
      Result := True;
    except
      LConnection.Rollback;
      raise;
    end;
  finally
    LItemQuery.Free;
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TQuoteService.ApproveQuote(const AId: Int64; const AUserId: Int64): Boolean;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
  LStatus: string;
begin
  Result := False;
  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  try
    LConnection.StartTransaction;
    try
      LQuery.Connection := LConnection;
      LQuery.SQL.Text := 'SELECT status FROM erp_quotes WHERE id = :id FOR UPDATE';
      LQuery.ParamByName('id').AsLargeInt := AId;
      LQuery.Open;
      if LQuery.IsEmpty then
      begin
        LConnection.Rollback;
        Exit(False);
      end;
      LStatus := UpperCase(LQuery.FieldByName('status').AsString);
      LQuery.Close;

      if not IsStatusIn(LStatus, ['DRAFTING', 'PENDING']) then
        raise Exception.Create('Somente orcamentos em digitacao ou pendentes podem ser aprovados.');

      LQuery.SQL.Text := 'UPDATE erp_quotes SET status = ''APPROVED'', approved_at = NOW(), rejected_at = NULL, updated_at = NOW() WHERE id = :id';
      LQuery.ParamByName('id').AsLargeInt := AId;
      LQuery.ExecSQL;
      LogQuoteStatus(
        LQuery,
        AId,
        LStatus,
        'APPROVED',
        'APPROVED',
        'Orcamento aprovado.',
        AUserId
      );

      LConnection.Commit;
      Result := True;
    except
      LConnection.Rollback;
      raise;
    end;
  finally
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TQuoteService.RejectQuote(const AId: Int64; const AUserId: Int64): Boolean;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
  LStatus: string;
begin
  Result := False;
  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  try
    LConnection.StartTransaction;
    try
      LQuery.Connection := LConnection;
      LQuery.SQL.Text := 'SELECT status FROM erp_quotes WHERE id = :id FOR UPDATE';
      LQuery.ParamByName('id').AsLargeInt := AId;
      LQuery.Open;
      if LQuery.IsEmpty then
      begin
        LConnection.Rollback;
        Exit(False);
      end;
      LStatus := UpperCase(LQuery.FieldByName('status').AsString);
      LQuery.Close;

      if not IsStatusIn(LStatus, ['DRAFTING', 'PENDING', 'APPROVED']) then
        raise Exception.Create('Status atual nao permite reprovar este orcamento.');

      LQuery.SQL.Text := 'UPDATE erp_quotes SET status = ''REJECTED'', rejected_at = NOW(), approved_at = NULL, updated_at = NOW() WHERE id = :id';
      LQuery.ParamByName('id').AsLargeInt := AId;
      LQuery.ExecSQL;
      LogQuoteStatus(
        LQuery,
        AId,
        LStatus,
        'REJECTED',
        'REJECTED',
        'Orcamento reprovado.',
        AUserId
      );

      LConnection.Commit;
      Result := True;
    except
      LConnection.Rollback;
      raise;
    end;
  finally
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TQuoteService.CancelQuote(const AId: Int64; const AUserId: Int64): Boolean;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
  LStatus: string;
begin
  Result := False;
  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  try
    LConnection.StartTransaction;
    try
      LQuery.Connection := LConnection;
      LQuery.SQL.Text := 'SELECT status FROM erp_quotes WHERE id = :id FOR UPDATE';
      LQuery.ParamByName('id').AsLargeInt := AId;
      LQuery.Open;
      if LQuery.IsEmpty then
      begin
        LConnection.Rollback;
        Exit(False);
      end;
      LStatus := UpperCase(LQuery.FieldByName('status').AsString);
      LQuery.Close;

      if IsStatusIn(LStatus, ['CONVERTED', 'CANCELED']) then
      begin
        LConnection.Rollback;
        Exit(False);
      end;

      LQuery.SQL.Text := 'UPDATE erp_quotes SET status = ''CANCELED'', canceled_at = NOW(), updated_at = NOW() WHERE id = :id';
      LQuery.ParamByName('id').AsLargeInt := AId;
      LQuery.ExecSQL;
      LogQuoteStatus(
        LQuery,
        AId,
        LStatus,
        'CANCELED',
        'CANCELED',
        'Orcamento cancelado.',
        AUserId
      );

      LConnection.Commit;
      Result := True;
    except
      LConnection.Rollback;
      raise;
    end;
  finally
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TQuoteService.ConvertQuoteToOrder(const AId: Int64; const AUserId: Int64): Int64;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
  LItemQuery: TFDQuery;
  LOrderId: Int64;
  LQuoteStatus: string;
  LClientId: Int64;
  LTotal: Double;
  LUnitPrice: Double;
  LStockQty: Double;
  LLineTotal: Double;
  LLineNo: Integer;
begin
  Result := 0;
  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  LItemQuery := TFDQuery.Create(nil);
  try
    LConnection.StartTransaction;
    try
      LQuery.Connection := LConnection;
      LItemQuery.Connection := LConnection;

      LQuery.SQL.Text := 'SELECT client_id, status, linked_order_id FROM erp_quotes WHERE id = :id FOR UPDATE';
      LQuery.ParamByName('id').AsLargeInt := AId;
      LQuery.Open;
      if LQuery.IsEmpty then
        raise Exception.Create('Orcamento nao encontrado.');
      LClientId := LQuery.FieldByName('client_id').AsLargeInt;
      LQuoteStatus := UpperCase(LQuery.FieldByName('status').AsString);
      if not LQuery.FieldByName('linked_order_id').IsNull then
        raise Exception.Create('Orcamento ja convertido em pedido.');
      LQuery.Close;

      if LQuoteStatus <> 'APPROVED' then
        raise Exception.Create('Somente orcamento aprovado pode ser convertido em pedido.');

      ValidateClientActive(LQuery, LClientId);

      LQuery.SQL.Text := 'INSERT INTO erp_orders (client_id, status, total_amount, notes, created_by_user_id) VALUES (:client_id, ''OPEN'', 0, :notes, NULL) RETURNING id';
      LQuery.ParamByName('client_id').AsLargeInt := LClientId;
      LQuery.ParamByName('notes').AsString := 'Gerado a partir do orcamento #' + IntToStr(AId);
      LQuery.Open;
      LOrderId := LQuery.FieldByName('id').AsLargeInt;
      LQuery.Close;

      LItemQuery.SQL.Text := 'SELECT product_id, quantity FROM erp_quote_items WHERE quote_id = :quote_id ORDER BY line_no';
      LItemQuery.ParamByName('quote_id').AsLargeInt := AId;
      LItemQuery.Open;
      if LItemQuery.IsEmpty then
        raise Exception.Create('Orcamento sem itens nao pode ser convertido.');

      LLineNo := 1;
      LTotal := 0;
      while not LItemQuery.Eof do
      begin
        LQuery.SQL.Text := 'SELECT unit_price, stock_qty FROM erp_products WHERE id = :product_id AND is_active = TRUE FOR UPDATE';
        LQuery.ParamByName('product_id').AsLargeInt := LItemQuery.FieldByName('product_id').AsLargeInt;
        LQuery.Open;
        if LQuery.IsEmpty then
          raise Exception.CreateFmt('Produto %d nao encontrado ou inativo.', [LItemQuery.FieldByName('product_id').AsLargeInt]);
        LUnitPrice := LQuery.FieldByName('unit_price').AsFloat;
        LStockQty := LQuery.FieldByName('stock_qty').AsFloat;
        LQuery.Close;

        if LStockQty < LItemQuery.FieldByName('quantity').AsFloat then
          raise Exception.CreateFmt('Estoque insuficiente para o produto %d. Disponivel: %.3f.', [LItemQuery.FieldByName('product_id').AsLargeInt, LStockQty]);

        LLineTotal := LUnitPrice * LItemQuery.FieldByName('quantity').AsFloat;
        LTotal := LTotal + LLineTotal;

        LQuery.SQL.Text := 'INSERT INTO erp_order_items (order_id, line_no, product_id, quantity, unit_price, line_total) VALUES (:order_id, :line_no, :product_id, :quantity, :unit_price, :line_total)';
        LQuery.ParamByName('order_id').AsLargeInt := LOrderId;
        LQuery.ParamByName('line_no').AsInteger := LLineNo;
        LQuery.ParamByName('product_id').AsLargeInt := LItemQuery.FieldByName('product_id').AsLargeInt;
        LQuery.ParamByName('quantity').AsFloat := LItemQuery.FieldByName('quantity').AsFloat;
        LQuery.ParamByName('unit_price').AsFloat := LUnitPrice;
        LQuery.ParamByName('line_total').AsFloat := LLineTotal;
        LQuery.ExecSQL;

        LQuery.SQL.Text := 'UPDATE erp_products SET stock_qty = stock_qty - :qty, updated_at = NOW() WHERE id = :product_id';
        LQuery.ParamByName('qty').AsFloat := LItemQuery.FieldByName('quantity').AsFloat;
        LQuery.ParamByName('product_id').AsLargeInt := LItemQuery.FieldByName('product_id').AsLargeInt;
        LQuery.ExecSQL;
        Inc(LLineNo);
        LItemQuery.Next;
      end;
      LItemQuery.Close;

      LQuery.SQL.Text := 'UPDATE erp_orders SET total_amount = :total_amount WHERE id = :id';
      LQuery.ParamByName('total_amount').AsFloat := LTotal;
      LQuery.ParamByName('id').AsLargeInt := LOrderId;
      LQuery.ExecSQL;

      LQuery.SQL.Text := 'UPDATE erp_quotes SET status = ''CONVERTED'', linked_order_id = :order_id, converted_at = NOW(), updated_at = NOW() WHERE id = :id';
      LQuery.ParamByName('order_id').AsLargeInt := LOrderId;
      LQuery.ParamByName('id').AsLargeInt := AId;
      LQuery.ExecSQL;

      LogQuoteStatus(
        LQuery,
        AId,
        LQuoteStatus,
        'CONVERTED',
        'CONVERTED',
        'Orcamento convertido em pedido.',
        AUserId
      );

      LConnection.Commit;
      Result := LOrderId;
    except
      LConnection.Rollback;
      raise;
    end;
  finally
    LItemQuery.Free;
    LQuery.Free;
    LConnection.Free;
  end;
end;

end.
