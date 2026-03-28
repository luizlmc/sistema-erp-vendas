unit DashboardService;

interface

type
  TDashboardService = class
  public
    class function SummaryJson(const APeriod: string = 'today'): string; static;
  end;

implementation

uses
  System.SysUtils,
  System.JSON,
  FireDAC.Comp.Client,
  DBConnectionFactory;

class function TDashboardService.SummaryJson(const APeriod: string): string;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
  LRoot: TJSONObject;
  LKpis: TJSONObject;
  LRecentOrders: TJSONArray;
  LDueReceivables: TJSONArray;
  LTopProducts: TJSONArray;
  LCriticalStock: TJSONArray;
  LFiscalNotes: TJSONArray;
  LItem: TJSONObject;
  LPeriod: string;
  LOrderWhere: string;
  LOrderItemsWhere: string;
  LFiscalWhere: string;

  function QueryCount(const ASql: string): Int64;
  begin
    LQuery.Close;
    LQuery.SQL.Text := ASql;
    LQuery.Open;
    Result := LQuery.FieldByName('total').AsLargeInt;
  end;

  function QueryFloat(const ASql: string): Double;
  begin
    LQuery.Close;
    LQuery.SQL.Text := ASql;
    LQuery.Open;
    Result := LQuery.FieldByName('total').AsFloat;
  end;

begin
  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  LRoot := TJSONObject.Create;
  LKpis := TJSONObject.Create;
  LRecentOrders := TJSONArray.Create;
  LDueReceivables := TJSONArray.Create;
  LTopProducts := TJSONArray.Create;
  LCriticalStock := TJSONArray.Create;
  LFiscalNotes := TJSONArray.Create;
  try
    LQuery.Connection := LConnection;

    LPeriod := LowerCase(Trim(APeriod));
    if (LPeriod <> 'today') and (LPeriod <> 'week') and (LPeriod <> 'month') then
      LPeriod := 'today';

    if LPeriod = 'today' then
    begin
      LOrderWhere := 'WHERE o.created_at::date = CURRENT_DATE';
      LOrderItemsWhere := 'WHERE o.created_at::date = CURRENT_DATE';
      LFiscalWhere := 'WHERE f.created_at::date = CURRENT_DATE';
    end
    else if LPeriod = 'week' then
    begin
      LOrderWhere := 'WHERE o.created_at >= (CURRENT_DATE - INTERVAL ''6 day'')';
      LOrderItemsWhere := 'WHERE o.created_at >= (CURRENT_DATE - INTERVAL ''6 day'')';
      LFiscalWhere := 'WHERE f.created_at >= (CURRENT_DATE - INTERVAL ''6 day'')';
    end
    else
    begin
      LOrderWhere := 'WHERE date_trunc(''month'', o.created_at) = date_trunc(''month'', CURRENT_DATE)';
      LOrderItemsWhere := 'WHERE date_trunc(''month'', o.created_at) = date_trunc(''month'', CURRENT_DATE)';
      LFiscalWhere := 'WHERE date_trunc(''month'', f.created_at) = date_trunc(''month'', CURRENT_DATE)';
    end;

    LKpis.AddPair('total_orders', TJSONNumber.Create(
      QueryCount('SELECT COUNT(*) AS total FROM erp_orders o ' + LOrderWhere)
    ));
    LKpis.AddPair('open_orders', TJSONNumber.Create(
      QueryCount('SELECT COUNT(*) AS total FROM erp_orders o ' + LOrderWhere + ' AND o.status = ''OPEN''')
    ));
    LKpis.AddPair('invoiced_orders', TJSONNumber.Create(
      QueryCount('SELECT COUNT(*) AS total FROM erp_orders o ' + LOrderWhere + ' AND o.status = ''INVOICED''')
    ));
    LKpis.AddPair('active_clients', TJSONNumber.Create(
      QueryCount('SELECT COUNT(*) AS total FROM erp_clients WHERE is_active = TRUE')
    ));
    LKpis.AddPair('active_products', TJSONNumber.Create(
      QueryCount('SELECT COUNT(*) AS total FROM erp_products WHERE is_active = TRUE')
    ));
    LKpis.AddPair('open_receivables', TJSONNumber.Create(
      QueryCount('SELECT COUNT(*) AS total FROM erp_accounts_receivable WHERE status = ''OPEN''')
    ));
    LKpis.AddPair('partial_receivables', TJSONNumber.Create(
      QueryCount('SELECT COUNT(*) AS total FROM erp_accounts_receivable WHERE status = ''PARTIAL''')
    ));
    LKpis.AddPair('fiscal_authorized', TJSONNumber.Create(
      QueryCount('SELECT COUNT(*) AS total FROM erp_fiscal_documents f ' + LFiscalWhere + ' AND f.status = ''AUTHORIZED''')
    ));
    LKpis.AddPair('fiscal_rejected', TJSONNumber.Create(
      QueryCount('SELECT COUNT(*) AS total FROM erp_fiscal_documents f ' + LFiscalWhere + ' AND f.status IN (''REJECTED'', ''ERROR'')')
    ));
    LKpis.AddPair('billing_today', TJSONNumber.Create(
      QueryFloat('SELECT COALESCE(SUM(o.total_amount), 0) AS total FROM erp_orders o WHERE o.created_at::date = CURRENT_DATE AND o.status <> ''CANCELED''')
    ));
    LKpis.AddPair('billing_period', TJSONNumber.Create(
      QueryFloat('SELECT COALESCE(SUM(o.total_amount), 0) AS total FROM erp_orders o ' + LOrderWhere + ' AND o.status <> ''CANCELED''')
    ));
    LKpis.AddPair('avg_ticket_period', TJSONNumber.Create(
      QueryFloat('SELECT COALESCE(AVG(o.total_amount), 0) AS total FROM erp_orders o ' + LOrderWhere + ' AND o.status <> ''CANCELED''')
    ));
    LKpis.AddPair('period', LPeriod);

    LQuery.Close;
    LQuery.SQL.Text :=
      'SELECT o.id, c.name AS client_name, o.status, o.total_amount, o.created_at ' +
      'FROM erp_orders o ' +
      'INNER JOIN erp_clients c ON c.id = o.client_id ' +
      LOrderWhere + ' ' +
      'ORDER BY o.created_at DESC ' +
      'LIMIT 50';
    LQuery.Open;
    while not LQuery.Eof do
    begin
      LItem := TJSONObject.Create;
      LItem.AddPair('id', TJSONNumber.Create(LQuery.FieldByName('id').AsLargeInt));
      LItem.AddPair('client_name', LQuery.FieldByName('client_name').AsString);
      LItem.AddPair('status', LQuery.FieldByName('status').AsString);
      LItem.AddPair('total_amount', TJSONNumber.Create(LQuery.FieldByName('total_amount').AsFloat));
      LItem.AddPair('created_at', LQuery.FieldByName('created_at').AsString);
      LRecentOrders.AddElement(LItem);
      LQuery.Next;
    end;

    LQuery.Close;
    LQuery.SQL.Text :=
      'SELECT p.name, SUM(oi.line_total) AS total_value ' +
      'FROM erp_order_items oi ' +
      'INNER JOIN erp_orders o ON o.id = oi.order_id ' +
      'INNER JOIN erp_products p ON p.id = oi.product_id ' +
      LOrderItemsWhere + ' ' +
      'GROUP BY p.name ' +
      'ORDER BY SUM(oi.line_total) DESC ' +
      'LIMIT 5';
    LQuery.Open;
    while not LQuery.Eof do
    begin
      LItem := TJSONObject.Create;
      LItem.AddPair('name', LQuery.FieldByName('name').AsString);
      LItem.AddPair('amount', TJSONNumber.Create(LQuery.FieldByName('total_value').AsFloat));
      LTopProducts.AddElement(LItem);
      LQuery.Next;
    end;

    LQuery.Close;
    LQuery.SQL.Text :=
      'SELECT p.id, p.name, p.stock_qty ' +
      'FROM erp_products p ' +
      'WHERE p.is_active = TRUE AND p.stock_qty <= 10 ' +
      'ORDER BY p.stock_qty ASC, p.name ASC ' +
      'LIMIT 5';
    LQuery.Open;
    while not LQuery.Eof do
    begin
      LItem := TJSONObject.Create;
      LItem.AddPair('id', TJSONNumber.Create(LQuery.FieldByName('id').AsLargeInt));
      LItem.AddPair('name', LQuery.FieldByName('name').AsString);
      LItem.AddPair('qty', TJSONNumber.Create(LQuery.FieldByName('stock_qty').AsFloat));
      LCriticalStock.AddElement(LItem);
      LQuery.Next;
    end;

    LQuery.Close;
    LQuery.SQL.Text :=
      'SELECT r.id, c.name AS client_name, r.status, r.balance_amount, r.due_date ' +
      'FROM erp_accounts_receivable r ' +
      'INNER JOIN erp_clients c ON c.id = r.client_id ' +
      'WHERE r.status IN (''OPEN'', ''PARTIAL'') ' +
      'ORDER BY r.due_date ASC ' +
      'LIMIT 5';
    LQuery.Open;
    while not LQuery.Eof do
    begin
      LItem := TJSONObject.Create;
      LItem.AddPair('id', TJSONNumber.Create(LQuery.FieldByName('id').AsLargeInt));
      LItem.AddPair('client_name', LQuery.FieldByName('client_name').AsString);
      LItem.AddPair('status', LQuery.FieldByName('status').AsString);
      LItem.AddPair('balance_amount', TJSONNumber.Create(LQuery.FieldByName('balance_amount').AsFloat));
      LItem.AddPair('due_date', LQuery.FieldByName('due_date').AsString);
      LDueReceivables.AddElement(LItem);
      LQuery.Next;
    end;

    LQuery.Close;
    LQuery.SQL.Text :=
      'SELECT f.number, c.name AS client_name, f.status ' +
      'FROM erp_fiscal_documents f ' +
      'INNER JOIN erp_orders o ON o.id = f.order_id ' +
      'INNER JOIN erp_clients c ON c.id = o.client_id ' +
      LFiscalWhere + ' ' +
      'ORDER BY f.created_at DESC ' +
      'LIMIT 5';
    LQuery.Open;
    while not LQuery.Eof do
    begin
      LItem := TJSONObject.Create;
      LItem.AddPair('num', LQuery.FieldByName('number').AsString);
      LItem.AddPair('dest', LQuery.FieldByName('client_name').AsString);
      LItem.AddPair('status', LQuery.FieldByName('status').AsString);
      LFiscalNotes.AddElement(LItem);
      LQuery.Next;
    end;

    LRoot.AddPair('kpis', LKpis);
    LRoot.AddPair('recent_orders', LRecentOrders);
    LRoot.AddPair('due_receivables', LDueReceivables);
    LRoot.AddPair('top_products', LTopProducts);
    LRoot.AddPair('critical_stock', LCriticalStock);
    LRoot.AddPair('fiscal_notes', LFiscalNotes);
    LKpis := nil;
    LRecentOrders := nil;
    LDueReceivables := nil;
    LTopProducts := nil;
    LCriticalStock := nil;
    LFiscalNotes := nil;

    Result := LRoot.ToJSON;
  finally
    if Assigned(LFiscalNotes) then LFiscalNotes.Free;
    if Assigned(LCriticalStock) then LCriticalStock.Free;
    if Assigned(LTopProducts) then LTopProducts.Free;
    if Assigned(LDueReceivables) then LDueReceivables.Free;
    if Assigned(LRecentOrders) then LRecentOrders.Free;
    if Assigned(LKpis) then LKpis.Free;
    LRoot.Free;
    LQuery.Free;
    LConnection.Free;
  end;
end;

end.
