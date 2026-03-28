unit ReceivableService;

interface

uses
  ListQueryParams;

type
  TPaymentInput = record
    Amount: Double;
    PaymentMethod: string;
    Notes: string;
    PaymentDate: TDateTime;
    HasPaymentDate: Boolean;
  end;

  TReceivableService = class
  public
    class function ListReceivablesJson(const AParams: TListQueryParams): string; static;
    class function GetReceivableJson(const AId: Int64): string; static;
    class function RegisterPayment(const AReceivableId: Int64; const AInput: TPaymentInput): Boolean; static;
    class function ReversePayment(const AReceivableId, APaymentId: Int64; const AReason: string): Boolean; static;
    class function CancelReceivable(const AReceivableId: Int64): Boolean; static;
  end;

implementation

uses
  System.SysUtils,
  System.Classes,
  System.JSON,
  FireDAC.Comp.Client,
  DBConnectionFactory;

class function TReceivableService.ListReceivablesJson(const AParams: TListQueryParams): string;
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
    if SameText(AValue, 'status') then Exit('r.status');
    if SameText(AValue, 'client_name') then Exit('c.name');
    if SameText(AValue, 'original_amount') then Exit('r.original_amount');
    if SameText(AValue, 'paid_amount') then Exit('r.paid_amount');
    if SameText(AValue, 'balance_amount') then Exit('r.balance_amount');
    if SameText(AValue, 'due_date') then Exit('r.due_date');
    if SameText(AValue, 'created_at') then Exit('r.created_at');
    Result := 'r.id';
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
      LConditions.Add('r.client_id = :client_id');
    if AParams.OrderIdSet then
      LConditions.Add('r.order_id = :order_id');
    if Trim(AParams.Status) <> '' then
      LConditions.Add('UPPER(r.status) = :status');
    if Trim(AParams.Q) <> '' then
      LConditions.Add('(c.name ILIKE :q OR CAST(r.id AS VARCHAR) ILIKE :q OR CAST(r.order_id AS VARCHAR) ILIKE :q)');

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
      'FROM erp_accounts_receivable r ' +
      'INNER JOIN erp_clients c ON c.id = r.client_id ' +
      LWhere;
    if AParams.ClientIdSet then
      LCountQuery.ParamByName('client_id').AsLargeInt := AParams.ClientId;
    if AParams.OrderIdSet then
      LCountQuery.ParamByName('order_id').AsLargeInt := AParams.OrderId;
    if Trim(AParams.Status) <> '' then
      LCountQuery.ParamByName('status').AsString := UpperCase(Trim(AParams.Status));
    if Trim(AParams.Q) <> '' then
      LCountQuery.ParamByName('q').AsString := LLike;
    LCountQuery.Open;
    LTotal := LCountQuery.FieldByName('total').AsLargeInt;
    LCountQuery.Close;

    LQuery.Connection := LConnection;
    LQuery.SQL.Text :=
      'SELECT r.id, r.order_id, r.client_id, c.name AS client_name, r.status, r.original_amount, ' +
      ' r.paid_amount, r.balance_amount, r.due_date, r.installment_no, r.installments_total, r.payment_method, r.source, r.created_at, r.paid_at ' +
      'FROM erp_accounts_receivable r ' +
      'INNER JOIN erp_clients c ON c.id = r.client_id ' +
      LWhere + ' ' +
      'ORDER BY ' + LSortBy + ' ' + LSortDir + ' ' +
      'LIMIT :limit OFFSET :offset';
    if AParams.ClientIdSet then
      LQuery.ParamByName('client_id').AsLargeInt := AParams.ClientId;
    if AParams.OrderIdSet then
      LQuery.ParamByName('order_id').AsLargeInt := AParams.OrderId;
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
      LItem.AddPair('order_id', TJSONNumber.Create(LQuery.FieldByName('order_id').AsLargeInt));
      LItem.AddPair('client_id', TJSONNumber.Create(LQuery.FieldByName('client_id').AsLargeInt));
      LItem.AddPair('client_name', LQuery.FieldByName('client_name').AsString);
      LItem.AddPair('status', LQuery.FieldByName('status').AsString);
      LItem.AddPair('original_amount', TJSONNumber.Create(LQuery.FieldByName('original_amount').AsFloat));
      LItem.AddPair('paid_amount', TJSONNumber.Create(LQuery.FieldByName('paid_amount').AsFloat));
      LItem.AddPair('balance_amount', TJSONNumber.Create(LQuery.FieldByName('balance_amount').AsFloat));
      LItem.AddPair('due_date', LQuery.FieldByName('due_date').AsString);
      LItem.AddPair('installment_no', TJSONNumber.Create(LQuery.FieldByName('installment_no').AsInteger));
      LItem.AddPair('installments_total', TJSONNumber.Create(LQuery.FieldByName('installments_total').AsInteger));
      LItem.AddPair('payment_method', LQuery.FieldByName('payment_method').AsString);
      LItem.AddPair('source', LQuery.FieldByName('source').AsString);
      LItem.AddPair('created_at', LQuery.FieldByName('created_at').AsString);
      if LQuery.FieldByName('paid_at').IsNull then
        LItem.AddPair('paid_at', TJSONNull.Create)
      else
        LItem.AddPair('paid_at', LQuery.FieldByName('paid_at').AsString);
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

    LSort.AddPair('by', StringReplace(StringReplace(LSortBy, 'r.', '', [rfReplaceAll]), 'c.', '', [rfReplaceAll]));
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
    if AParams.OrderIdSet then
      LFilters.AddPair('order_id', TJSONNumber.Create(AParams.OrderId))
    else
      LFilters.AddPair('order_id', TJSONNull.Create);

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

class function TReceivableService.GetReceivableJson(const AId: Int64): string;
var
  LConnection: TFDConnection;
  LReceivableQuery: TFDQuery;
  LPaymentsQuery: TFDQuery;
  LObj: TJSONObject;
  LArr: TJSONArray;
  LPayment: TJSONObject;
begin
  Result := '';
  LConnection := TConnectionFactory.NewConnection;
  LReceivableQuery := TFDQuery.Create(nil);
  LPaymentsQuery := TFDQuery.Create(nil);
  try
    LReceivableQuery.Connection := LConnection;
    LReceivableQuery.SQL.Text :=
      'SELECT r.id, r.order_id, r.client_id, c.name AS client_name, r.status, r.original_amount, ' +
      ' r.paid_amount, r.balance_amount, r.due_date, r.installment_no, r.installments_total, r.payment_method, r.source, r.created_at, r.paid_at ' +
      'FROM erp_accounts_receivable r ' +
      'INNER JOIN erp_clients c ON c.id = r.client_id ' +
      'WHERE r.id = :id LIMIT 1';
    LReceivableQuery.ParamByName('id').AsLargeInt := AId;
    LReceivableQuery.Open;
    if LReceivableQuery.IsEmpty then
      Exit;

    LObj := TJSONObject.Create;
    try
      LObj.AddPair('id', TJSONNumber.Create(LReceivableQuery.FieldByName('id').AsLargeInt));
      LObj.AddPair('order_id', TJSONNumber.Create(LReceivableQuery.FieldByName('order_id').AsLargeInt));
      LObj.AddPair('client_id', TJSONNumber.Create(LReceivableQuery.FieldByName('client_id').AsLargeInt));
      LObj.AddPair('client_name', LReceivableQuery.FieldByName('client_name').AsString);
      LObj.AddPair('status', LReceivableQuery.FieldByName('status').AsString);
      LObj.AddPair('original_amount', TJSONNumber.Create(LReceivableQuery.FieldByName('original_amount').AsFloat));
      LObj.AddPair('paid_amount', TJSONNumber.Create(LReceivableQuery.FieldByName('paid_amount').AsFloat));
      LObj.AddPair('balance_amount', TJSONNumber.Create(LReceivableQuery.FieldByName('balance_amount').AsFloat));
      LObj.AddPair('due_date', LReceivableQuery.FieldByName('due_date').AsString);
      LObj.AddPair('installment_no', TJSONNumber.Create(LReceivableQuery.FieldByName('installment_no').AsInteger));
      LObj.AddPair('installments_total', TJSONNumber.Create(LReceivableQuery.FieldByName('installments_total').AsInteger));
      LObj.AddPair('payment_method', LReceivableQuery.FieldByName('payment_method').AsString);
      LObj.AddPair('source', LReceivableQuery.FieldByName('source').AsString);
      LObj.AddPair('created_at', LReceivableQuery.FieldByName('created_at').AsString);
      if LReceivableQuery.FieldByName('paid_at').IsNull then
        LObj.AddPair('paid_at', TJSONNull.Create)
      else
        LObj.AddPair('paid_at', LReceivableQuery.FieldByName('paid_at').AsString);

      LArr := TJSONArray.Create;
      LPaymentsQuery.Connection := LConnection;
      LPaymentsQuery.SQL.Text :=
        'SELECT id, amount, payment_date, payment_method, notes, created_at, is_reversed, reversed_at, reversed_reason ' +
        'FROM erp_receivable_payments WHERE receivable_id = :receivable_id ORDER BY id';
      LPaymentsQuery.ParamByName('receivable_id').AsLargeInt := AId;
      LPaymentsQuery.Open;
      while not LPaymentsQuery.Eof do
      begin
        LPayment := TJSONObject.Create;
        LPayment.AddPair('id', TJSONNumber.Create(LPaymentsQuery.FieldByName('id').AsLargeInt));
        LPayment.AddPair('amount', TJSONNumber.Create(LPaymentsQuery.FieldByName('amount').AsFloat));
        LPayment.AddPair('payment_date', LPaymentsQuery.FieldByName('payment_date').AsString);
        LPayment.AddPair('payment_method', LPaymentsQuery.FieldByName('payment_method').AsString);
        LPayment.AddPair('notes', LPaymentsQuery.FieldByName('notes').AsString);
        LPayment.AddPair('created_at', LPaymentsQuery.FieldByName('created_at').AsString);
        LPayment.AddPair('is_reversed', TJSONBool.Create(LPaymentsQuery.FieldByName('is_reversed').AsBoolean));
        if LPaymentsQuery.FieldByName('reversed_at').IsNull then
          LPayment.AddPair('reversed_at', TJSONNull.Create)
        else
          LPayment.AddPair('reversed_at', LPaymentsQuery.FieldByName('reversed_at').AsString);
        if LPaymentsQuery.FieldByName('reversed_reason').IsNull then
          LPayment.AddPair('reversed_reason', TJSONNull.Create)
        else
          LPayment.AddPair('reversed_reason', LPaymentsQuery.FieldByName('reversed_reason').AsString);
        LArr.AddElement(LPayment);
        LPaymentsQuery.Next;
      end;
      LObj.AddPair('payments', LArr);

      Result := LObj.ToJSON;
    finally
      LObj.Free;
    end;
  finally
    LPaymentsQuery.Free;
    LReceivableQuery.Free;
    LConnection.Free;
  end;
end;

class function TReceivableService.RegisterPayment(const AReceivableId: Int64; const AInput: TPaymentInput): Boolean;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
  LStatus: string;
  LPaidAmount: Double;
  LBalanceAmount: Double;
  LNewPaid: Double;
  LNewBalance: Double;
  LNewStatus: string;
  LPaymentDate: TDateTime;
begin
  Result := False;
  if AInput.Amount <= 0 then
    raise Exception.Create('Valor de pagamento deve ser maior que zero.');
  if Trim(AInput.PaymentMethod) = '' then
    raise Exception.Create('payment_method e obrigatorio.');

  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  try
    LConnection.StartTransaction;
    try
      LQuery.Connection := LConnection;
      LQuery.SQL.Text :=
        'SELECT status, paid_amount, balance_amount FROM erp_accounts_receivable ' +
        'WHERE id = :id FOR UPDATE';
      LQuery.ParamByName('id').AsLargeInt := AReceivableId;
      LQuery.Open;
      if LQuery.IsEmpty then
      begin
        LConnection.Rollback;
        Exit(False);
      end;

      LStatus := UpperCase(LQuery.FieldByName('status').AsString);
      LPaidAmount := LQuery.FieldByName('paid_amount').AsFloat;
      LBalanceAmount := LQuery.FieldByName('balance_amount').AsFloat;
      LQuery.Close;

      if not ((LStatus = 'OPEN') or (LStatus = 'PARTIAL')) then
        raise Exception.Create('Apenas titulos em aberto/parcial podem receber pagamento.');
      if AInput.Amount > LBalanceAmount then
        raise Exception.CreateFmt('Pagamento maior que saldo. Saldo atual: %.2f', [LBalanceAmount]);

      LNewPaid := LPaidAmount + AInput.Amount;
      LNewBalance := LBalanceAmount - AInput.Amount;
      if LNewBalance <= 0.00001 then
      begin
        LNewBalance := 0;
        LNewStatus := 'PAID';
      end
      else
        LNewStatus := 'PARTIAL';

      if AInput.HasPaymentDate then
        LPaymentDate := AInput.PaymentDate
      else
        LPaymentDate := Date;

      LQuery.SQL.Text :=
        'INSERT INTO erp_receivable_payments (receivable_id, amount, payment_date, payment_method, notes) ' +
        'VALUES (:receivable_id, :amount, :payment_date, :payment_method, :notes)';
      LQuery.ParamByName('receivable_id').AsLargeInt := AReceivableId;
      LQuery.ParamByName('amount').AsFloat := AInput.Amount;
      LQuery.ParamByName('payment_date').AsDate := LPaymentDate;
      LQuery.ParamByName('payment_method').AsString := UpperCase(Trim(AInput.PaymentMethod));
      LQuery.ParamByName('notes').AsString := Trim(AInput.Notes);
      LQuery.ExecSQL;

      LQuery.SQL.Text :=
        'UPDATE erp_accounts_receivable ' +
        'SET status = :status, paid_amount = :paid_amount, balance_amount = :balance_amount, ' +
        ' paid_at = CASE WHEN :status = ''PAID'' THEN NOW() ELSE NULL END ' +
        'WHERE id = :id';
      LQuery.ParamByName('status').AsString := LNewStatus;
      LQuery.ParamByName('paid_amount').AsFloat := LNewPaid;
      LQuery.ParamByName('balance_amount').AsFloat := LNewBalance;
      LQuery.ParamByName('id').AsLargeInt := AReceivableId;
      LQuery.ExecSQL;

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

class function TReceivableService.ReversePayment(const AReceivableId, APaymentId: Int64; const AReason: string): Boolean;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
  LAmount: Double;
  LPaidAmount: Double;
  LBalanceAmount: Double;
  LOriginalAmount: Double;
  LNewPaid: Double;
  LNewBalance: Double;
  LNewStatus: string;
begin
  Result := False;
  if Trim(AReason) = '' then
    raise Exception.Create('Motivo do estorno e obrigatorio.');

  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  try
    LConnection.StartTransaction;
    try
      LQuery.Connection := LConnection;
      LQuery.SQL.Text :=
        'SELECT id, amount, is_reversed FROM erp_receivable_payments ' +
        'WHERE id = :payment_id AND receivable_id = :receivable_id FOR UPDATE';
      LQuery.ParamByName('payment_id').AsLargeInt := APaymentId;
      LQuery.ParamByName('receivable_id').AsLargeInt := AReceivableId;
      LQuery.Open;
      if LQuery.IsEmpty then
      begin
        LConnection.Rollback;
        Exit(False);
      end;
      if LQuery.FieldByName('is_reversed').AsBoolean then
        raise Exception.Create('Pagamento ja estornado.');
      LAmount := LQuery.FieldByName('amount').AsFloat;
      LQuery.Close;

      LQuery.SQL.Text :=
        'SELECT original_amount, paid_amount, balance_amount, status ' +
        'FROM erp_accounts_receivable WHERE id = :id FOR UPDATE';
      LQuery.ParamByName('id').AsLargeInt := AReceivableId;
      LQuery.Open;
      if LQuery.IsEmpty then
      begin
        LConnection.Rollback;
        Exit(False);
      end;
      if SameText(LQuery.FieldByName('status').AsString, 'CANCELED') then
        raise Exception.Create('Titulo cancelado nao permite estorno.');
      LOriginalAmount := LQuery.FieldByName('original_amount').AsFloat;
      LPaidAmount := LQuery.FieldByName('paid_amount').AsFloat;
      LBalanceAmount := LQuery.FieldByName('balance_amount').AsFloat;
      LQuery.Close;

      LNewPaid := LPaidAmount - LAmount;
      if LNewPaid < 0 then LNewPaid := 0;
      LNewBalance := LBalanceAmount + LAmount;
      if LNewBalance > LOriginalAmount then LNewBalance := LOriginalAmount;

      if LNewPaid <= 0.00001 then
      begin
        LNewPaid := 0;
        LNewStatus := 'OPEN';
      end
      else
        LNewStatus := 'PARTIAL';

      LQuery.SQL.Text :=
        'UPDATE erp_receivable_payments ' +
        'SET is_reversed = TRUE, reversed_at = NOW(), reversed_reason = :reason ' +
        'WHERE id = :payment_id AND receivable_id = :receivable_id';
      LQuery.ParamByName('reason').AsString := Trim(AReason);
      LQuery.ParamByName('payment_id').AsLargeInt := APaymentId;
      LQuery.ParamByName('receivable_id').AsLargeInt := AReceivableId;
      LQuery.ExecSQL;

      LQuery.SQL.Text :=
        'UPDATE erp_accounts_receivable ' +
        'SET status = :status, paid_amount = :paid_amount, balance_amount = :balance_amount, paid_at = NULL ' +
        'WHERE id = :id';
      LQuery.ParamByName('status').AsString := LNewStatus;
      LQuery.ParamByName('paid_amount').AsFloat := LNewPaid;
      LQuery.ParamByName('balance_amount').AsFloat := LNewBalance;
      LQuery.ParamByName('id').AsLargeInt := AReceivableId;
      LQuery.ExecSQL;

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

class function TReceivableService.CancelReceivable(const AReceivableId: Int64): Boolean;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
  LStatus: string;
  LPaidAmount: Double;
begin
  Result := False;
  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  try
    LConnection.StartTransaction;
    try
      LQuery.Connection := LConnection;
      LQuery.SQL.Text :=
        'SELECT status, paid_amount FROM erp_accounts_receivable WHERE id = :id FOR UPDATE';
      LQuery.ParamByName('id').AsLargeInt := AReceivableId;
      LQuery.Open;
      if LQuery.IsEmpty then
      begin
        LConnection.Rollback;
        Exit(False);
      end;

      LStatus := UpperCase(LQuery.FieldByName('status').AsString);
      LPaidAmount := LQuery.FieldByName('paid_amount').AsFloat;
      LQuery.Close;

      if LStatus = 'CANCELED' then
      begin
        LConnection.Rollback;
        Exit(False);
      end;
      if LPaidAmount > 0.00001 then
        raise Exception.Create('Titulo com pagamentos nao pode ser cancelado.');

      LQuery.SQL.Text :=
        'UPDATE erp_accounts_receivable ' +
        'SET status = ''CANCELED'', canceled_at = NOW(), balance_amount = 0 ' +
        'WHERE id = :id';
      LQuery.ParamByName('id').AsLargeInt := AReceivableId;
      LQuery.ExecSQL;

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

end.
