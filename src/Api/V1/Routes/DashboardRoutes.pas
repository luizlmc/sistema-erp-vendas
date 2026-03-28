unit DashboardRoutes;

interface

type
  TDashboardRoutes = class
  public
    class procedure Register; static;
  end;

implementation

uses
  Horse,
  AuthMiddleware,
  DashboardService,
  ApiResponse;

class procedure TDashboardRoutes.Register;
begin
  THorse.Get('/api/v1/dashboard/summary',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'dashboard.read') then
        Exit;

      TApiResponse.SendSuccess(
        ARes,
        TDashboardService.SummaryJson(AReq.Query.Field('period').AsString)
      );
    end
  );
end;

end.
