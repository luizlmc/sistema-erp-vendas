unit ApiServer;

interface

uses
  AppConfig;

type
  TApiServer = class
  public
    class procedure Start(const AConfig: TAppConfig); static;
  end;

implementation

uses
  System.SysUtils,
  Horse,
  HealthRoutes,
  AuthRoutes,
  UserRoutes,
  ClientRoutes,
  CategoryRoutes,
  OrderRoutes,
  QuoteRoutes,
  ProductRoutes,
  CompanyRoutes,
  ReceivableRoutes,
  DashboardRoutes,
  FiscalRoutes,
  FiscalContext,
  AppMiddlewares,
  AuthMiddleware,
  AuditMiddleware;

class procedure TApiServer.Start(const AConfig: TAppConfig);
begin
  TFiscalContext.Initialize(AConfig.Fiscal);
  TAppMiddlewares.Register;
  TAuthMiddleware.Register(AConfig);
  TAuditMiddleware.Register;
  THealthRoutes.Register;
  TAuthRoutes.Register(AConfig);
  TUserRoutes.Register;
  TClientRoutes.Register;
  TCategoryRoutes.Register;
  TOrderRoutes.Register;
  TQuoteRoutes.Register;
  TProductRoutes.Register;
  TCompanyRoutes.Register;
  TReceivableRoutes.Register;
  TDashboardRoutes.Register;
  TFiscalRoutes.Register;

  THorse.Listen(AConfig.ServerPort,
    procedure
    begin
      Writeln(Format('Servidor ERP ativo em http://localhost:%d', [AConfig.ServerPort]));
      Writeln('Healthcheck: GET /health');
    end);
end;

end.
