unit ApiResponse;

interface

uses
  Horse;

type
  TApiResponse = class
  public
    class procedure SendError(
      ARes: THorseResponse;
      const AStatusCode: Integer;
      const ACode: string;
      const AMessage: string
    ); static;
    class procedure SendSuccess(
      ARes: THorseResponse;
      const APayloadJson: string
    ); static;
  end;

implementation

uses
  System.SysUtils,
  RequestContext;

class procedure TApiResponse.SendError(
  ARes: THorseResponse;
  const AStatusCode: Integer;
  const ACode: string;
  const AMessage: string
);
var
  LSafeMessage: string;
begin
  LSafeMessage := StringReplace(AMessage, '"', '\"', [rfReplaceAll]);
  ARes
    .Status(AStatusCode)
    .ContentType('application/json')
    .Send(
      '{"status":"error","code":"' + ACode + '","message":"' + LSafeMessage +
      '","correlation_id":"' + RequestContext.TRequestContext.CorrelationId + '"}'
    );
end;

class procedure TApiResponse.SendSuccess(ARes: THorseResponse; const APayloadJson: string);
begin
  ARes
    .Status(200)
    .ContentType('application/json')
    .Send(APayloadJson);
end;

end.
