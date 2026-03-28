unit AuthSession;

interface

uses
  Horse.Session;

type
  TAuthSession = class(TSession)
  private
    FUserId: Int64;
    FLogin: string;
    FRole: string;
  public
    constructor Create(const AUserId: Int64; const ALogin, ARole: string);
    property UserId: Int64 read FUserId;
    property Login: string read FLogin;
    property &Role: string read FRole;
  end;

implementation

constructor TAuthSession.Create(const AUserId: Int64; const ALogin, ARole: string);
begin
  inherited Create;
  FUserId := AUserId;
  FLogin := ALogin;
  FRole := ARole;
end;

end.
