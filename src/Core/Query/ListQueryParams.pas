unit ListQueryParams;

interface

type
  TListQueryParams = record
    Page: Integer;
    PageSize: Integer;
    SortBy: string;
    SortDir: string;
    Q: string;
    Status: string;
    Role: string;
    DocumentType: string;
    TaxRegime: string;
    IsActiveSet: Boolean;
    IsActive: Boolean;
    ClientIdSet: Boolean;
    ClientId: Int64;
    OrderIdSet: Boolean;
    OrderId: Int64;
    class function Default: TListQueryParams; static;
    function Offset: Integer;
    function NormalizedSortDir: string;
  end;

implementation

uses
  System.SysUtils;

class function TListQueryParams.Default: TListQueryParams;
begin
  Result.Page := 1;
  Result.PageSize := 20;
  Result.SortBy := '';
  Result.SortDir := 'ASC';
  Result.Q := '';
  Result.Status := '';
  Result.Role := '';
  Result.DocumentType := '';
  Result.TaxRegime := '';
  Result.IsActiveSet := False;
  Result.IsActive := True;
  Result.ClientIdSet := False;
  Result.ClientId := 0;
  Result.OrderIdSet := False;
  Result.OrderId := 0;
end;

function TListQueryParams.Offset: Integer;
begin
  Result := (Page - 1) * PageSize;
end;

function TListQueryParams.NormalizedSortDir: string;
begin
  if SameText(Trim(SortDir), 'DESC') then
    Result := 'DESC'
  else
    Result := 'ASC';
end;

end.
