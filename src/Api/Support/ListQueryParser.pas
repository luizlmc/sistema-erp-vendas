unit ListQueryParser;

interface

uses
  Horse,
  ListQueryParams;

type
  TListQueryParser = class
  public
    class function Parse(const AReq: THorseRequest): TListQueryParams; static;
  end;

implementation

uses
  System.SysUtils;

const
  MAX_PAGE_SIZE = 200;

function ParseBoolText(const AValue: string; out AParsed: Boolean): Boolean;
var
  LValue: string;
begin
  LValue := LowerCase(Trim(AValue));
  if (LValue = 'true') or (LValue = '1') then
  begin
    AParsed := True;
    Exit(True);
  end;
  if (LValue = 'false') or (LValue = '0') then
  begin
    AParsed := False;
    Exit(True);
  end;
  Result := False;
end;

class function TListQueryParser.Parse(const AReq: THorseRequest): TListQueryParams;
var
  LText: string;
  LInt: Integer;
  LInt64: Int64;
  LBool: Boolean;
begin
  Result := TListQueryParams.Default;

  LText := Trim(AReq.Query['page']);
  if (LText <> '') and TryStrToInt(LText, LInt) and (LInt > 0) then
    Result.Page := LInt;

  LText := Trim(AReq.Query['page_size']);
  if (LText <> '') and TryStrToInt(LText, LInt) then
  begin
    if LInt < 1 then LInt := 1;
    if LInt > MAX_PAGE_SIZE then LInt := MAX_PAGE_SIZE;
    Result.PageSize := LInt;
  end;

  Result.SortBy := Trim(AReq.Query['sort_by']);
  Result.SortDir := Trim(AReq.Query['sort_dir']);
  Result.Q := Trim(AReq.Query['q']);
  Result.Status := Trim(AReq.Query['status']);
  Result.Role := Trim(AReq.Query['role']);
  Result.DocumentType := Trim(AReq.Query['document_type']);
  Result.TaxRegime := UpperCase(Trim(AReq.Query['tax_regime']));

  LText := Trim(AReq.Query['is_active']);
  if (LText <> '') and ParseBoolText(LText, LBool) then
  begin
    Result.IsActiveSet := True;
    Result.IsActive := LBool;
  end;

  LText := Trim(AReq.Query['client_id']);
  if (LText <> '') and TryStrToInt64(LText, LInt64) and (LInt64 > 0) then
  begin
    Result.ClientIdSet := True;
    Result.ClientId := LInt64;
  end;

  LText := Trim(AReq.Query['order_id']);
  if (LText <> '') and TryStrToInt64(LText, LInt64) and (LInt64 > 0) then
  begin
    Result.OrderIdSet := True;
    Result.OrderId := LInt64;
  end;
end;

end.
