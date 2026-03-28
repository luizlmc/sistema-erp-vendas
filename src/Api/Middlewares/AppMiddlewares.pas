unit AppMiddlewares;

interface

type
  TAppMiddlewares = class
  public
    class procedure Register; static;
  end;

implementation

uses
  System.SysUtils,
  System.DateUtils,
  Horse,
  ApiResponse,
  RequestContext;

class procedure TAppMiddlewares.Register;
  procedure RegisterCorsRoute(const APath: string);
  begin
    THorse.All(APath,
      procedure(AReq: THorseRequest; ARes: THorseResponse; ANext: TNextProc)
      begin
        ARes.AddHeader('Access-Control-Allow-Origin', '*');
        ARes.AddHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        ARes.AddHeader(
          'Access-Control-Allow-Headers',
          'Origin, Content-Type, Accept, Authorization, X-Correlation-Id'
        );
        ARes.AddHeader('Access-Control-Max-Age', '86400');

        if SameText(AReq.RawWebRequest.Method, 'OPTIONS') then
        begin
          ARes.Status(204).Send('');
          Exit;
        end;

        ANext;
      end
    );
  end;
begin
  RegisterCorsRoute('/api/:p1');
  RegisterCorsRoute('/api/:p1/:p2');
  RegisterCorsRoute('/api/:p1/:p2/:p3');
  RegisterCorsRoute('/api/:p1/:p2/:p3/:p4');
  RegisterCorsRoute('/api/:p1/:p2/:p3/:p4/:p5');

  THorse.Use(
    procedure(AReq: THorseRequest; ARes: THorseResponse; ANext: TNextProc)
    begin
      ARes.AddHeader('Access-Control-Allow-Origin', '*');
      ARes.AddHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      ARes.AddHeader(
        'Access-Control-Allow-Headers',
        'Origin, Content-Type, Accept, Authorization, X-Correlation-Id'
      );
      ARes.AddHeader('Access-Control-Max-Age', '86400');
      ANext;
    end
  );

  THorse.Use(
    procedure(AReq: THorseRequest; ARes: THorseResponse; ANext: TNextProc)
    var
      LCorrelationId: string;
      LGUID: TGUID;
    begin
      LCorrelationId := Trim(AReq.Headers['X-Correlation-Id']);
      if LCorrelationId = '' then
      begin
        CreateGUID(LGUID);
        LCorrelationId := GUIDToString(LGUID).Replace('{', '').Replace('}', '');
      end;

      TRequestContext.SetCorrelationId(LCorrelationId);
      ARes.AddHeader('X-Correlation-Id', LCorrelationId);
      try
        ANext;
      finally
        TRequestContext.Clear;
      end;
    end
  );

  THorse.Use(
    procedure(AReq: THorseRequest; ARes: THorseResponse; ANext: TNextProc)
    var
      LStartAt: TDateTime;
      LElapsedMs: Int64;
    begin
      LStartAt := Now;
      ANext;
      LElapsedMs := MilliSecondsBetween(Now, LStartAt);
      try
        Writeln(Format(
          '[%s] [%s] %s %s -> %d (%d ms)',
          [
            FormatDateTime('yyyy-mm-dd hh:nn:ss', Now),
            TRequestContext.CorrelationId,
            AReq.RawWebRequest.Method,
            AReq.RawWebRequest.PathInfo,
            ARes.Status,
            LElapsedMs
          ]
        ));
      except
        // Ignora falhas de escrita quando o processo nao possui console anexado.
      end;
    end
  );

  THorse.Use(
    procedure(AReq: THorseRequest; ARes: THorseResponse; ANext: TNextProc)
    begin
      try
        ANext;
      except
        on E: Exception do
          TApiResponse.SendError(
            ARes,
            500,
            'internal_error',
            'Erro interno no servidor.'
          );
      end;
    end
  );
end;

end.
