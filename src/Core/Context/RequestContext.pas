unit RequestContext;

interface

type
  TRequestContext = class
  public
    class procedure SetCorrelationId(const AValue: string); static;
    class function CorrelationId: string; static;
    class procedure Clear; static;
  end;

implementation

threadvar
  GCorrelationId: string;

class procedure TRequestContext.Clear;
begin
  GCorrelationId := '';
end;

class function TRequestContext.CorrelationId: string;
begin
  Result := GCorrelationId;
end;

class procedure TRequestContext.SetCorrelationId(const AValue: string);
begin
  GCorrelationId := AValue;
end;

end.
