unit FiscalDocumentService;

interface

uses
  ListQueryParams;

type
  TFiscalEmitInput = record
    DocumentType: string;
    Series: string;
    Number: string;
    TotalAmount: Double;
  end;

  TFiscalEmitDirectInput = record
    DocumentType: string;
    Series: string;
    Number: string;
    ClientId: Int64;
    RecipientName: string;
    RecipientDocument: string;
    TotalAmount: Double;
  end;

  TFiscalDocumentService = class
  public
    class function ListDocumentsJson(const AParams: TListQueryParams): string; static;
    class function GetDocumentJson(const AId: Int64): string; static;
    class function GetByOrderJson(const AOrderId: Int64): string; static;
    class function ProviderInfoJson: string; static;
    class function EmitOrderNFe(const AOrderId: Int64; const AInput: TFiscalEmitInput): Int64; static;
    class function EmitDirectDocument(const AInput: TFiscalEmitDirectInput): Int64; static;
    class function CancelDocument(const AId: Int64; const AReason: string): Boolean; static;
  end;

implementation

uses
  System.SysUtils,
  System.Classes,
  System.JSON,
  FireDAC.Comp.Client,
  AppConfig,
  DBConnectionFactory,
  FiscalContext,
  FiscalNFeProviderFactory;

class function TFiscalDocumentService.ListDocumentsJson(const AParams: TListQueryParams): string;
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
    if SameText(AValue, 'status') then Exit('f.status');
    if SameText(AValue, 'order_id') then Exit('f.order_id');
    if SameText(AValue, 'number') then Exit('f.number');
    if SameText(AValue, 'issued_at') then Exit('f.issued_at');
    if SameText(AValue, 'created_at') then Exit('f.created_at');
    if SameText(AValue, 'updated_at') then Exit('f.updated_at');
    Result := 'f.id';
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
    if AParams.OrderIdSet then
      LConditions.Add('f.order_id = :order_id');
    if Trim(AParams.Status) <> '' then
      LConditions.Add('UPPER(f.status) = :status');
    if Trim(AParams.Q) <> '' then
      LConditions.Add(
        '(COALESCE(f.number, '''') ILIKE :q OR COALESCE(f.access_key, '''') ILIKE :q OR ' +
        ' COALESCE(f.protocol, '''') ILIKE :q OR COALESCE(o.invoice_number, '''') ILIKE :q OR ' +
        ' COALESCE(c.name, '''') ILIKE :q OR COALESCE(f.recipient_name, '''') ILIKE :q)'
      );

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
      'FROM erp_fiscal_documents f ' +
      'LEFT JOIN erp_orders o ON o.id = f.order_id ' +
      'LEFT JOIN erp_clients c ON c.id = COALESCE(f.client_id, o.client_id) ' +
      LWhere;
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
      'SELECT f.id, f.order_id, f.origin_type, f.origin_id, f.client_id, f.recipient_name, f.recipient_document, f.total_amount, ' +
      ' f.status, f.document_type, f.series, f.number, f.access_key, f.protocol, f.error_message, ' +
      ' f.issued_at, f.canceled_at, f.created_at, f.updated_at, o.invoice_number, c.name AS client_name, c.document AS client_document ' +
      'FROM erp_fiscal_documents f ' +
      'LEFT JOIN erp_orders o ON o.id = f.order_id ' +
      'LEFT JOIN erp_clients c ON c.id = COALESCE(f.client_id, o.client_id) ' +
      LWhere + ' ' +
      'ORDER BY ' + LSortBy + ' ' + LSortDir + ' ' +
      'LIMIT :limit OFFSET :offset';
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
      if LQuery.FieldByName('order_id').IsNull then
        LItem.AddPair('order_id', TJSONNull.Create)
      else
        LItem.AddPair('order_id', TJSONNumber.Create(LQuery.FieldByName('order_id').AsLargeInt));
      if LQuery.FieldByName('origin_type').IsNull then
        LItem.AddPair('origin_type', TJSONNull.Create)
      else
        LItem.AddPair('origin_type', LQuery.FieldByName('origin_type').AsString);
      if LQuery.FieldByName('origin_id').IsNull then
        LItem.AddPair('origin_id', TJSONNull.Create)
      else
        LItem.AddPair('origin_id', TJSONNumber.Create(LQuery.FieldByName('origin_id').AsLargeInt));
      if LQuery.FieldByName('client_id').IsNull then
        LItem.AddPair('client_id', TJSONNull.Create)
      else
        LItem.AddPair('client_id', TJSONNumber.Create(LQuery.FieldByName('client_id').AsLargeInt));
      if LQuery.FieldByName('client_name').IsNull then
      begin
        if LQuery.FieldByName('recipient_name').IsNull then
          LItem.AddPair('recipient_name', TJSONNull.Create)
        else
          LItem.AddPair('recipient_name', LQuery.FieldByName('recipient_name').AsString);
      end
      else
        LItem.AddPair('recipient_name', LQuery.FieldByName('client_name').AsString);
      if LQuery.FieldByName('client_document').IsNull then
      begin
        if LQuery.FieldByName('recipient_document').IsNull then
          LItem.AddPair('recipient_document', TJSONNull.Create)
        else
          LItem.AddPair('recipient_document', LQuery.FieldByName('recipient_document').AsString);
      end
      else
        LItem.AddPair('recipient_document', LQuery.FieldByName('client_document').AsString);
      if LQuery.FieldByName('total_amount').IsNull then
        LItem.AddPair('total_amount', TJSONNull.Create)
      else
        LItem.AddPair('total_amount', TJSONNumber.Create(LQuery.FieldByName('total_amount').AsFloat));
      LItem.AddPair('status', LQuery.FieldByName('status').AsString);
      LItem.AddPair('document_type', LQuery.FieldByName('document_type').AsString);
      LItem.AddPair('series', LQuery.FieldByName('series').AsString);
      LItem.AddPair('number', LQuery.FieldByName('number').AsString);
      if LQuery.FieldByName('access_key').IsNull then
        LItem.AddPair('access_key', TJSONNull.Create)
      else
        LItem.AddPair('access_key', LQuery.FieldByName('access_key').AsString);
      if LQuery.FieldByName('protocol').IsNull then
        LItem.AddPair('protocol', TJSONNull.Create)
      else
        LItem.AddPair('protocol', LQuery.FieldByName('protocol').AsString);
      if LQuery.FieldByName('error_message').IsNull then
        LItem.AddPair('error_message', TJSONNull.Create)
      else
        LItem.AddPair('error_message', LQuery.FieldByName('error_message').AsString);
      if LQuery.FieldByName('issued_at').IsNull then
        LItem.AddPair('issued_at', TJSONNull.Create)
      else
        LItem.AddPair('issued_at', LQuery.FieldByName('issued_at').AsString);
      if LQuery.FieldByName('canceled_at').IsNull then
        LItem.AddPair('canceled_at', TJSONNull.Create)
      else
        LItem.AddPair('canceled_at', LQuery.FieldByName('canceled_at').AsString);
      LItem.AddPair('created_at', LQuery.FieldByName('created_at').AsString);
      LItem.AddPair('updated_at', LQuery.FieldByName('updated_at').AsString);
      if LQuery.FieldByName('invoice_number').IsNull then
        LItem.AddPair('invoice_number', TJSONNull.Create)
      else
        LItem.AddPair('invoice_number', LQuery.FieldByName('invoice_number').AsString);
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

    LSort.AddPair('by', StringReplace(LSortBy, 'f.', '', [rfReplaceAll]));
    LSort.AddPair('dir', LSortDir);

    if Trim(AParams.Q) = '' then
      LFilters.AddPair('q', TJSONNull.Create)
    else
      LFilters.AddPair('q', Trim(AParams.Q));
    if Trim(AParams.Status) = '' then
      LFilters.AddPair('status', TJSONNull.Create)
    else
      LFilters.AddPair('status', UpperCase(Trim(AParams.Status)));
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

class function TFiscalDocumentService.GetDocumentJson(const AId: Int64): string;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
  LObj: TJSONObject;
begin
  Result := '';
  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  try
    LQuery.Connection := LConnection;
    LQuery.SQL.Text :=
      'SELECT f.id, f.order_id, f.origin_type, f.origin_id, f.client_id, f.recipient_name, f.recipient_document, f.total_amount, ' +
      ' f.status, f.document_type, f.series, f.number, f.access_key, f.protocol, f.xml_content, ' +
      ' f.error_message, f.issued_at, f.canceled_at, f.created_at, f.updated_at, c.name AS client_name, c.document AS client_document ' +
      'FROM erp_fiscal_documents f ' +
      'LEFT JOIN erp_orders o ON o.id = f.order_id ' +
      'LEFT JOIN erp_clients c ON c.id = COALESCE(f.client_id, o.client_id) ' +
      'WHERE f.id = :id LIMIT 1';
    LQuery.ParamByName('id').AsLargeInt := AId;
    LQuery.Open;
    if LQuery.IsEmpty then
      Exit;

    LObj := TJSONObject.Create;
    try
      LObj.AddPair('id', TJSONNumber.Create(LQuery.FieldByName('id').AsLargeInt));
      if LQuery.FieldByName('order_id').IsNull then
        LObj.AddPair('order_id', TJSONNull.Create)
      else
        LObj.AddPair('order_id', TJSONNumber.Create(LQuery.FieldByName('order_id').AsLargeInt));
      if LQuery.FieldByName('origin_type').IsNull then
        LObj.AddPair('origin_type', TJSONNull.Create)
      else
        LObj.AddPair('origin_type', LQuery.FieldByName('origin_type').AsString);
      if LQuery.FieldByName('origin_id').IsNull then
        LObj.AddPair('origin_id', TJSONNull.Create)
      else
        LObj.AddPair('origin_id', TJSONNumber.Create(LQuery.FieldByName('origin_id').AsLargeInt));
      if LQuery.FieldByName('client_id').IsNull then
        LObj.AddPair('client_id', TJSONNull.Create)
      else
        LObj.AddPair('client_id', TJSONNumber.Create(LQuery.FieldByName('client_id').AsLargeInt));
      if LQuery.FieldByName('client_name').IsNull then
      begin
        if LQuery.FieldByName('recipient_name').IsNull then
          LObj.AddPair('recipient_name', TJSONNull.Create)
        else
          LObj.AddPair('recipient_name', LQuery.FieldByName('recipient_name').AsString);
      end
      else
        LObj.AddPair('recipient_name', LQuery.FieldByName('client_name').AsString);
      if LQuery.FieldByName('client_document').IsNull then
      begin
        if LQuery.FieldByName('recipient_document').IsNull then
          LObj.AddPair('recipient_document', TJSONNull.Create)
        else
          LObj.AddPair('recipient_document', LQuery.FieldByName('recipient_document').AsString);
      end
      else
        LObj.AddPair('recipient_document', LQuery.FieldByName('client_document').AsString);
      if LQuery.FieldByName('total_amount').IsNull then
        LObj.AddPair('total_amount', TJSONNull.Create)
      else
        LObj.AddPair('total_amount', TJSONNumber.Create(LQuery.FieldByName('total_amount').AsFloat));
      LObj.AddPair('status', LQuery.FieldByName('status').AsString);
      LObj.AddPair('document_type', LQuery.FieldByName('document_type').AsString);
      LObj.AddPair('series', LQuery.FieldByName('series').AsString);
      LObj.AddPair('number', LQuery.FieldByName('number').AsString);
      if LQuery.FieldByName('access_key').IsNull then
        LObj.AddPair('access_key', TJSONNull.Create)
      else
        LObj.AddPair('access_key', LQuery.FieldByName('access_key').AsString);
      if LQuery.FieldByName('protocol').IsNull then
        LObj.AddPair('protocol', TJSONNull.Create)
      else
        LObj.AddPair('protocol', LQuery.FieldByName('protocol').AsString);
      if LQuery.FieldByName('xml_content').IsNull then
        LObj.AddPair('xml_content', TJSONNull.Create)
      else
        LObj.AddPair('xml_content', LQuery.FieldByName('xml_content').AsString);
      if LQuery.FieldByName('error_message').IsNull then
        LObj.AddPair('error_message', TJSONNull.Create)
      else
        LObj.AddPair('error_message', LQuery.FieldByName('error_message').AsString);
      if LQuery.FieldByName('issued_at').IsNull then
        LObj.AddPair('issued_at', TJSONNull.Create)
      else
        LObj.AddPair('issued_at', LQuery.FieldByName('issued_at').AsString);
      if LQuery.FieldByName('canceled_at').IsNull then
        LObj.AddPair('canceled_at', TJSONNull.Create)
      else
        LObj.AddPair('canceled_at', LQuery.FieldByName('canceled_at').AsString);
      LObj.AddPair('created_at', LQuery.FieldByName('created_at').AsString);
      LObj.AddPair('updated_at', LQuery.FieldByName('updated_at').AsString);
      Result := LObj.ToJSON;
    finally
      LObj.Free;
    end;
  finally
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TFiscalDocumentService.GetByOrderJson(const AOrderId: Int64): string;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
begin
  Result := '';
  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  try
    LQuery.Connection := LConnection;
    LQuery.SQL.Text :=
      'SELECT id FROM erp_fiscal_documents WHERE order_id = :order_id LIMIT 1';
    LQuery.ParamByName('order_id').AsLargeInt := AOrderId;
    LQuery.Open;
    if LQuery.IsEmpty then
      Exit;
    Result := GetDocumentJson(LQuery.FieldByName('id').AsLargeInt);
  finally
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TFiscalDocumentService.ProviderInfoJson: string;
var
  LCfg: AppConfig.TFiscalConfig;
  LObj: TJSONObject;
begin
  LCfg := TFiscalContext.Config;
  LObj := TJSONObject.Create;
  try
    LObj.AddPair('provider_mode', TFiscalNFeProviderFactory.CurrentProviderMode);
    LObj.AddPair('ambiente', LCfg.Ambiente);
    LObj.AddPair('uf', LCfg.UF);
    LObj.AddPair('cnpj_configured', TJSONBool.Create(Trim(LCfg.CNPJ) <> ''));
    LObj.AddPair('certificate_configured', TJSONBool.Create(Trim(LCfg.CertificatePath) <> ''));
    Result := LObj.ToJSON;
  finally
    LObj.Free;
  end;
end;

class function TFiscalDocumentService.EmitOrderNFe(
  const AOrderId: Int64;
  const AInput: TFiscalEmitInput
): Int64;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
  LOrderStatus: string;
  LOrderClientId: Int64;
  LOrderClientName: string;
  LOrderClientDocument: string;
  LOrderTotalAmount: Double;
  LHasQuoteOrigin: Boolean;
  LFiscalId: Int64;
  LDocumentType: string;
  LSeries: string;
  LNumber: string;
  LAccessKey: string;
  LProtocol: string;
  LXml: string;
  LError: string;
begin
  Result := 0;
  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  try
    LConnection.StartTransaction;
    try
      LQuery.Connection := LConnection;

      LQuery.SQL.Text :=
        'SELECT o.status, o.client_id, o.total_amount, c.name AS client_name, c.document AS client_document, ' +
        ' EXISTS(SELECT 1 FROM erp_quotes q WHERE q.linked_order_id = o.id) AS has_quote_origin ' +
        'FROM erp_orders o ' +
        'INNER JOIN erp_clients c ON c.id = o.client_id ' +
        'WHERE o.id = :id FOR UPDATE';
      LQuery.ParamByName('id').AsLargeInt := AOrderId;
      LQuery.Open;
      if LQuery.IsEmpty then
        raise Exception.Create('Pedido nao encontrado.');
      LOrderStatus := UpperCase(LQuery.FieldByName('status').AsString);
      LOrderClientId := LQuery.FieldByName('client_id').AsLargeInt;
      LOrderTotalAmount := LQuery.FieldByName('total_amount').AsFloat;
      LOrderClientName := LQuery.FieldByName('client_name').AsString;
      LOrderClientDocument := LQuery.FieldByName('client_document').AsString;
      LHasQuoteOrigin := LQuery.FieldByName('has_quote_origin').AsBoolean;
      LQuery.Close;

      if LOrderStatus <> 'INVOICED' then
        raise Exception.Create('Somente pedidos faturados podem emitir NFe.');

      LQuery.SQL.Text :=
        'SELECT id FROM erp_fiscal_documents WHERE order_id = :order_id LIMIT 1';
      LQuery.ParamByName('order_id').AsLargeInt := AOrderId;
      LQuery.Open;
      if not LQuery.IsEmpty then
        raise Exception.Create('Pedido ja possui documento fiscal.');
      LQuery.Close;

      LSeries := Trim(AInput.Series);
      if LSeries = '' then
        LSeries := '1';

      LDocumentType := UpperCase(Trim(AInput.DocumentType));
      if LDocumentType = '' then
        LDocumentType := 'NFE';
      if (LDocumentType <> 'NFE') and (LDocumentType <> 'NFCE') and (LDocumentType <> 'NFSE') then
        raise Exception.Create('Tipo de documento fiscal invalido.');

      LNumber := Trim(AInput.Number);
      if LNumber = '' then
      begin
        LQuery.SQL.Text :=
          'SELECT LPAD(CAST(COALESCE(MAX(id), 0) + 1 AS VARCHAR), 9, ''0'') AS next_number ' +
          'FROM erp_fiscal_documents';
        LQuery.Open;
        LNumber := LQuery.FieldByName('next_number').AsString;
        LQuery.Close;
      end;

      LQuery.SQL.Text :=
        'INSERT INTO erp_fiscal_documents (' +
        ' order_id, origin_type, origin_id, client_id, recipient_name, recipient_document, total_amount, status, document_type, series, number, created_at, updated_at' +
        ') VALUES (' +
        ' :order_id, :origin_type, :origin_id, :client_id, :recipient_name, :recipient_document, :total_amount, ''PENDING'', :document_type, :series, :number, NOW(), NOW()' +
        ') RETURNING id';
      LQuery.ParamByName('order_id').AsLargeInt := AOrderId;
      if LHasQuoteOrigin then
        LQuery.ParamByName('origin_type').AsString := 'QUOTE_ORDER'
      else
        LQuery.ParamByName('origin_type').AsString := 'ORDER';
      LQuery.ParamByName('origin_id').AsLargeInt := AOrderId;
      LQuery.ParamByName('client_id').AsLargeInt := LOrderClientId;
      LQuery.ParamByName('recipient_name').AsString := Copy(Trim(LOrderClientName), 1, 150);
      LQuery.ParamByName('recipient_document').AsString := Copy(Trim(LOrderClientDocument), 1, 30);
      LQuery.ParamByName('total_amount').AsFloat := LOrderTotalAmount;
      LQuery.ParamByName('document_type').AsString := LDocumentType;
      LQuery.ParamByName('series').AsString := LSeries;
      LQuery.ParamByName('number').AsString := LNumber;
      LQuery.Open;
      LFiscalId := LQuery.FieldByName('id').AsLargeInt;
      LQuery.Close;

      if TFiscalNFeProviderFactory.AuthorizeNFe(LFiscalId, AOrderId, LAccessKey, LProtocol, LXml, LError) then
      begin
        LQuery.SQL.Text :=
          'UPDATE erp_fiscal_documents ' +
          'SET status = ''AUTHORIZED'', access_key = :access_key, protocol = :protocol, ' +
          ' xml_content = :xml_content, issued_at = NOW(), updated_at = NOW(), error_message = NULL ' +
          'WHERE id = :id';
        LQuery.ParamByName('access_key').AsString := LAccessKey;
        LQuery.ParamByName('protocol').AsString := LProtocol;
        LQuery.ParamByName('xml_content').AsString := LXml;
        LQuery.ParamByName('id').AsLargeInt := LFiscalId;
        LQuery.ExecSQL;
      end
      else
      begin
        LQuery.SQL.Text :=
          'UPDATE erp_fiscal_documents ' +
          'SET status = ''REJECTED'', error_message = :error_message, updated_at = NOW() ' +
          'WHERE id = :id';
        LQuery.ParamByName('error_message').AsString := Copy(Trim(LError), 1, 500);
        LQuery.ParamByName('id').AsLargeInt := LFiscalId;
        LQuery.ExecSQL;
        raise Exception.Create('Falha ao autorizar NFe: ' + LError);
      end;

      LConnection.Commit;
      Result := LFiscalId;
    except
      LConnection.Rollback;
      raise;
    end;
  finally
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TFiscalDocumentService.EmitDirectDocument(
  const AInput: TFiscalEmitDirectInput
): Int64;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
  LDocumentType: string;
  LSeries: string;
  LNumber: string;
  LClientId: Int64;
  LRecipientName: string;
  LRecipientDocument: string;
begin
  Result := 0;
  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  try
    LConnection.StartTransaction;
    try
      LQuery.Connection := LConnection;

      LDocumentType := UpperCase(Trim(AInput.DocumentType));
      if LDocumentType = '' then
        LDocumentType := 'NFE';
      if (LDocumentType <> 'NFE') and (LDocumentType <> 'NFCE') and (LDocumentType <> 'NFSE') then
        raise Exception.Create('Tipo de documento fiscal invalido.');

      LSeries := Trim(AInput.Series);
      if LSeries = '' then
        LSeries := '1';

      LNumber := Trim(AInput.Number);
      if LNumber = '' then
      begin
        LQuery.SQL.Text :=
          'SELECT LPAD(CAST(COALESCE(MAX(id), 0) + 1 AS VARCHAR), 9, ''0'') AS next_number ' +
          'FROM erp_fiscal_documents';
        LQuery.Open;
        LNumber := LQuery.FieldByName('next_number').AsString;
        LQuery.Close;
      end;

      LClientId := AInput.ClientId;
      LRecipientName := Trim(AInput.RecipientName);
      LRecipientDocument := Trim(AInput.RecipientDocument);
      if LClientId > 0 then
      begin
        LQuery.SQL.Text :=
          'SELECT name, document FROM erp_clients WHERE id = :id LIMIT 1';
        LQuery.ParamByName('id').AsLargeInt := LClientId;
        LQuery.Open;
        if LQuery.IsEmpty then
          raise Exception.Create('Cliente informado nao encontrado.');
        if LRecipientName = '' then
          LRecipientName := LQuery.FieldByName('name').AsString;
        if LRecipientDocument = '' then
          LRecipientDocument := LQuery.FieldByName('document').AsString;
        LQuery.Close;
      end;

      if LRecipientName = '' then
        raise Exception.Create('Destinatario e obrigatorio para emissao direta.');
      if AInput.TotalAmount <= 0 then
        raise Exception.Create('Valor total deve ser maior que zero para emissao direta.');

      LQuery.SQL.Text :=
        'INSERT INTO erp_fiscal_documents (' +
        ' order_id, origin_type, origin_id, client_id, recipient_name, recipient_document, total_amount, status, document_type, series, number, created_at, updated_at' +
        ') VALUES (' +
        ' NULL, ''DIRECT'', NULL, :client_id, :recipient_name, :recipient_document, :total_amount, ''PENDING'', :document_type, :series, :number, NOW(), NOW()' +
        ') RETURNING id';
      if LClientId > 0 then
        LQuery.ParamByName('client_id').AsLargeInt := LClientId
      else
        LQuery.ParamByName('client_id').Clear;
      LQuery.ParamByName('recipient_name').AsString := Copy(LRecipientName, 1, 150);
      if LRecipientDocument = '' then
        LQuery.ParamByName('recipient_document').Clear
      else
        LQuery.ParamByName('recipient_document').AsString := Copy(LRecipientDocument, 1, 30);
      LQuery.ParamByName('total_amount').AsFloat := AInput.TotalAmount;
      LQuery.ParamByName('document_type').AsString := LDocumentType;
      LQuery.ParamByName('series').AsString := LSeries;
      LQuery.ParamByName('number').AsString := LNumber;
      LQuery.Open;
      Result := LQuery.FieldByName('id').AsLargeInt;
      LQuery.Close;

      LConnection.Commit;
    except
      LConnection.Rollback;
      raise;
    end;
  finally
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TFiscalDocumentService.CancelDocument(
  const AId: Int64;
  const AReason: string
): Boolean;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
  LStatus: string;
begin
  Result := False;
  if Trim(AReason) = '' then
    raise Exception.Create('Motivo do cancelamento e obrigatorio.');

  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  try
    LConnection.StartTransaction;
    try
      LQuery.Connection := LConnection;
      LQuery.SQL.Text :=
        'SELECT status FROM erp_fiscal_documents WHERE id = :id FOR UPDATE';
      LQuery.ParamByName('id').AsLargeInt := AId;
      LQuery.Open;
      if LQuery.IsEmpty then
      begin
        LConnection.Rollback;
        Exit(False);
      end;
      LStatus := UpperCase(LQuery.FieldByName('status').AsString);
      LQuery.Close;

      if LStatus = 'CANCELED' then
      begin
        LConnection.Rollback;
        Exit(False);
      end;
      if LStatus = 'REJECTED' then
        raise Exception.Create('Documento rejeitado nao pode ser cancelado.');

      LQuery.SQL.Text :=
        'UPDATE erp_fiscal_documents ' +
        'SET status = ''CANCELED'', canceled_at = NOW(), updated_at = NOW(), error_message = :reason ' +
        'WHERE id = :id';
      LQuery.ParamByName('reason').AsString := Copy(Trim(AReason), 1, 500);
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

end.
