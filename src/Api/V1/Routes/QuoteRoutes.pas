unit QuoteRoutes;

interface

type
  TQuoteRoutes = class
  public
    class procedure Register; static;
  end;

implementation

uses
  System.SysUtils,
  System.JSON,
  Horse,
  AuthMiddleware,
  AuthSession,
  QuoteService,
  ListQueryParser,
  ListQueryParams,
  ApiResponse;

class procedure TQuoteRoutes.Register;
begin
  THorse.Get('/api/v1/quotes',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LParams: TListQueryParams;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'quotes.read') then Exit;
      LParams := TListQueryParser.Parse(AReq);
      TApiResponse.SendSuccess(ARes, TQuoteService.ListQuotesJson(LParams));
    end
  );

  THorse.Get('/api/v1/quotes/:id',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LJson: string;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'quotes.read') then Exit;

      LId := StrToInt64Def(AReq.Params['id'], 0);
      if LId <= 0 then
      begin
        TApiResponse.SendError(ARes, 400, 'invalid_id', 'ID invalido.');
        Exit;
      end;

      LJson := TQuoteService.GetQuoteJson(LId);
      if LJson = '' then
      begin
        TApiResponse.SendError(ARes, 404, 'quote_not_found', 'Orcamento nao encontrado.');
        Exit;
      end;

      TApiResponse.SendSuccess(ARes, LJson);
    end
  );

  THorse.Get('/api/v1/quotes/:id/history',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LJson: string;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'quotes.history') then Exit;

      LId := StrToInt64Def(AReq.Params['id'], 0);
      if LId <= 0 then
      begin
        TApiResponse.SendError(ARes, 400, 'invalid_id', 'ID invalido.');
        Exit;
      end;

      LJson := TQuoteService.GetQuoteHistoryJson(LId);
      TApiResponse.SendSuccess(ARes, LJson);
    end
  );

  THorse.Post('/api/v1/quotes',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LBody: TJSONValue;
      LObj: TJSONObject;
      LItems: TJSONArray;
      LInput: TCreateQuoteInput;
      LItemObj: TJSONObject;
      LItemInput: TQuoteItemInput;
      I: Integer;
      LQuoteId: Int64;
      LSession: TAuthSession;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'quotes.create') then Exit;

      LBody := TJSONObject.ParseJSONValue(AReq.Body);
      try
        if (LBody = nil) or not (LBody is TJSONObject) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_json', 'Payload JSON invalido.');
          Exit;
        end;

        LObj := TJSONObject(LBody);
        LInput := Default(TCreateQuoteInput);
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
            TApiResponse.SendError(ARes, 400, 'invalid_payload', 'Item de orcamento invalido.');
            Exit;
          end;
          LItemObj := TJSONObject(LItems.Items[I]);
          LItemInput.ProductId := LItemObj.GetValue<Int64>('product_id', 0);
          LItemInput.Quantity := LItemObj.GetValue<Double>('quantity', 0);
          LInput.Items[I] := LItemInput;
        end;

        try
          LQuoteId := TQuoteService.CreateQuote(LInput);
        except
          on E: Exception do
          begin
            TApiResponse.SendError(ARes, 400, 'quote_validation', E.Message);
            Exit;
          end;
        end;

        ARes.Status(201).ContentType('application/json').Send('{"status":"ok","id":' + IntToStr(LQuoteId) + '}');
      finally
        LBody.Free;
      end;
    end
  );

  THorse.Put('/api/v1/quotes/:id',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LBody: TJSONValue;
      LObj: TJSONObject;
      LItems: TJSONArray;
      LInput: TUpdateQuoteInput;
      LItemObj: TJSONObject;
      LItemInput: TQuoteItemInput;
      LUpdated: Boolean;
      LSession: TAuthSession;
      I: Integer;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'quotes.update') then Exit;

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
        LInput := Default(TUpdateQuoteInput);
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
            TApiResponse.SendError(ARes, 400, 'invalid_payload', 'Item de orcamento invalido.');
            Exit;
          end;
          LItemObj := TJSONObject(LItems.Items[I]);
          LItemInput.ProductId := LItemObj.GetValue<Int64>('product_id', 0);
          LItemInput.Quantity := LItemObj.GetValue<Double>('quantity', 0);
          LInput.Items[I] := LItemInput;
        end;

        try
          LUpdated := TQuoteService.UpdateQuote(LId, LInput);
        except
          on E: Exception do
          begin
            TApiResponse.SendError(ARes, 400, 'quote_validation', E.Message);
            Exit;
          end;
        end;

        if not LUpdated then
        begin
          TApiResponse.SendError(ARes, 404, 'quote_not_found', 'Orcamento nao encontrado.');
          Exit;
        end;

        TApiResponse.SendSuccess(ARes, '{"status":"ok"}');
      finally
        LBody.Free;
      end;
    end
  );

  THorse.Post('/api/v1/quotes/:id/approve',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LOk: Boolean;
      LSession: TAuthSession;
      LUserId: Int64;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'quotes.approve') then Exit;
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
        LOk := TQuoteService.ApproveQuote(LId, LUserId);
      except
        on E: Exception do
        begin
          TApiResponse.SendError(ARes, 400, 'quote_validation', E.Message);
          Exit;
        end;
      end;
      if not LOk then
      begin
        TApiResponse.SendError(ARes, 404, 'quote_not_found', 'Orcamento nao encontrado.');
        Exit;
      end;
      TApiResponse.SendSuccess(ARes, '{"status":"ok"}');
    end
  );

  THorse.Post('/api/v1/quotes/:id/reject',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LOk: Boolean;
      LSession: TAuthSession;
      LUserId: Int64;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'quotes.reject') then Exit;
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
        LOk := TQuoteService.RejectQuote(LId, LUserId);
      except
        on E: Exception do
        begin
          TApiResponse.SendError(ARes, 400, 'quote_validation', E.Message);
          Exit;
        end;
      end;
      if not LOk then
      begin
        TApiResponse.SendError(ARes, 404, 'quote_not_found', 'Orcamento nao encontrado.');
        Exit;
      end;
      TApiResponse.SendSuccess(ARes, '{"status":"ok"}');
    end
  );

  THorse.Post('/api/v1/quotes/:id/cancel',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LOk: Boolean;
      LSession: TAuthSession;
      LUserId: Int64;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'quotes.cancel') then Exit;
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
        LOk := TQuoteService.CancelQuote(LId, LUserId);
      except
        on E: Exception do
        begin
          TApiResponse.SendError(ARes, 400, 'quote_validation', E.Message);
          Exit;
        end;
      end;
      if not LOk then
      begin
        TApiResponse.SendError(ARes, 404, 'quote_not_found', 'Orcamento nao encontrado ou ja cancelado.');
        Exit;
      end;
      TApiResponse.SendSuccess(ARes, '{"status":"ok"}');
    end
  );

  THorse.Post('/api/v1/quotes/:id/convert',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LOrderId: Int64;
      LSession: TAuthSession;
      LUserId: Int64;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'quotes.convert') then Exit;
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
        LOrderId := TQuoteService.ConvertQuoteToOrder(LId, LUserId);
      except
        on E: Exception do
        begin
          TApiResponse.SendError(ARes, 400, 'quote_validation', E.Message);
          Exit;
        end;
      end;

      TApiResponse.SendSuccess(ARes, '{"status":"ok","order_id":' + IntToStr(LOrderId) + '}');
    end
  );
end;

end.
