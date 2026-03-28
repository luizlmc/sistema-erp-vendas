unit DatabaseMigrator;

interface

type
  TDatabaseMigrator = class
  public
    class procedure RunPendingMigrations; static;
  end;

implementation

uses
  System.SysUtils,
  System.Classes,
  System.IOUtils,
  FireDAC.Comp.Client,
  FireDAC.Comp.Script,
  FireDAC.Comp.ScriptCommands,
  DBConnectionFactory;

function ResolveMigrationsPath: string;
var
  LBasePath: string;
  LCandidate: string;
begin
  LBasePath := ExcludeTrailingPathDelimiter(ExtractFilePath(ParamStr(0)));

  LCandidate := TPath.Combine(LBasePath, 'Infra\DB\Migrations');
  if TDirectory.Exists(LCandidate) then
    Exit(LCandidate);

  LCandidate := TPath.Combine(LBasePath, 'migrations');
  if TDirectory.Exists(LCandidate) then
    Exit(LCandidate);

  LCandidate := TPath.GetFullPath(TPath.Combine(LBasePath, '..\..\src\Infra\DB\Migrations'));
  if TDirectory.Exists(LCandidate) then
    Exit(LCandidate);

  LCandidate := TPath.GetFullPath(TPath.Combine(LBasePath, '..\Infra\DB\Migrations'));
  if TDirectory.Exists(LCandidate) then
    Exit(LCandidate);

  LCandidate := TPath.GetFullPath(TPath.Combine(LBasePath, '..\..\Infra\DB\Migrations'));
  if TDirectory.Exists(LCandidate) then
    Exit(LCandidate);

  raise Exception.Create('Diretorio de migrations nao encontrado.');
end;

procedure EnsureMigrationsTable(const AConnection: TFDConnection);
begin
  AConnection.ExecSQL(
    'CREATE TABLE IF NOT EXISTS schema_migrations (' +
    ' version VARCHAR(255) PRIMARY KEY,' +
    ' executed_at TIMESTAMP NOT NULL DEFAULT NOW()' +
    ')'
  );
end;

function IsApplied(const AConnection: TFDConnection; const AVersion: string): Boolean;
var
  LQuery: TFDQuery;
begin
  LQuery := TFDQuery.Create(nil);
  try
    LQuery.Connection := AConnection;
    LQuery.SQL.Text :=
      'SELECT 1 FROM schema_migrations WHERE version = :version LIMIT 1';
    LQuery.ParamByName('version').AsString := AVersion;
    LQuery.Open;
    Result := not LQuery.IsEmpty;
  finally
    LQuery.Free;
  end;
end;

procedure MarkApplied(const AConnection: TFDConnection; const AVersion: string);
begin
  AConnection.ExecSQL(
    'INSERT INTO schema_migrations (version) VALUES (:version)',
    [AVersion]
  );
end;

procedure ExecuteSqlScript(const AConnection: TFDConnection; const ASql: string);
var
  LScript: TFDScript;
begin
  LScript := TFDScript.Create(nil);
  try
    LScript.Connection := AConnection;
    LScript.SQLScripts.Clear;
    LScript.SQLScripts.Add;
    LScript.SQLScripts[0].SQL.Text := ASql;
    LScript.ValidateAll;
    LScript.ExecuteAll;
  finally
    LScript.Free;
  end;
end;

class procedure TDatabaseMigrator.RunPendingMigrations;
var
  LConnection: TFDConnection;
  LMigrationsPath: string;
  LFiles: TStringList;
  LFilePath: string;
  LVersion: string;
  LSql: string;
begin
  LMigrationsPath := ResolveMigrationsPath;
  LConnection := TConnectionFactory.NewConnection;
  LFiles := TStringList.Create;
  try
    EnsureMigrationsTable(LConnection);

    LFiles.Sorted := True;
    LFiles.Duplicates := TDuplicates.dupIgnore;
    for LFilePath in TDirectory.GetFiles(LMigrationsPath, '*.sql') do
      LFiles.Add(LFilePath);

    for LFilePath in LFiles do
    begin
      LVersion := ExtractFileName(LFilePath);
      if IsApplied(LConnection, LVersion) then
        Continue;

      LSql := TFile.ReadAllText(LFilePath, TEncoding.UTF8);
      LConnection.StartTransaction;
      try
        ExecuteSqlScript(LConnection, LSql);
        MarkApplied(LConnection, LVersion);
        LConnection.Commit;
      except
        LConnection.Rollback;
        raise;
      end;
    end;
  finally
    LFiles.Free;
    LConnection.Free;
  end;
end;

end.
