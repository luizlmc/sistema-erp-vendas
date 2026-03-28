program SistemaERPVendas;

{$APPTYPE CONSOLE}

uses
  System.SysUtils,
  AppConfig in 'Core\AppConfig.pas',
  ApiServer in 'Api\ApiServer.pas',
  AuthSession in 'Api\Auth\AuthSession.pas',
  AppMiddlewares in 'Api\Middlewares\AppMiddlewares.pas',
  AuditMiddleware in 'Api\Middlewares\AuditMiddleware.pas',
  AuthMiddleware in 'Api\Middlewares\AuthMiddleware.pas',
  ApiResponse in 'Api\Support\ApiResponse.pas',
  ListQueryParser in 'Api\Support\ListQueryParser.pas',
  AuthRoutes in 'Api\V1\Routes\AuthRoutes.pas',
  CategoryRoutes in 'Api\V1\Routes\CategoryRoutes.pas',
  ClientRoutes in 'Api\V1\Routes\ClientRoutes.pas',
  CompanyRoutes in 'Api\V1\Routes\CompanyRoutes.pas',
  OrderRoutes in 'Api\V1\Routes\OrderRoutes.pas',
  QuoteRoutes in 'Api\V1\Routes\QuoteRoutes.pas',
  ProductRoutes in 'Api\V1\Routes\ProductRoutes.pas',
  ReceivableRoutes in 'Api\V1\Routes\ReceivableRoutes.pas',
  DashboardRoutes in 'Api\V1\Routes\DashboardRoutes.pas',
  FiscalRoutes in 'Api\V1\Routes\FiscalRoutes.pas',
  UserRoutes in 'Api\V1\Routes\UserRoutes.pas',
  HealthRoutes in 'Api\Routes\HealthRoutes.pas',
  RequestContext in 'Core\Context\RequestContext.pas',
  FiscalContext in 'Core\Fiscal\FiscalContext.pas',
  ListQueryParams in 'Core\Query\ListQueryParams.pas',
  AuditService in 'Services\Audit\AuditService.pas',
  AuthService in 'Services\Auth\AuthService.pas',
  CategoryService in 'Services\Categories\CategoryService.pas',
  ClientService in 'Services\Clients\ClientService.pas',
  CompanyService in 'Services\Companies\CompanyService.pas',
  AcbrNFeProvider in 'Services\Fiscal\AcbrNFeProvider.pas',
  FiscalNFeProviderFactory in 'Services\Fiscal\FiscalNFeProviderFactory.pas',
  FiscalDocumentService in 'Services\Fiscal\FiscalDocumentService.pas',
  MockNFeProvider in 'Services\Fiscal\MockNFeProvider.pas',
  DashboardService in 'Services\Dashboard\DashboardService.pas',
  ReceivableService in 'Services\Finance\ReceivableService.pas',
  OrderService in 'Services\Orders\OrderService.pas',
  QuoteService in 'Services\Quotes\QuoteService.pas',
  ProductService in 'Services\Products\ProductService.pas',
  JwtService in 'Services\Auth\JwtService.pas',
  PermissionService in 'Services\Auth\PermissionService.pas',
  RefreshTokenService in 'Services\Auth\RefreshTokenService.pas',
  UserService in 'Services\Users\UserService.pas',
  DatabaseBootstrap in 'Infra\DB\DatabaseBootstrap.pas',
  DatabaseMigrator in 'Infra\DB\DatabaseMigrator.pas',
  DBConnectionFactory in 'Infra\DB\DBConnectionFactory.pas',
  DBConnectionPool in 'Infra\DB\DBConnectionPool.pas';

begin
  ReportMemoryLeaksOnShutdown := True;
  try
    var LConfig := TAppConfig.LoadDefault;
    try
      TDatabaseBootstrap.Initialize(LConfig);
      TApiServer.Start(LConfig);
    finally
      TDatabaseBootstrap.Finalize;
    end;
  except
    on E: Exception do
    begin
      Writeln('Erro ao inicializar backend: ' + E.Message);
      ExitCode := 1;
    end;
  end;
end.
