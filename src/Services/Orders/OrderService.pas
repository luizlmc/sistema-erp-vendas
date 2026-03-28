unit OrderService;

interface

uses
  ListQueryParams;

type
  TInvoiceInput = record
    InvoiceNumber: string;
    PaymentTerm: string;
    Installments: Integer;
    FirstDueDate: TDateTime;
    HasFirstDueDate: Boolean;
    IntervalDays: Integer;
    PaymentMethod: string;
  end;

  TOrderItemInput = record
    ProductId: Int64;
    Quantity: Double;
  end;

  TCreateOrderInput = record
    ClientId: Int64;
    Notes: string;
    CreatedByUserId: Int64;
    Items: TArray<TOrderItemInput>;
  end;

  TOrderService = class
  public
    class function ListOrdersJson(const AParams: TListQueryParams): string; static;
    class function GetOrderJson(const AId: Int64): string; static;
    class function CreateOrder(const AInput: TCreateOrderInput): Int64; static;
    class function ConfirmOrder(const AId: Int64): Boolean; static;
    class function InvoiceOrder(const AId: Int64; const AInput: TInvoiceInput): Boolean; static;
    class function CancelOrder(const AId: Int64): Boolean; static;
  end;

implementation

uses
  System.SysUtils,
  System.Classes,
  System.Math,
  System.JSON,
  FireDAC.Comp.Client,
  DBConnectionFactory;

class function TOrderService.ListOrdersJson(const AParams: TListQueryParams): string;
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
    if SameText(AValue, 'status') then Exit('o.status');
    if SameText(AValue, 'total_amount') then Exit('o.total_amount');
    if SameText(AValue, 'created_at') then Exit('o.created_at');
    if SameText(AValue, 'confirmed_at') then Exit('o.confirmed_at');
    if SameText(AValue, 'invoiced_at') then Exit('o.invoiced_at');
    Result := 'o.id';
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
      LConditions.Add('o.client_id = :client_id');
    if Trim(AParams.Status) <> '' then
      LConditions.Add('UPPER(o.status) = :status');
    if Trim(AParams.Q) <> '' then
      LConditions.Add('(c.name ILIKE :q OR COALESCE(o.invoice_number, '''') ILIKE :q OR CAST(o.id AS VARCHAR) ILIKE :q)');

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
      'FROM erp_orders o ' +
      'INNER JOIN erp_clients c ON c.id = o.client_id ' +
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
      'SELECT o.id, o.client_id, c.name AS client_name, o.status, o.total_amount, o.invoice_number, ' +
      ' o.created_at, o.confirmed_at, o.invoiced_at, o.canceled_at, ' +
      ' (SELECT COUNT(*) FROM erp_order_items oi WHERE oi.order_id = o.id) AS items_count ' +
      'FROM erp_orders o ' +
      'INNER JOIN erp_clients c ON c.id = o.client_id ' +
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
      LItem.AddPair('client_id', TJSONNumber.Create(LQuery.FieldByName('client_id').AsLargeInt));
      LItem.AddPair('client_name', LQuery.FieldByName('client_name').AsString);
      LItem.AddPair('status', LQuery.FieldByName('status').AsString);
      LItem.AddPair('total_amount', TJSONNumber.Create(LQuery.FieldByName('total_amount').AsFloat));
      if LQuery.FieldByName('invoice_number').IsNull then
        LItem.AddPair('invoice_number', TJSONNull.Create)
      else
        LItem.AddPair('invoice_number', LQuery.FieldByName('invoice_number').AsString);
      LItem.AddPair('items_count', TJSONNumber.Create(LQuery.FieldByName('items_count').AsInteger));
      LItem.AddPair('created_at', LQuery.FieldByName('created_at').AsString);
      if LQuery.FieldByName('confirmed_at').IsNull then
        LItem.AddPair('confirmed_at', TJSONNull.Create)
      else
        LItem.AddPair('confirmed_at', LQuery.FieldByName('confirmed_at').AsString);
      if LQuery.FieldByName('invoiced_at').IsNull then
        LItem.AddPair('invoiced_at', TJSONNull.Create)
      else
        LItem.AddPair('invoiced_at', LQuery.FieldByName('invoiced_at').AsString);
      if LQuery.FieldByName('canceled_at').IsNull then
        LItem.AddPair('canceled_at', TJSONNull.Create)
      else
        LItem.AddPair('canceled_at', LQuery.FieldByName('canceled_at').AsString);
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

    LSort.AddPair('by', StringReplace(StringReplace(LSortBy, 'o.', '', [rfReplaceAll]), 'c.', '', [rfReplaceAll]));
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

class function TOrderService.GetOrderJson(const AId: Int64): string;
var
  LConnection: TFDConnection;
  LOrderQuery: TFDQuery;
  LItemsQuery: TFDQuery;
  LOrder: TJSONObject;
  LItems: TJSONArray;
  LItem: TJSONObject;
begin
  Result := '';
  LConnection := TConnectionFactory.NewConnection;
  LOrderQuery := TFDQuery.Create(nil);
  LItemsQuery := TFDQuery.Create(nil);
  try
    LOrderQuery.Connection := LConnection;
    LOrderQuery.SQL.Text :=
      'SELECT o.id, o.client_id, c.name AS client_name, o.status, o.total_amount, o.notes, ' +
      ' o.created_by_user_id, o.invoice_number, o.created_at, o.confirmed_at, o.invoiced_at, o.canceled_at ' +
      'FROM erp_orders o ' +
      'INNER JOIN erp_clients c ON c.id = o.client_id ' +
      'WHERE o.id = :id LIMIT 1';
    LOrderQuery.ParamByName('id').AsLargeInt := AId;
    LOrderQuery.Open;
    if LOrderQuery.IsEmpty then
      Exit;

    LOrder := TJSONObject.Create;
    try
      LOrder.AddPair('id', TJSONNumber.Create(LOrderQuery.FieldByName('id').AsLargeInt));
      LOrder.AddPair('client_id', TJSONNumber.Create(LOrderQuery.FieldByName('client_id').AsLargeInt));
      LOrder.AddPair('client_name', LOrderQuery.FieldByName('client_name').AsString);
      LOrder.AddPair('status', LOrderQuery.FieldByName('status').AsString);
      LOrder.AddPair('total_amount', TJSONNumber.Create(LOrderQuery.FieldByName('total_amount').AsFloat));
      LOrder.AddPair('notes', LOrderQuery.FieldByName('notes').AsString);
      if LOrderQuery.FieldByName('invoice_number').IsNull then
        LOrder.AddPair('invoice_number', TJSONNull.Create)
      else
        LOrder.AddPair('invoice_number', LOrderQuery.FieldByName('invoice_number').AsString);
      if LOrderQuery.FieldByName('created_by_user_id').IsNull then
        LOrder.AddPair('created_by_user_id', TJSONNull.Create)
      else
        LOrder.AddPair('created_by_user_id', TJSONNumber.Create(LOrderQuery.FieldByName('created_by_user_id').AsLargeInt));
      LOrder.AddPair('created_at', LOrderQuery.FieldByName('created_at').AsString);
      if LOrderQuery.FieldByName('confirmed_at').IsNull then
        LOrder.AddPair('confirmed_at', TJSONNull.Create)
      else
        LOrder.AddPair('confirmed_at', LOrderQuery.FieldByName('confirmed_at').AsString);
      if LOrderQuery.FieldByName('invoiced_at').IsNull then
        LOrder.AddPair('invoiced_at', TJSONNull.Create)
      else
        LOrder.AddPair('invoiced_at', LOrderQuery.FieldByName('invoiced_at').AsString);
      if LOrderQuery.FieldByName('canceled_at').IsNull then
        LOrder.AddPair('canceled_at', TJSONNull.Create)
      else
        LOrder.AddPair('canceled_at', LOrderQuery.FieldByName('canceled_at').AsString);

      LItems := TJSONArray.Create;
      LItemsQuery.Connection := LConnection;
      LItemsQuery.SQL.Text :=
        'SELECT oi.id, oi.line_no, oi.product_id, p.name AS product_name, oi.quantity, oi.unit_price, oi.line_total ' +
        'FROM erp_order_items oi ' +
        'INNER JOIN erp_products p ON p.id = oi.product_id ' +
        'WHERE oi.order_id = :order_id ' +
        'ORDER BY oi.line_no';
      LItemsQuery.ParamByName('order_id').AsLargeInt := AId;
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
      LOrder.AddPair('items', LItems);

      Result := LOrder.ToJSON;
    finally
      LOrder.Free;
    end;
  finally
    LItemsQuery.Free;
    LOrderQuery.Free;
    LConnection.Free;
  end;
end;

class function TOrderService.CreateOrder(const AInput: TCreateOrderInput): Int64;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
  LOrderId: Int64;
  LLineNo: Integer;
  LLineTotal: Double;
  LTotal: Double;
  LUnitPrice: Double;
  LStockQty: Double;
  I: Integer;
begin
  if AInput.ClientId <= 0 then
    raise Exception.Create('Cliente invalido.');
  if Length(AInput.Items) = 0 then
    raise Exception.Create('Pedido deve conter ao menos um item.');

  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  try
    LConnection.StartTransaction;
    try
      LQuery.Connection := LConnection;

      LQuery.SQL.Text := 'SELECT 1 FROM erp_clients WHERE id = :id AND is_active = TRUE LIMIT 1';
      LQuery.ParamByName('id').AsLargeInt := AInput.ClientId;
      LQuery.Open;
      if LQuery.IsEmpty then
        raise Exception.Create('Cliente nao encontrado ou inativo.');
      LQuery.Close;

      LQuery.SQL.Text :=
        'INSERT INTO erp_orders (client_id, status, total_amount, notes, created_by_user_id) ' +
        'VALUES (:client_id, :status, :total_amount, :notes, :created_by_user_id) RETURNING id';
      LQuery.ParamByName('client_id').AsLargeInt := AInput.ClientId;
      LQuery.ParamByName('status').AsString := 'OPEN';
      LQuery.ParamByName('total_amount').AsFloat := 0;
      LQuery.ParamByName('notes').AsString := Trim(AInput.Notes);
      if AInput.CreatedByUserId > 0 then
        LQuery.ParamByName('created_by_user_id').AsLargeInt := AInput.CreatedByUserId
      else
        LQuery.ParamByName('created_by_user_id').Clear;
      LQuery.Open;
      LOrderId := LQuery.Fields[0].AsLargeInt;
      LQuery.Close;

      LLineNo := 1;
      LTotal := 0;
      for I := 0 to High(AInput.Items) do
      begin
        if AInput.Items[I].ProductId <= 0 then
          raise Exception.CreateFmt('Item %d com produto invalido.', [I + 1]);
        if AInput.Items[I].Quantity <= 0 then
          raise Exception.CreateFmt('Item %d com quantidade invalida.', [I + 1]);

        LQuery.SQL.Text :=
          'SELECT unit_price, stock_qty FROM erp_products ' +
          'WHERE id = :product_id AND is_active = TRUE ' +
          'FOR UPDATE';
        LQuery.ParamByName('product_id').AsLargeInt := AInput.Items[I].ProductId;
        LQuery.Open;
        if LQuery.IsEmpty then
          raise Exception.CreateFmt('Produto %d nao encontrado ou inativo.', [AInput.Items[I].ProductId]);

        LUnitPrice := LQuery.FieldByName('unit_price').AsFloat;
        LStockQty := LQuery.FieldByName('stock_qty').AsFloat;
        LQuery.Close;

        if LStockQty < AInput.Items[I].Quantity then
          raise Exception.CreateFmt(
            'Estoque insuficiente para o produto %d. Disponivel: %.3f.',
            [AInput.Items[I].ProductId, LStockQty]
          );

        LLineTotal := LUnitPrice * AInput.Items[I].Quantity;
        LTotal := LTotal + LLineTotal;

        LQuery.SQL.Text :=
          'INSERT INTO erp_order_items (order_id, line_no, product_id, quantity, unit_price, line_total) ' +
          'VALUES (:order_id, :line_no, :product_id, :quantity, :unit_price, :line_total)';
        LQuery.ParamByName('order_id').AsLargeInt := LOrderId;
        LQuery.ParamByName('line_no').AsInteger := LLineNo;
        LQuery.ParamByName('product_id').AsLargeInt := AInput.Items[I].ProductId;
        LQuery.ParamByName('quantity').AsFloat := AInput.Items[I].Quantity;
        LQuery.ParamByName('unit_price').AsFloat := LUnitPrice;
        LQuery.ParamByName('line_total').AsFloat := LLineTotal;
        LQuery.ExecSQL;

        LQuery.SQL.Text :=
          'UPDATE erp_products SET stock_qty = stock_qty - :qty, updated_at = NOW() ' +
          'WHERE id = :product_id';
        LQuery.ParamByName('qty').AsFloat := AInput.Items[I].Quantity;
        LQuery.ParamByName('product_id').AsLargeInt := AInput.Items[I].ProductId;
        LQuery.ExecSQL;

        Inc(LLineNo);
      end;

      LQuery.SQL.Text :=
        'UPDATE erp_orders SET total_amount = :total_amount WHERE id = :id';
      LQuery.ParamByName('total_amount').AsFloat := LTotal;
      LQuery.ParamByName('id').AsLargeInt := LOrderId;
      LQuery.ExecSQL;

      LConnection.Commit;
      Result := LOrderId;
    except
      LConnection.Rollback;
      raise;
    end;
  finally
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TOrderService.ConfirmOrder(const AId: Int64): Boolean;
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
      LQuery.SQL.Text := 'SELECT status FROM erp_orders WHERE id = :id FOR UPDATE';
      LQuery.ParamByName('id').AsLargeInt := AId;
      LQuery.Open;
      if LQuery.IsEmpty then
      begin
        LConnection.Rollback;
        Exit(False);
      end;

      LStatus := UpperCase(LQuery.FieldByName('status').AsString);
      LQuery.Close;
      if LStatus = 'CONFIRMED' then
      begin
        LConnection.Rollback;
        Exit(False);
      end;
      if LStatus <> 'OPEN' then
        raise Exception.Create('Apenas pedidos em aberto podem ser confirmados.');

      LQuery.SQL.Text :=
        'UPDATE erp_orders SET status = ''CONFIRMED'', confirmed_at = NOW() WHERE id = :id';
      LQuery.ParamByName('id').AsLargeInt := AId;
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

class function TOrderService.InvoiceOrder(const AId: Int64; const AInput: TInvoiceInput): Boolean;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
  LStatus: string;
  LClientId: Int64;
  LTotalAmount: Double;
  LInstallments: Integer;
  LIntervalDays: Integer;
  LPaymentTerm: string;
  LPaymentMethod: string;
  LFirstDueDate: TDateTime;
  LInstallmentAmount: Double;
  LAccumulated: Double;
  LCurrentAmount: Double;
  LDueDate: TDateTime;
  I: Integer;
begin
  Result := False;
  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  try
    LConnection.StartTransaction;
    try
      LQuery.Connection := LConnection;
      LQuery.SQL.Text := 'SELECT status, client_id, total_amount FROM erp_orders WHERE id = :id FOR UPDATE';
      LQuery.ParamByName('id').AsLargeInt := AId;
      LQuery.Open;
      if LQuery.IsEmpty then
      begin
        LConnection.Rollback;
        Exit(False);
      end;

      LStatus := UpperCase(LQuery.FieldByName('status').AsString);
      LClientId := LQuery.FieldByName('client_id').AsLargeInt;
      LTotalAmount := LQuery.FieldByName('total_amount').AsFloat;
      LQuery.Close;
      if LStatus = 'INVOICED' then
      begin
        LConnection.Rollback;
        Exit(False);
      end;
      if not ((LStatus = 'OPEN') or (LStatus = 'CONFIRMED')) then
        raise Exception.Create('Apenas pedidos em aberto ou confirmados podem ser faturados.');

      LPaymentTerm := UpperCase(Trim(AInput.PaymentTerm));
      if LPaymentTerm = '' then
        LPaymentTerm := 'INSTALLMENT';
      if (LPaymentTerm <> 'CASH') and (LPaymentTerm <> 'INSTALLMENT') then
        raise Exception.Create('payment_term deve ser CASH ou INSTALLMENT.');

      LPaymentMethod := UpperCase(Trim(AInput.PaymentMethod));
      if LPaymentMethod = '' then
        LPaymentMethod := 'UNSPECIFIED';

      if LPaymentTerm = 'CASH' then
      begin
        LInstallments := 1;
        LIntervalDays := 0;
        LFirstDueDate := Date;
      end
      else
      begin
        LInstallments := AInput.Installments;
        if LInstallments <= 0 then
          LInstallments := 1;
        LIntervalDays := AInput.IntervalDays;
        if LIntervalDays <= 0 then
          LIntervalDays := 30;
        if AInput.HasFirstDueDate then
          LFirstDueDate := AInput.FirstDueDate
        else
          LFirstDueDate := Date + 30;
      end;

      LQuery.SQL.Text :=
        'UPDATE erp_orders ' +
        'SET status = ''INVOICED'', invoiced_at = NOW(), ' +
        ' invoice_number = COALESCE(NULLIF(:invoice_number, ''''), ''INV-'' || id::text) ' +
        'WHERE id = :id';
      LQuery.ParamByName('invoice_number').AsString := Trim(AInput.InvoiceNumber);
      LQuery.ParamByName('id').AsLargeInt := AId;
      LQuery.ExecSQL;

      LQuery.SQL.Text :=
        'SELECT COUNT(*) AS total ' +
        'FROM erp_accounts_receivable WHERE order_id = :order_id';
      LQuery.ParamByName('order_id').AsLargeInt := AId;
      LQuery.Open;
      if LQuery.FieldByName('total').AsInteger > 0 then
        raise Exception.Create('Pedido ja possui titulos em contas a receber.');
      LQuery.Close;

      if LPaymentTerm = 'CASH' then
      begin
        LQuery.SQL.Text :=
          'INSERT INTO erp_accounts_receivable (' +
          ' order_id, client_id, status, original_amount, paid_amount, balance_amount, due_date, paid_at,' +
          ' installment_no, installments_total, payment_method, source' +
          ') VALUES (' +
          ' :order_id, :client_id, ''PAID'', :original_amount, :paid_amount, 0, :due_date, NOW(),' +
          ' 1, 1, :payment_method, ''ORDER_INVOICE'' ) RETURNING id';
        LQuery.ParamByName('order_id').AsLargeInt := AId;
        LQuery.ParamByName('client_id').AsLargeInt := LClientId;
        LQuery.ParamByName('original_amount').AsFloat := LTotalAmount;
        LQuery.ParamByName('paid_amount').AsFloat := LTotalAmount;
        LQuery.ParamByName('due_date').AsDate := LFirstDueDate;
        LQuery.ParamByName('payment_method').AsString := LPaymentMethod;
        LQuery.Open;
        LQuery.Close;
      end
      else
      begin
        LInstallmentAmount := RoundTo(LTotalAmount / LInstallments, -2);
        LAccumulated := 0;
        for I := 1 to LInstallments do
        begin
          if I < LInstallments then
          begin
            LCurrentAmount := LInstallmentAmount;
            LAccumulated := LAccumulated + LCurrentAmount;
          end
          else
            LCurrentAmount := RoundTo(LTotalAmount - LAccumulated, -2);

          LDueDate := LFirstDueDate + ((I - 1) * LIntervalDays);

          LQuery.SQL.Text :=
            'INSERT INTO erp_accounts_receivable (' +
            ' order_id, client_id, status, original_amount, paid_amount, balance_amount, due_date,' +
            ' installment_no, installments_total, payment_method, source' +
            ') VALUES (' +
            ' :order_id, :client_id, ''OPEN'', :original_amount, 0, :balance_amount, :due_date,' +
            ' :installment_no, :installments_total, :payment_method, ''ORDER_INVOICE'')';
          LQuery.ParamByName('order_id').AsLargeInt := AId;
          LQuery.ParamByName('client_id').AsLargeInt := LClientId;
          LQuery.ParamByName('original_amount').AsFloat := LCurrentAmount;
          LQuery.ParamByName('balance_amount').AsFloat := LCurrentAmount;
          LQuery.ParamByName('due_date').AsDate := LDueDate;
          LQuery.ParamByName('installment_no').AsInteger := I;
          LQuery.ParamByName('installments_total').AsInteger := LInstallments;
          LQuery.ParamByName('payment_method').AsString := LPaymentMethod;
          LQuery.ExecSQL;
        end;
      end;

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

class function TOrderService.CancelOrder(const AId: Int64): Boolean;
var
  LConnection: TFDConnection;
  LOrderQuery: TFDQuery;
  LItemsQuery: TFDQuery;
  LUpdateQuery: TFDQuery;
begin
  Result := False;
  LConnection := TConnectionFactory.NewConnection;
  LOrderQuery := TFDQuery.Create(nil);
  LItemsQuery := TFDQuery.Create(nil);
  LUpdateQuery := TFDQuery.Create(nil);
  try
    LConnection.StartTransaction;
    try
      LOrderQuery.Connection := LConnection;
      LOrderQuery.SQL.Text :=
        'SELECT status FROM erp_orders WHERE id = :id FOR UPDATE';
      LOrderQuery.ParamByName('id').AsLargeInt := AId;
      LOrderQuery.Open;
      if LOrderQuery.IsEmpty then
      begin
        LConnection.Rollback;
        Exit(False);
      end;
      if SameText(LOrderQuery.FieldByName('status').AsString, 'CANCELED') then
      begin
        LConnection.Rollback;
        Exit(False);
      end;
      if SameText(LOrderQuery.FieldByName('status').AsString, 'INVOICED') then
        raise Exception.Create('Pedido faturado nao pode ser cancelado.');
      LOrderQuery.Close;

      LItemsQuery.Connection := LConnection;
      LItemsQuery.SQL.Text :=
        'SELECT product_id, quantity FROM erp_order_items WHERE order_id = :order_id';
      LItemsQuery.ParamByName('order_id').AsLargeInt := AId;
      LItemsQuery.Open;

      LUpdateQuery.Connection := LConnection;
      while not LItemsQuery.Eof do
      begin
        LUpdateQuery.SQL.Text :=
          'UPDATE erp_products ' +
          'SET stock_qty = stock_qty + :qty, updated_at = NOW() ' +
          'WHERE id = :product_id';
        LUpdateQuery.ParamByName('qty').AsFloat := LItemsQuery.FieldByName('quantity').AsFloat;
        LUpdateQuery.ParamByName('product_id').AsLargeInt := LItemsQuery.FieldByName('product_id').AsLargeInt;
        LUpdateQuery.ExecSQL;
        LItemsQuery.Next;
      end;
      LItemsQuery.Close;

      LUpdateQuery.SQL.Text :=
        'UPDATE erp_orders SET status = ''CANCELED'', canceled_at = NOW() WHERE id = :id';
      LUpdateQuery.ParamByName('id').AsLargeInt := AId;
      LUpdateQuery.ExecSQL;

      LConnection.Commit;
      Result := True;
    except
      LConnection.Rollback;
      raise;
    end;
  finally
    LUpdateQuery.Free;
    LItemsQuery.Free;
    LOrderQuery.Free;
    LConnection.Free;
  end;
end;

end.
