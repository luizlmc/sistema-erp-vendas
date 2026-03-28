unit OrderRoutes;

interface

type
  TOrderRoutes = class
  public
    class procedure Register; static;
  end;

implementation

uses
  System.SysUtils,
  System.JSON,
  System.DateUtils,
  Horse,
  AuthMiddleware,
  AuthSession,
  OrderService,
  ListQueryParser,
  ListQueryParams,
  ApiResponse;

class procedure TOrderRoutes.Register;
begin
  THorse.Get('/api/v1/orders',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LParams: TListQueryParams;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'orders.read') then Exit;
      LParams := TListQueryParser.Parse(AReq);
      TApiResponse.SendSuccess(ARes, TOrderService.ListOrdersJson(LParams));
    end
  );

  THorse.Get('/api/v1/orders/:id',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LJson: string;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'orders.read') then Exit;

      LId := StrToInt64Def(AReq.Params['id'], 0);
      if LId <= 0 then
      begin
        TApiResponse.SendError(ARes, 400, 'invalid_id', 'ID invalido.');
        Exit;
      end;

      LJson := TOrderService.GetOrderJson(LId);
      if LJson = '' then
      begin
        TApiResponse.SendError(ARes, 404, 'order_not_found', 'Pedido nao encontrado.');
        Exit;
      end;

      TApiResponse.SendSuccess(ARes, LJson);
    end
  );

  THorse.Get('/api/v1/orders/:id/history',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LJson: string;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'orders.history') then Exit;

      LId := StrToInt64Def(AReq.Params['id'], 0);
      if LId <= 0 then
      begin
        TApiResponse.SendError(ARes, 400, 'invalid_id', 'ID invalido.');
        Exit;
      end;

      LJson := TOrderService.GetOrderHistoryJson(LId);
      TApiResponse.SendSuccess(ARes, LJson);
    end
  );

  THorse.Post('/api/v1/orders',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LBody: TJSONValue;
      LObj: TJSONObject;
      LItems: TJSONArray;
      LInput: TCreateOrderInput;
      LItemObj: TJSONObject;
      LItemInput: TOrderItemInput;
      I: Integer;
      LOrderId: Int64;
      LSession: TAuthSession;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'orders.create') then Exit;

      LBody := TJSONObject.ParseJSONValue(AReq.Body);
      try
        if (LBody = nil) or not (LBody is TJSONObject) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_json', 'Payload JSON invalido.');
          Exit;
        end;

        LObj := TJSONObject(LBody);
        LInput := Default(TCreateOrderInput);
        LInput.ClientId := LObj.GetValue<Int64>('client_id', 0);
        LInput.Notes := LObj.GetValue<string>('notes', '');
        LInput.CreatedByUserId := 0;
        if AReq.Sessions.TryGetSession<TAuthSession>(LSession) then
          LInput.CreatedByUserId := LSession.UserId;

        LItems := LObj.GetValue<TJSONArray>('items');
        if LItems = nil then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'Campo items e obrigatorio.');
          Exit;
        end;

        SetLength(LInput.Items, LItems.Count);
        for I := 0 to LItems.Count - 1 do
        begin
          if not (LItems.Items[I] is TJSONObject) then
          begin
            TApiResponse.SendError(ARes, 400, 'invalid_payload', 'Item de pedido invalido.');
            Exit;
          end;
          LItemObj := TJSONObject(LItems.Items[I]);
          LItemInput.ProductId := LItemObj.GetValue<Int64>('product_id', 0);
          LItemInput.Quantity := LItemObj.GetValue<Double>('quantity', 0);
          LInput.Items[I] := LItemInput;
        end;

        try
          LOrderId := TOrderService.CreateOrder(LInput);
        except
          on E: Exception do
          begin
            TApiResponse.SendError(ARes, 400, 'order_validation', E.Message);
            Exit;
          end;
        end;

        ARes.Status(201).ContentType('application/json').Send('{"status":"ok","id":' + IntToStr(LOrderId) + '}');
      finally
        LBody.Free;
      end;
    end
  );

  THorse.Put('/api/v1/orders/:id',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LBody: TJSONValue;
      LObj: TJSONObject;
      LItems: TJSONArray;
      LInput: TUpdateOrderInput;
      LItemObj: TJSONObject;
      LItemInput: TOrderItemInput;
      LUpdated: Boolean;
      LSession: TAuthSession;
      I: Integer;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'orders.update') then Exit;

      LId := StrToInt64Def(AReq.Params['id'], 0);
      if LId <= 0 then
      begin
        TApiResponse.SendError(ARes, 400, 'invalid_id', 'ID invalido.');
        Exit;
      end;

      LBody := TJSONObject.ParseJSONValue(AReq.Body);
      try
        if (LBody = nil) or not (LBody is TJSONObject) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_json', 'Payload JSON invalido.');
          Exit;
        end;

        LObj := TJSONObject(LBody);
        LInput := Default(TUpdateOrderInput);
        LInput.ClientId := LObj.GetValue<Int64>('client_id', 0);
        LInput.Notes := LObj.GetValue<string>('notes', '');
        LInput.UpdatedByUserId := 0;
        if AReq.Sessions.TryGetSession<TAuthSession>(LSession) then
          LInput.UpdatedByUserId := LSession.UserId;

        LItems := LObj.GetValue<TJSONArray>('items');
        if LItems = nil then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'Campo items e obrigatorio.');
          Exit;
        end;

        SetLength(LInput.Items, LItems.Count);
        for I := 0 to LItems.Count - 1 do
        begin
          if not (LItems.Items[I] is TJSONObject) then
          begin
            TApiResponse.SendError(ARes, 400, 'invalid_payload', 'Item de pedido invalido.');
            Exit;
          end;
          LItemObj := TJSONObject(LItems.Items[I]);
          LItemInput.ProductId := LItemObj.GetValue<Int64>('product_id', 0);
          LItemInput.Quantity := LItemObj.GetValue<Double>('quantity', 0);
          LInput.Items[I] := LItemInput;
        end;

        try
          LUpdated := TOrderService.UpdateOrder(LId, LInput);
        except
          on E: Exception do
          begin
            TApiResponse.SendError(ARes, 400, 'order_validation', E.Message);
            Exit;
          end;
        end;

        if not LUpdated then
        begin
          TApiResponse.SendError(ARes, 404, 'order_not_found', 'Pedido nao encontrado.');
          Exit;
        end;

        TApiResponse.SendSuccess(ARes, '{"status":"ok"}');
      finally
        LBody.Free;
      end;
    end
  );

  THorse.Post('/api/v1/orders/:id/cancel',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LCanceled: Boolean;
      LSession: TAuthSession;
      LUserId: Int64;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'orders.cancel') then Exit;

      LId := StrToInt64Def(AReq.Params['id'], 0);
      if LId <= 0 then
      begin
        TApiResponse.SendError(ARes, 400, 'invalid_id', 'ID invalido.');
        Exit;
      end;

      LUserId := 0;
      if AReq.Sessions.TryGetSession<TAuthSession>(LSession) then
        LUserId := LSession.UserId;

      try
        LCanceled := TOrderService.CancelOrder(LId, LUserId);
      except
        on E: Exception do
        begin
          TApiResponse.SendError(ARes, 400, 'order_validation', E.Message);
          Exit;
        end;
      end;
      if not LCanceled then
      begin
        TApiResponse.SendError(ARes, 404, 'order_not_found', 'Pedido nao encontrado ou ja cancelado.');
        Exit;
      end;

      TApiResponse.SendSuccess(ARes, '{"status":"ok"}');
    end
  );

  THorse.Post('/api/v1/orders/:id/confirm',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LOk: Boolean;
      LSession: TAuthSession;
      LUserId: Int64;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'orders.confirm') then Exit;

      LId := StrToInt64Def(AReq.Params['id'], 0);
      if LId <= 0 then
      begin
        TApiResponse.SendError(ARes, 400, 'invalid_id', 'ID invalido.');
        Exit;
      end;

      LUserId := 0;
      if AReq.Sessions.TryGetSession<TAuthSession>(LSession) then
        LUserId := LSession.UserId;

      try
        LOk := TOrderService.ConfirmOrder(LId, LUserId);
      except
        on E: Exception do
        begin
          TApiResponse.SendError(ARes, 400, 'order_validation', E.Message);
          Exit;
        end;
      end;

      if not LOk then
      begin
        TApiResponse.SendError(ARes, 404, 'order_not_found', 'Pedido nao encontrado ou ja confirmado.');
        Exit;
      end;

      TApiResponse.SendSuccess(ARes, '{"status":"ok"}');
    end
  );

  THorse.Post('/api/v1/orders/:id/invoice',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LBody: TJSONValue;
      LObj: TJSONObject;
      LInput: TInvoiceInput;
      LDateText: string;
      LOk: Boolean;
      LSession: TAuthSession;
      LUserId: Int64;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'orders.invoice') then Exit;

      LId := StrToInt64Def(AReq.Params['id'], 0);
      if LId <= 0 then
      begin
        TApiResponse.SendError(ARes, 400, 'invalid_id', 'ID invalido.');
        Exit;
      end;

      LInput := Default(TInvoiceInput);
      LInput.InvoiceNumber := '';
      LInput.PaymentTerm := 'INSTALLMENT';
      LInput.Installments := 1;
      LInput.IntervalDays := 30;
      LInput.PaymentMethod := 'UNSPECIFIED';
      LInput.HasFirstDueDate := False;
      if Trim(AReq.Body) <> '' then
      begin
        LBody := TJSONObject.ParseJSONValue(AReq.Body);
        try
          if (LBody = nil) or not (LBody is TJSONObject) then
          begin
            TApiResponse.SendError(ARes, 400, 'invalid_json', 'Payload JSON invalido.');
            Exit;
          end;
          LObj := TJSONObject(LBody);
          LInput.InvoiceNumber := LObj.GetValue<string>('invoice_number', '');
          LInput.PaymentTerm := LObj.GetValue<string>('payment_term', LInput.PaymentTerm);
          LInput.Installments := LObj.GetValue<Integer>('installments', LInput.Installments);
          LInput.IntervalDays := LObj.GetValue<Integer>('interval_days', LInput.IntervalDays);
          LInput.PaymentMethod := LObj.GetValue<string>('payment_method', LInput.PaymentMethod);
          LDateText := LObj.GetValue<string>('first_due_date', '');
          if Trim(LDateText) <> '' then
          begin
            if not TryISO8601ToDate(LDateText, LInput.FirstDueDate) then
            begin
              if not TryISO8601ToDate(LDateText + 'T00:00:00', LInput.FirstDueDate) then
              begin
                TApiResponse.SendError(ARes, 400, 'invalid_payload', 'first_due_date deve estar em formato ISO-8601.');
                Exit;
              end;
            end;
            LInput.HasFirstDueDate := True;
          end;
        finally
          LBody.Free;
        end;
      end;

      LUserId := 0;
      if AReq.Sessions.TryGetSession<TAuthSession>(LSession) then
        LUserId := LSession.UserId;

      try
        LOk := TOrderService.InvoiceOrder(LId, LInput, LUserId);
      except
        on E: Exception do
        begin
          TApiResponse.SendError(ARes, 400, 'order_validation', E.Message);
          Exit;
        end;
      end;

      if not LOk then
      begin
        TApiResponse.SendError(ARes, 404, 'order_not_found', 'Pedido nao encontrado ou ja faturado.');
        Exit;
      end;

      TApiResponse.SendSuccess(ARes, '{"status":"ok"}');
    end
  );
end;

end.
