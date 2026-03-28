unit HealthRoutes;

interface

type
  THealthRoutes = class
  public
    class procedure Register; static;
  end;

implementation

uses
  System.SysUtils,
  System.JSON,
  Horse,
  FireDAC.Comp.Client,
  DBConnectionFactory;

class procedure THealthRoutes.Register;

  procedure AddHealthEndpoint(const APath: string);
  begin
    THorse.Get(APath,
      procedure(Req: THorseRequest; Res: THorseResponse)
      var
        LConnection: TFDConnection;
        LPayload: TJSONObject;
      begin
        LConnection := nil;
        LPayload := TJSONObject.Create;
        try
          LConnection := TConnectionFactory.NewConnection;
          LConnection.ExecSQLScalar('SELECT 1');

          LPayload.AddPair('status', 'ok');
          LPayload.AddPair('database', 'up');
          Res.Status(200).ContentType('application/json').Send(LPayload.ToJSON);
        except
          on E: Exception do
          begin
            LPayload.Free;
            LPayload := TJSONObject.Create;
            LPayload.AddPair('status', 'error');
            LPayload.AddPair('database', 'down');
            LPayload.AddPair('message', E.Message);
            Res.Status(503).ContentType('application/json').Send(LPayload.ToJSON);
          end;
        end;
        LPayload.Free;
        LConnection.Free;
      end);
  end;
begin
  AddHealthEndpoint('/health');
  AddHealthEndpoint('/api/v1/health');
end;

end.
