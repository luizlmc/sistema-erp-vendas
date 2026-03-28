unit ReceivableRoutes;

interface

type
  TReceivableRoutes = class
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
  ListQueryParser,
  ListQueryParams,
  ApiResponse,
  ReceivableService;

class procedure TReceivableRoutes.Register;
begin
  THorse.Get('/api/v1/receivables',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LParams: TListQueryParams;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'receivables.read') then Exit;
      LParams := TListQueryParser.Parse(AReq);
      TApiResponse.SendSuccess(ARes, TReceivableService.ListReceivablesJson(LParams));
    end
  );

  THorse.Get('/api/v1/receivables/:id',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LJson: string;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'receivables.read') then Exit;

      LId := StrToInt64Def(AReq.Params['id'], 0);
      if LId <= 0 then
      begin
        TApiResponse.SendError(ARes, 400, 'invalid_id', 'ID invalido.');
        Exit;
      end;

      LJson := TReceivableService.GetReceivableJson(LId);
      if LJson = '' then
      begin
        TApiResponse.SendError(ARes, 404, 'receivable_not_found', 'Titulo nao encontrado.');
        Exit;
      end;

      TApiResponse.SendSuccess(ARes, LJson);
    end
  );

  THorse.Post('/api/v1/receivables/:id/payments',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LBody: TJSONValue;
      LObj: TJSONObject;
      LInput: TPaymentInput;
      LDateText: string;
      LSuccess: Boolean;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'receivables.payments.create') then Exit;

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
        LInput := Default(TPaymentInput);
        LInput.Amount := LObj.GetValue<Double>('amount', 0);
        LInput.PaymentMethod := LObj.GetValue<string>('payment_method', '');
        LInput.Notes := LObj.GetValue<string>('notes', '');
        LDateText := LObj.GetValue<string>('payment_date', '');
        if Trim(LDateText) <> '' then
        begin
          if not TryISO8601ToDate(LDateText, LInput.PaymentDate) then
          begin
            TApiResponse.SendError(ARes, 400, 'invalid_payload', 'payment_date deve estar em formato ISO-8601.');
            Exit;
          end;
          LInput.HasPaymentDate := True;
        end;

        try
          LSuccess := TReceivableService.RegisterPayment(LId, LInput);
        except
          on E: Exception do
          begin
            TApiResponse.SendError(ARes, 400, 'payment_validation', E.Message);
            Exit;
          end;
        end;

        if not LSuccess then
        begin
          TApiResponse.SendError(ARes, 404, 'receivable_not_found', 'Titulo nao encontrado.');
          Exit;
        end;

        TApiResponse.SendSuccess(ARes, '{"status":"ok"}');
      finally
        LBody.Free;
      end;
    end
  );

  THorse.Post('/api/v1/receivables/:id/payments/:payment_id/reverse',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LPaymentId: Int64;
      LBody: TJSONValue;
      LObj: TJSONObject;
      LReason: string;
      LSuccess: Boolean;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'receivables.payments.reverse') then Exit;

      LId := StrToInt64Def(AReq.Params['id'], 0);
      LPaymentId := StrToInt64Def(AReq.Params['payment_id'], 0);
      if (LId <= 0) or (LPaymentId <= 0) then
      begin
        TApiResponse.SendError(ARes, 400, 'invalid_id', 'ID invalido.');
        Exit;
      end;

      LReason := '';
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
          LReason := LObj.GetValue<string>('reason', '');
        finally
          LBody.Free;
        end;
      end;

      try
        LSuccess := TReceivableService.ReversePayment(LId, LPaymentId, LReason);
      except
        on E: Exception do
        begin
          TApiResponse.SendError(ARes, 400, 'payment_validation', E.Message);
          Exit;
        end;
      end;

      if not LSuccess then
      begin
        TApiResponse.SendError(ARes, 404, 'payment_not_found', 'Pagamento nao encontrado para o titulo.');
        Exit;
      end;

      TApiResponse.SendSuccess(ARes, '{"status":"ok"}');
    end
  );

  THorse.Post('/api/v1/receivables/:id/cancel',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LSuccess: Boolean;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'receivables.cancel') then Exit;

      LId := StrToInt64Def(AReq.Params['id'], 0);
      if LId <= 0 then
      begin
        TApiResponse.SendError(ARes, 400, 'invalid_id', 'ID invalido.');
        Exit;
      end;

      try
        LSuccess := TReceivableService.CancelReceivable(LId);
      except
        on E: Exception do
        begin
          TApiResponse.SendError(ARes, 400, 'receivable_validation', E.Message);
          Exit;
        end;
      end;

      if not LSuccess then
      begin
        TApiResponse.SendError(ARes, 404, 'receivable_not_found', 'Titulo nao encontrado ou ja cancelado.');
        Exit;
      end;

      TApiResponse.SendSuccess(ARes, '{"status":"ok"}');
    end
  );
end;

end.
