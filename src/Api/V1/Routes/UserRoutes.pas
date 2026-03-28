unit UserRoutes;

interface

type
  TUserRoutes = class
  public
    class procedure Register; static;
  end;

implementation

uses
  System.SysUtils,
  System.JSON,
  Horse,
  UserService,
  AuthMiddleware,
  ListQueryParser,
  ListQueryParams;

class procedure TUserRoutes.Register;
begin
  THorse.Get('/api/v1/users',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LParams: TListQueryParams;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'users.read') then
        Exit;
      LParams := TListQueryParser.Parse(AReq);
      ARes
        .Status(200)
        .ContentType('application/json')
        .Send(TUserService.ListUsersJson(LParams));
    end
  );

  THorse.Get('/api/v1/users/:id',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LJson: string;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'users.read') then
        Exit;

      LId := StrToInt64Def(AReq.Params['id'], 0);
      if LId <= 0 then
      begin
        ARes.Status(400).ContentType('application/json').Send('{"status":"error","message":"ID invalido."}');
        Exit;
      end;

      LJson := TUserService.GetUserJson(LId);
      if LJson = '' then
      begin
        ARes.Status(404).ContentType('application/json').Send('{"status":"error","message":"Usuario nao encontrado."}');
        Exit;
      end;

      ARes.Status(200).ContentType('application/json').Send(LJson);
    end
  );

  THorse.Post('/api/v1/users',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LBody: TJSONValue;
      LObj: TJSONObject;
      LInput: TCreateUserInput;
      LId: Int64;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'users.create') then
        Exit;

      LBody := TJSONObject.ParseJSONValue(AReq.Body);
      try
        if (LBody = nil) or not (LBody is TJSONObject) then
        begin
          ARes.Status(400).ContentType('application/json').Send('{"status":"error","message":"Payload JSON invalido."}');
          Exit;
        end;

        LObj := TJSONObject(LBody);
        LInput.Login := LObj.GetValue<string>('login', '');
        LInput.FullName := LObj.GetValue<string>('full_name', '');
        LInput.Password := LObj.GetValue<string>('password', '');
        LInput.Role := LObj.GetValue<string>('role', 'USER');
        LInput.IsActive := LObj.GetValue<Boolean>('is_active', True);

        if (Trim(LInput.Login) = '') or (Trim(LInput.FullName) = '') or (Trim(LInput.Password) = '') then
        begin
          ARes.Status(400).ContentType('application/json').Send('{"status":"error","message":"Campos login, full_name e password sao obrigatorios."}');
          Exit;
        end;

        LId := TUserService.CreateUser(LInput);
        ARes.Status(201).ContentType('application/json').Send('{"status":"ok","id":' + IntToStr(LId) + '}');
      finally
        LBody.Free;
      end;
    end
  );

  THorse.Put('/api/v1/users/:id',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LBody: TJSONValue;
      LObj: TJSONObject;
      LInput: TUpdateUserInput;
      LSuccess: Boolean;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'users.update') then
        Exit;

      LId := StrToInt64Def(AReq.Params['id'], 0);
      if LId <= 0 then
      begin
        ARes.Status(400).ContentType('application/json').Send('{"status":"error","message":"ID invalido."}');
        Exit;
      end;

      LBody := TJSONObject.ParseJSONValue(AReq.Body);
      try
        if (LBody = nil) or not (LBody is TJSONObject) then
        begin
          ARes.Status(400).ContentType('application/json').Send('{"status":"error","message":"Payload JSON invalido."}');
          Exit;
        end;

        LObj := TJSONObject(LBody);
        LInput.HasLogin := LObj.TryGetValue<string>('login', LInput.Login);
        LInput.HasFullName := LObj.TryGetValue<string>('full_name', LInput.FullName);
        LInput.HasPassword := LObj.TryGetValue<string>('password', LInput.Password);
        LInput.HasRole := LObj.TryGetValue<string>('role', LInput.Role);
        LInput.HasIsActive := LObj.TryGetValue<Boolean>('is_active', LInput.IsActive);

        LSuccess := TUserService.UpdateUser(LId, LInput);
        if not LSuccess then
        begin
          ARes.Status(404).ContentType('application/json').Send('{"status":"error","message":"Usuario nao encontrado ou sem alteracoes."}');
          Exit;
        end;

        ARes.Status(200).ContentType('application/json').Send('{"status":"ok"}');
      finally
        LBody.Free;
      end;
    end
  );

  THorse.Delete('/api/v1/users/:id',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LSuccess: Boolean;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'users.delete') then
        Exit;

      LId := StrToInt64Def(AReq.Params['id'], 0);
      if LId <= 0 then
      begin
        ARes.Status(400).ContentType('application/json').Send('{"status":"error","message":"ID invalido."}');
        Exit;
      end;

      LSuccess := TUserService.DeleteUser(LId);
      if not LSuccess then
      begin
        ARes.Status(404).ContentType('application/json').Send('{"status":"error","message":"Usuario nao encontrado."}');
        Exit;
      end;

      ARes.Status(200).ContentType('application/json').Send('{"status":"ok"}');
    end
  );
end;

end.
