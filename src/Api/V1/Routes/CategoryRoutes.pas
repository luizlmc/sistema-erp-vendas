unit CategoryRoutes;

interface

type
  TCategoryRoutes = class
  public
    class procedure Register; static;
  end;

implementation

uses
  System.SysUtils,
  System.JSON,
  Horse,
  AuthMiddleware,
  CategoryService,
  ListQueryParser,
  ListQueryParams,
  ApiResponse;

class procedure TCategoryRoutes.Register;
begin
  THorse.Get('/api/v1/categories',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LParams: TListQueryParams;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'categories.read') then Exit;
      LParams := TListQueryParser.Parse(AReq);
      TApiResponse.SendSuccess(ARes, TCategoryService.ListCategoriesJson(LParams));
    end
  );

  THorse.Get('/api/v1/categories/:id',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LJson: string;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'categories.read') then Exit;
      LId := StrToInt64Def(AReq.Params['id'], 0);
      if LId <= 0 then
      begin
        TApiResponse.SendError(ARes, 400, 'invalid_id', 'ID invalido.');
        Exit;
      end;
      LJson := TCategoryService.GetCategoryJson(LId);
      if LJson = '' then
      begin
        TApiResponse.SendError(ARes, 404, 'category_not_found', 'Categoria nao encontrada.');
        Exit;
      end;
      TApiResponse.SendSuccess(ARes, LJson);
    end
  );

  THorse.Post('/api/v1/categories',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LBody: TJSONValue;
      LObj: TJSONObject;
      LInput: TCreateCategoryInput;
      LId: Int64;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'categories.create') then Exit;
      LBody := TJSONObject.ParseJSONValue(AReq.Body);
      try
        if (LBody = nil) or not (LBody is TJSONObject) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_json', 'Payload JSON invalido.');
          Exit;
        end;
        LObj := TJSONObject(LBody);
        LInput.Code := LObj.GetValue<string>('code', '');
        LInput.Name := LObj.GetValue<string>('name', '');
        LInput.IsActive := LObj.GetValue<Boolean>('is_active', True);
        if (Trim(LInput.Code) = '') or (Trim(LInput.Name) = '') then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'Campos code e name sao obrigatorios.');
          Exit;
        end;
        LId := TCategoryService.CreateCategory(LInput);
        ARes.Status(201).ContentType('application/json').Send('{"status":"ok","id":' + IntToStr(LId) + '}');
      finally
        LBody.Free;
      end;
    end
  );

  THorse.Put('/api/v1/categories/:id',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LBody: TJSONValue;
      LObj: TJSONObject;
      LInput: TUpdateCategoryInput;
      LOk: Boolean;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'categories.update') then Exit;
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
        LInput := Default(TUpdateCategoryInput);
        LInput.HasCode := LObj.TryGetValue<string>('code', LInput.Code);
        LInput.HasName := LObj.TryGetValue<string>('name', LInput.Name);
        LInput.HasIsActive := LObj.TryGetValue<Boolean>('is_active', LInput.IsActive);
        LOk := TCategoryService.UpdateCategory(LId, LInput);
        if not LOk then
        begin
          TApiResponse.SendError(ARes, 404, 'category_not_found', 'Categoria nao encontrada ou sem alteracoes.');
          Exit;
        end;
        TApiResponse.SendSuccess(ARes, '{"status":"ok"}');
      finally
        LBody.Free;
      end;
    end
  );

  THorse.Delete('/api/v1/categories/:id',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LOk: Boolean;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'categories.delete') then Exit;
      LId := StrToInt64Def(AReq.Params['id'], 0);
      if LId <= 0 then
      begin
        TApiResponse.SendError(ARes, 400, 'invalid_id', 'ID invalido.');
        Exit;
      end;
      LOk := TCategoryService.DeleteCategory(LId);
      if not LOk then
      begin
        TApiResponse.SendError(ARes, 404, 'category_not_found', 'Categoria nao encontrada.');
        Exit;
      end;
      TApiResponse.SendSuccess(ARes, '{"status":"ok"}');
    end
  );
end;

end.
