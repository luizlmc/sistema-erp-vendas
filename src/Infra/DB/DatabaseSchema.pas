unit DatabaseSchema;

interface

type
  TDatabaseSchema = class
  public
    class procedure EnsureBaseSchema; static;
  end;

implementation

uses
  System.SysUtils,
  System.Hash,
  FireDAC.Comp.Client,
  DBConnectionFactory;

class procedure TDatabaseSchema.EnsureBaseSchema;
const
  CCreateUsersTable =
    'CREATE TABLE IF NOT EXISTS erp_users (' +
    ' id BIGSERIAL PRIMARY KEY,' +
    ' login VARCHAR(80) NOT NULL UNIQUE,' +
    ' full_name VARCHAR(120) NOT NULL,' +
    ' password_hash VARCHAR(128) NOT NULL,' +
    ' role VARCHAR(20) NOT NULL DEFAULT ''USER'',' +
    ' is_active BOOLEAN NOT NULL DEFAULT TRUE,' +
    ' created_at TIMESTAMP NOT NULL DEFAULT NOW()' +
    ')';
  CCreateRefreshTable =
    'CREATE TABLE IF NOT EXISTS erp_refresh_tokens (' +
    ' id BIGSERIAL PRIMARY KEY,' +
    ' user_id BIGINT NOT NULL REFERENCES erp_users(id),' +
    ' token_hash VARCHAR(128) NOT NULL UNIQUE,' +
    ' expires_at TIMESTAMP NOT NULL,' +
    ' created_at TIMESTAMP NOT NULL DEFAULT NOW(),' +
    ' revoked_at TIMESTAMP NULL' +
    ')';
  CSeedAdminUser =
    'INSERT INTO erp_users (login, full_name, password_hash, is_active) ' +
    'SELECT :login, :full_name, :password_hash, TRUE ' +
    'WHERE NOT EXISTS (SELECT 1 FROM erp_users WHERE login = :login_check)';
var
  LConnection: TFDConnection;
  LAdminHash: string;
begin
  LConnection := TConnectionFactory.NewConnection;
  try
    LConnection.ExecSQL(CCreateUsersTable);
    LConnection.ExecSQL(CCreateRefreshTable);
    LConnection.ExecSQL('ALTER TABLE erp_users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT ''USER''');

    LAdminHash := THashSHA2.GetHashString('admin123');
    LConnection.ExecSQL(
      CSeedAdminUser,
      ['admin', 'Administrador', LAdminHash, 'admin']
    );
    LConnection.ExecSQL('UPDATE erp_users SET role = ''ADMIN'' WHERE login = ''admin''');
  finally
    LConnection.Free;
  end;
end;

end.
