unit AuthRoutes;

interface

uses
  AppConfig;

type
  TAuthRoutes = class
  public
    class procedure Register(const AConfig: TAppConfig); static;
  end;

implementation

uses
  System.SysUtils,
  System.JSON,
  Horse,
  AuthService,
  RefreshTokenService,
  AuthMiddleware,
  AuthSession;

class procedure TAuthRoutes.Register(const AConfig: TAppConfig);
begin
  THorse.Post('/api/v1/auth/login',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LJsonBody: TJSONValue;
      LBodyObj: TJSONObject;
      LLogin: string;
      LPassword: string;
      LResult: TLoginResult;
      LResponse: TJSONObject;
    begin
      LJsonBody := TJSONObject.ParseJSONValue(AReq.Body);
      try
        if (LJsonBody = nil) or not (LJsonBody is TJSONObject) then
        begin
          ARes
            .Status(400)
            .ContentType('application/json')
            .Send('{"status":"error","message":"Payload JSON invalido."}');
          Exit;
        end;

        LBodyObj := TJSONObject(LJsonBody);
        LLogin := LBodyObj.GetValue<string>('login', '');
        LPassword := LBodyObj.GetValue<string>('password', '');

        if (Trim(LLogin) = '') or (Trim(LPassword) = '') then
        begin
          ARes
            .Status(400)
            .ContentType('application/json')
            .Send('{"status":"error","message":"Campos login e password sao obrigatorios."}');
          Exit;
        end;

        LResult := TAuthService.Login(LLogin, LPassword, AConfig);
        if not LResult.Success then
        begin
          ARes
            .Status(401)
            .ContentType('application/json')
            .Send('{"status":"error","message":"Usuario ou senha invalidos."}');
          Exit;
        end;

        LResponse := TJSONObject.Create;
        try
          LResponse.AddPair('status', 'ok');
          LResponse.AddPair('access_token', LResult.AccessToken);
          LResponse.AddPair('refresh_token', LResult.RefreshToken);
          LResponse.AddPair('token_type', 'Bearer');
          LResponse.AddPair('user_id', TJSONNumber.Create(LResult.UserId));
          LResponse.AddPair('login', LResult.Login);
          LResponse.AddPair('name', LResult.FullName);
          ARes
            .Status(200)
            .ContentType('application/json')
            .Send(LResponse.ToJSON);
        finally
          LResponse.Free;
        end;
      finally
        LJsonBody.Free;
      end;
    end
  );

  THorse.Post('/api/v1/auth/refresh',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LJsonBody: TJSONValue;
      LBodyObj: TJSONObject;
      LRefreshToken: string;
      LResult: TLoginResult;
      LResponse: TJSONObject;
    begin
      LJsonBody := TJSONObject.ParseJSONValue(AReq.Body);
      try
        if (LJsonBody = nil) or not (LJsonBody is TJSONObject) then
        begin
          ARes
            .Status(400)
            .ContentType('application/json')
            .Send('{"status":"error","message":"Payload JSON invalido."}');
          Exit;
        end;

        LBodyObj := TJSONObject(LJsonBody);
        LRefreshToken := LBodyObj.GetValue<string>('refresh_token', '');
        if Trim(LRefreshToken) = '' then
        begin
          ARes
            .Status(400)
            .ContentType('application/json')
            .Send('{"status":"error","message":"Campo refresh_token e obrigatorio."}');
          Exit;
        end;

        LResult := TAuthService.Refresh(LRefreshToken, AConfig);
        if not LResult.Success then
        begin
          ARes
            .Status(401)
            .ContentType('application/json')
            .Send('{"status":"error","message":"Refresh token invalido ou expirado."}');
          Exit;
        end;

        LResponse := TJSONObject.Create;
        try
          LResponse.AddPair('status', 'ok');
          LResponse.AddPair('access_token', LResult.AccessToken);
          LResponse.AddPair('refresh_token', LResult.RefreshToken);
          LResponse.AddPair('token_type', 'Bearer');
          ARes
            .Status(200)
            .ContentType('application/json')
            .Send(LResponse.ToJSON);
        finally
          LResponse.Free;
        end;
      finally
        LJsonBody.Free;
      end;
    end
  );

  THorse.Get('/api/v1/auth/me',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LSession: TAuthSession;
      LResponse: TJSONObject;
    begin
      if not TAuthMiddleware.Authorize(AReq, ARes) then
        Exit;

      if not AReq.Sessions.TryGetSession<TAuthSession>(LSession) then
      begin
        ARes
          .Status(401)
          .ContentType('application/json')
          .Send('{"status":"error","message":"Sessao invalida."}');
        Exit;
      end;

      LResponse := TJSONObject.Create;
      try
        LResponse.AddPair('status', 'ok');
        LResponse.AddPair('user_id', TJSONNumber.Create(LSession.UserId));
        LResponse.AddPair('login', LSession.Login);
        LResponse.AddPair('role', LSession.Role);
        ARes
          .Status(200)
          .ContentType('application/json')
          .Send(LResponse.ToJSON);
      finally
        LResponse.Free;
      end;
    end
  );

  THorse.Post('/api/v1/auth/logout',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LJsonBody: TJSONValue;
      LBodyObj: TJSONObject;
      LRefreshToken: string;
      LRevoked: Boolean;
    begin
      LJsonBody := TJSONObject.ParseJSONValue(AReq.Body);
      try
        if (LJsonBody = nil) or not (LJsonBody is TJSONObject) then
        begin
          ARes
            .Status(400)
            .ContentType('application/json')
            .Send('{"status":"error","message":"Payload JSON invalido."}');
          Exit;
        end;

        LBodyObj := TJSONObject(LJsonBody);
        LRefreshToken := LBodyObj.GetValue<string>('refresh_token', '');
        if Trim(LRefreshToken) = '' then
        begin
          ARes
            .Status(400)
            .ContentType('application/json')
            .Send('{"status":"error","message":"Campo refresh_token e obrigatorio."}');
          Exit;
        end;

        LRevoked := TRefreshTokenService.RevokeToken(LRefreshToken);
        if not LRevoked then
        begin
          ARes
            .Status(404)
            .ContentType('application/json')
            .Send('{"status":"error","message":"Refresh token nao encontrado ou ja revogado."}');
          Exit;
        end;

        ARes
          .Status(200)
          .ContentType('application/json')
          .Send('{"status":"ok","message":"Logout realizado com sucesso."}');
      finally
        LJsonBody.Free;
      end;
    end
  );
end;

end.
