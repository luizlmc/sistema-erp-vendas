unit ClientRoutes;

interface

type
  TClientRoutes = class
  public
    class procedure Register; static;
  end;

implementation

uses
  System.SysUtils,
  System.JSON,
  Horse,
  AuthMiddleware,
  ClientService,
  ListQueryParser,
  ListQueryParams,
  ApiResponse;

class procedure TClientRoutes.Register;
begin
  THorse.Get('/api/v1/clients',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LParams: TListQueryParams;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'clients.read') then Exit;
      LParams := TListQueryParser.Parse(AReq);
      TApiResponse.SendSuccess(ARes, TClientService.ListClientsJson(LParams));
    end
  );

  THorse.Get('/api/v1/clients/:id',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LJson: string;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'clients.read') then Exit;
      LId := StrToInt64Def(AReq.Params['id'], 0);
      if LId <= 0 then
      begin
        TApiResponse.SendError(ARes, 400, 'invalid_id', 'ID invalido.');
        Exit;
      end;
      LJson := TClientService.GetClientJson(LId);
      if LJson = '' then
      begin
        TApiResponse.SendError(ARes, 404, 'client_not_found', 'Cliente nao encontrado.');
        Exit;
      end;
      TApiResponse.SendSuccess(ARes, LJson);
    end
  );

  THorse.Post('/api/v1/clients',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LBody: TJSONValue;
      LObj: TJSONObject;
      LInput: TCreateClientInput;
      LId: Int64;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'clients.create') then Exit;
      LBody := TJSONObject.ParseJSONValue(AReq.Body);
      try
        if (LBody = nil) or not (LBody is TJSONObject) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_json', 'Payload JSON invalido.');
          Exit;
        end;
        LObj := TJSONObject(LBody);
        LInput.DocumentType := LObj.GetValue<string>('document_type', '');
        LInput.Document := LObj.GetValue<string>('document', '');
        LInput.Name := LObj.GetValue<string>('name', '');
        LInput.Email := LObj.GetValue<string>('email', '');
        LInput.Phone := LObj.GetValue<string>('phone', '');
        LInput.IsActive := LObj.GetValue<Boolean>('is_active', True);
        if (Trim(LInput.DocumentType) = '') or (Trim(LInput.Document) = '') or (Trim(LInput.Name) = '') then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'Campos document_type, document e name sao obrigatorios.');
          Exit;
        end;

        LId := TClientService.CreateClient(LInput);
        ARes.Status(201).ContentType('application/json').Send('{"status":"ok","id":' + IntToStr(LId) + '}');
      finally
        LBody.Free;
      end;
    end
  );

  THorse.Put('/api/v1/clients/:id',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LBody: TJSONValue;
      LObj: TJSONObject;
      LInput: TUpdateClientInput;
      LOk: Boolean;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'clients.update') then Exit;
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
        LInput.HasDocumentType := LObj.TryGetValue<string>('document_type', LInput.DocumentType);
        LInput.HasDocument := LObj.TryGetValue<string>('document', LInput.Document);
        LInput.HasName := LObj.TryGetValue<string>('name', LInput.Name);
        LInput.HasEmail := LObj.TryGetValue<string>('email', LInput.Email);
        LInput.HasPhone := LObj.TryGetValue<string>('phone', LInput.Phone);
        LInput.HasIsActive := LObj.TryGetValue<Boolean>('is_active', LInput.IsActive);

        LOk := TClientService.UpdateClient(LId, LInput);
        if not LOk then
        begin
          TApiResponse.SendError(ARes, 404, 'client_not_found', 'Cliente nao encontrado ou sem alteracoes.');
          Exit;
        end;
        TApiResponse.SendSuccess(ARes, '{"status":"ok"}');
      finally
        LBody.Free;
      end;
    end
  );

  THorse.Delete('/api/v1/clients/:id',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LOk: Boolean;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'clients.delete') then Exit;
      LId := StrToInt64Def(AReq.Params['id'], 0);
      if LId <= 0 then
      begin
        TApiResponse.SendError(ARes, 400, 'invalid_id', 'ID invalido.');
        Exit;
      end;
      LOk := TClientService.DeleteClient(LId);
      if not LOk then
      begin
        TApiResponse.SendError(ARes, 404, 'client_not_found', 'Cliente nao encontrado.');
        Exit;
      end;
      TApiResponse.SendSuccess(ARes, '{"status":"ok"}');
    end
  );
end;

end.
