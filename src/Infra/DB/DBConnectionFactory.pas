unit DBConnectionFactory;

interface

uses
  FireDAC.Comp.Client;

type
  TConnectionFactory = class
  public
    class function NewConnection: TFDConnection; static;
  end;

implementation

uses
  DBConnectionPool;

class function TConnectionFactory.NewConnection: TFDConnection;
begin
  Result := TFDConnection.Create(nil);
  try
    Result.LoginPrompt := False;
    Result.ConnectionDefName := TConnectionPool.ConnectionDefName;
    Result.ResourceOptions.AutoReconnect := True;
    Result.ResourceOptions.SilentMode := True;
    Result.TxOptions.AutoStop := False;
    Result.Connected := True;
  except
    Result.Free;
    raise;
  end;
end;

end.
