unit FiscalRoutes;

interface

type
  TFiscalRoutes = class
  public
    class procedure Register; static;
  end;

implementation

uses
  System.SysUtils,
  System.JSON,
  Horse,
  AuthMiddleware,
  ListQueryParser,
  ListQueryParams,
  ApiResponse,
  FiscalDocumentService;

class procedure TFiscalRoutes.Register;
begin
  THorse.Get('/api/v1/fiscal/provider',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'fiscal.provider.read') then
        Exit;
      TApiResponse.SendSuccess(ARes, TFiscalDocumentService.ProviderInfoJson);
    end
  );

  THorse.Get('/api/v1/fiscal/documents',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LParams: TListQueryParams;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'fiscal.documents.read') then
        Exit;
      LParams := TListQueryParser.Parse(AReq);
      TApiResponse.SendSuccess(ARes, TFiscalDocumentService.ListDocumentsJson(LParams));
    end
  );

  THorse.Get('/api/v1/fiscal/documents/:id',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LJson: string;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'fiscal.documents.read') then
        Exit;

      LId := StrToInt64Def(AReq.Params['id'], 0);
      if LId <= 0 then
      begin
        TApiResponse.SendError(ARes, 400, 'invalid_id', 'ID invalido.');
        Exit;
      end;

      LJson := TFiscalDocumentService.GetDocumentJson(LId);
      if LJson = '' then
      begin
        TApiResponse.SendError(ARes, 404, 'fiscal_not_found', 'Documento fiscal nao encontrado.');
        Exit;
      end;

      TApiResponse.SendSuccess(ARes, LJson);
    end
  );

  THorse.Get('/api/v1/orders/:id/fiscal',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LOrderId: Int64;
      LJson: string;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'fiscal.documents.read') then
        Exit;

      LOrderId := StrToInt64Def(AReq.Params['id'], 0);
      if LOrderId <= 0 then
      begin
        TApiResponse.SendError(ARes, 400, 'invalid_id', 'ID invalido.');
        Exit;
      end;

      LJson := TFiscalDocumentService.GetByOrderJson(LOrderId);
      if LJson = '' then
      begin
        TApiResponse.SendError(ARes, 404, 'fiscal_not_found', 'Documento fiscal nao encontrado para o pedido.');
        Exit;
      end;

      TApiResponse.SendSuccess(ARes, LJson);
    end
  );

  THorse.Post('/api/v1/orders/:id/fiscal/emit',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LOrderId: Int64;
      LBody: TJSONValue;
      LObj: TJSONObject;
      LInput: TFiscalEmitInput;
      LFiscalId: Int64;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'fiscal.documents.emit') then
        Exit;

      LOrderId := StrToInt64Def(AReq.Params['id'], 0);
      if LOrderId <= 0 then
      begin
        TApiResponse.SendError(ARes, 400, 'invalid_id', 'ID invalido.');
        Exit;
      end;

      LInput := Default(TFiscalEmitInput);
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
          LInput.Series := LObj.GetValue<string>('series', '');
          LInput.Number := LObj.GetValue<string>('number', '');
        finally
          LBody.Free;
        end;
      end;

      try
        LFiscalId := TFiscalDocumentService.EmitOrderNFe(LOrderId, LInput);
      except
        on E: Exception do
        begin
          TApiResponse.SendError(ARes, 400, 'fiscal_validation', E.Message);
          Exit;
        end;
      end;

      ARes.Status(201).ContentType('application/json').Send('{"status":"ok","id":' + IntToStr(LFiscalId) + '}');
    end
  );

  THorse.Post('/api/v1/fiscal/documents/:id/cancel',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LBody: TJSONValue;
      LObj: TJSONObject;
      LReason: string;
      LOk: Boolean;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'fiscal.documents.cancel') then
        Exit;

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
        LReason := LObj.GetValue<string>('reason', '');
      finally
        LBody.Free;
      end;

      try
        LOk := TFiscalDocumentService.CancelDocument(LId, LReason);
      except
        on E: Exception do
        begin
          TApiResponse.SendError(ARes, 400, 'fiscal_validation', E.Message);
          Exit;
        end;
      end;

      if not LOk then
      begin
        TApiResponse.SendError(ARes, 404, 'fiscal_not_found', 'Documento fiscal nao encontrado ou ja cancelado.');
        Exit;
      end;

      TApiResponse.SendSuccess(ARes, '{"status":"ok"}');
    end
  );
end;

end.
