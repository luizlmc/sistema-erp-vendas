unit CompanyService;

interface

uses
  ListQueryParams;

type
  TCreateCompanyInput = record
    Code: string;
    CNPJ: string;
    LegalName: string;
    TradeName: string;
    Porte: string;
    StateRegistration: string;
    CNAE: string;
    TaxRegime: string;
    CRT: string;
    ICMSRate: Double;
    ISSRate: Double;
    CEP: string;
    Street: string;
    Number: string;
    District: string;
    City: string;
    UF: string;
    CertPassword: string;
    CertStatus: string;
    CertDueDate: string;
    FiscalContact: string;
    FiscalEmail: string;
    Phone: string;
    IsActive: Boolean;
  end;

  TUpdateCompanyInput = record
    Code: string;
    CNPJ: string;
    LegalName: string;
    TradeName: string;
    Porte: string;
    StateRegistration: string;
    CNAE: string;
    TaxRegime: string;
    CRT: string;
    ICMSRate: Double;
    ISSRate: Double;
    CEP: string;
    Street: string;
    Number: string;
    District: string;
    City: string;
    UF: string;
    CertPassword: string;
    CertStatus: string;
    CertDueDate: string;
    FiscalContact: string;
    FiscalEmail: string;
    Phone: string;
    IsActive: Boolean;
    HasCode: Boolean;
    HasCNPJ: Boolean;
    HasLegalName: Boolean;
    HasTradeName: Boolean;
    HasPorte: Boolean;
    HasStateRegistration: Boolean;
    HasCNAE: Boolean;
    HasTaxRegime: Boolean;
    HasCRT: Boolean;
    HasICMSRate: Boolean;
    HasISSRate: Boolean;
    HasCEP: Boolean;
    HasStreet: Boolean;
    HasNumber: Boolean;
    HasDistrict: Boolean;
    HasCity: Boolean;
    HasUF: Boolean;
    HasCertPassword: Boolean;
    HasCertStatus: Boolean;
    HasCertDueDate: Boolean;
    ClearCertDueDate: Boolean;
    HasFiscalContact: Boolean;
    HasFiscalEmail: Boolean;
    HasPhone: Boolean;
    HasIsActive: Boolean;
  end;

  TCompanyService = class
  public
    class function ListCompaniesJson(const AParams: TListQueryParams): string; static;
    class function GetCompanyJson(const AId: Int64): string; static;
    class function CreateCompany(const AInput: TCreateCompanyInput): Int64; static;
    class function UpdateCompany(const AId: Int64; const AInput: TUpdateCompanyInput): Boolean; static;
    class function DeleteCompany(const AId: Int64): Boolean; static;
  end;

implementation

uses
  System.SysUtils,
  System.Classes,
  System.JSON,
  Data.DB,
  FireDAC.Comp.Client,
  DBConnectionFactory;

class function TCompanyService.CreateCompany(const AInput: TCreateCompanyInput): Int64;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
begin
  Result := 0;
  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  try
    LQuery.Connection := LConnection;
    LQuery.SQL.Text :=
      'INSERT INTO erp_companies (' +
      'code, cnpj, legal_name, trade_name, porte, state_registration, cnae, tax_regime, crt, icms_rate, iss_rate, ' +
      'cep, street, number, district, city, uf, cert_password, cert_status, cert_due_date, ' +
      'fiscal_contact, fiscal_email, phone, is_active' +
      ') VALUES (' +
      ':code, :cnpj, :legal_name, :trade_name, :porte, :state_registration, :cnae, :tax_regime, :crt, :icms_rate, :iss_rate, ' +
      ':cep, :street, :number, :district, :city, :uf, :cert_password, :cert_status, :cert_due_date, ' +
      ':fiscal_contact, :fiscal_email, :phone, :is_active' +
      ') RETURNING id';
    LQuery.ParamByName('code').AsString := UpperCase(Trim(AInput.Code));
    LQuery.ParamByName('cnpj').AsString := Trim(AInput.CNPJ);
    LQuery.ParamByName('legal_name').AsString := Trim(AInput.LegalName);
    LQuery.ParamByName('trade_name').AsString := Trim(AInput.TradeName);
    LQuery.ParamByName('porte').AsString := Trim(AInput.Porte);
    LQuery.ParamByName('state_registration').AsString := Trim(AInput.StateRegistration);
    LQuery.ParamByName('cnae').AsString := Trim(AInput.CNAE);
    LQuery.ParamByName('tax_regime').AsString := UpperCase(Trim(AInput.TaxRegime));
    LQuery.ParamByName('crt').AsString := Trim(AInput.CRT);
    LQuery.ParamByName('icms_rate').AsFloat := AInput.ICMSRate;
    LQuery.ParamByName('iss_rate').AsFloat := AInput.ISSRate;
    LQuery.ParamByName('cep').AsString := Trim(AInput.CEP);
    LQuery.ParamByName('street').AsString := Trim(AInput.Street);
    LQuery.ParamByName('number').AsString := Trim(AInput.Number);
    LQuery.ParamByName('district').AsString := Trim(AInput.District);
    LQuery.ParamByName('city').AsString := Trim(AInput.City);
    LQuery.ParamByName('uf').AsString := UpperCase(Trim(AInput.UF));
    LQuery.ParamByName('cert_password').AsString := Trim(AInput.CertPassword);
    LQuery.ParamByName('cert_status').AsString := LowerCase(Trim(AInput.CertStatus));
    if Trim(AInput.CertDueDate) <> '' then
      LQuery.ParamByName('cert_due_date').AsString := Trim(AInput.CertDueDate)
    else
    begin
      LQuery.ParamByName('cert_due_date').DataType := ftDate;
      LQuery.ParamByName('cert_due_date').Clear;
    end;
    LQuery.ParamByName('fiscal_contact').AsString := Trim(AInput.FiscalContact);
    LQuery.ParamByName('fiscal_email').AsString := Trim(AInput.FiscalEmail);
    LQuery.ParamByName('phone').AsString := Trim(AInput.Phone);
    LQuery.ParamByName('is_active').AsBoolean := AInput.IsActive;
    LQuery.Open;
    Result := LQuery.Fields[0].AsLargeInt;
  finally
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TCompanyService.DeleteCompany(const AId: Int64): Boolean;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
begin
  Result := False;
  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  try
    LQuery.Connection := LConnection;
    LQuery.SQL.Text :=
      'UPDATE erp_companies ' +
      'SET is_active = FALSE, updated_at = NOW() ' +
      'WHERE id = :id RETURNING id';
    LQuery.ParamByName('id').AsLargeInt := AId;
    LQuery.Open;
    Result := not LQuery.IsEmpty;
  finally
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TCompanyService.GetCompanyJson(const AId: Int64): string;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
  LItem: TJSONObject;
begin
  Result := '';
  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  try
    LQuery.Connection := LConnection;
    LQuery.SQL.Text :=
      'SELECT id, code, cnpj, legal_name, trade_name, porte, state_registration, cnae, tax_regime, crt, icms_rate, iss_rate, ' +
      'cep, street, number, district, city, uf, cert_password, cert_status, cert_due_date, fiscal_contact, fiscal_email, phone, ' +
      'is_active, created_at, updated_at ' +
      'FROM erp_companies WHERE id = :id LIMIT 1';
    LQuery.ParamByName('id').AsLargeInt := AId;
    LQuery.Open;
    if LQuery.IsEmpty then
      Exit;

    LItem := TJSONObject.Create;
    try
      LItem.AddPair('id', TJSONNumber.Create(LQuery.FieldByName('id').AsLargeInt));
      LItem.AddPair('code', LQuery.FieldByName('code').AsString);
      LItem.AddPair('cnpj', LQuery.FieldByName('cnpj').AsString);
      LItem.AddPair('legal_name', LQuery.FieldByName('legal_name').AsString);
      LItem.AddPair('trade_name', LQuery.FieldByName('trade_name').AsString);
      LItem.AddPair('porte', LQuery.FieldByName('porte').AsString);
      LItem.AddPair('state_registration', LQuery.FieldByName('state_registration').AsString);
      LItem.AddPair('cnae', LQuery.FieldByName('cnae').AsString);
      LItem.AddPair('tax_regime', LQuery.FieldByName('tax_regime').AsString);
      LItem.AddPair('crt', LQuery.FieldByName('crt').AsString);
      LItem.AddPair('icms_rate', TJSONNumber.Create(LQuery.FieldByName('icms_rate').AsFloat));
      LItem.AddPair('iss_rate', TJSONNumber.Create(LQuery.FieldByName('iss_rate').AsFloat));
      LItem.AddPair('cep', LQuery.FieldByName('cep').AsString);
      LItem.AddPair('street', LQuery.FieldByName('street').AsString);
      LItem.AddPair('number', LQuery.FieldByName('number').AsString);
      LItem.AddPair('district', LQuery.FieldByName('district').AsString);
      LItem.AddPair('city', LQuery.FieldByName('city').AsString);
      LItem.AddPair('uf', LQuery.FieldByName('uf').AsString);
      LItem.AddPair('cert_password', LQuery.FieldByName('cert_password').AsString);
      LItem.AddPair('cert_status', LQuery.FieldByName('cert_status').AsString);
      if LQuery.FieldByName('cert_due_date').IsNull then
        LItem.AddPair('cert_due_date', TJSONNull.Create)
      else
        LItem.AddPair('cert_due_date', LQuery.FieldByName('cert_due_date').AsString);
      LItem.AddPair('fiscal_contact', LQuery.FieldByName('fiscal_contact').AsString);
      LItem.AddPair('fiscal_email', LQuery.FieldByName('fiscal_email').AsString);
      LItem.AddPair('phone', LQuery.FieldByName('phone').AsString);
      LItem.AddPair('is_active', TJSONBool.Create(LQuery.FieldByName('is_active').AsBoolean));
      LItem.AddPair('created_at', LQuery.FieldByName('created_at').AsString);
      if LQuery.FieldByName('updated_at').IsNull then
        LItem.AddPair('updated_at', TJSONNull.Create)
      else
        LItem.AddPair('updated_at', LQuery.FieldByName('updated_at').AsString);
      Result := LItem.ToJSON;
    finally
      LItem.Free;
    end;
  finally
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TCompanyService.ListCompaniesJson(const AParams: TListQueryParams): string;
var
  LConnection: TFDConnection;
  LQuery: TFDQuery;
  LCountQuery: TFDQuery;
  LList: TJSONArray;
  LRoot: TJSONObject;
  LPagination: TJSONObject;
  LSort: TJSONObject;
  LFilters: TJSONObject;
  LItem: TJSONObject;
  LConditions: TStringList;
  LWhere: string;
  LSortBy: string;
  LSortDir: string;
  LLike: string;
  LTotal: Int64;
  LTotalPages: Int64;
  I: Integer;

  function ResolveSortBy(const AValue: string): string;
  begin
    if SameText(AValue, 'code') then Exit('code');
    if SameText(AValue, 'cnpj') then Exit('cnpj');
    if SameText(AValue, 'legal_name') then Exit('legal_name');
    if SameText(AValue, 'tax_regime') then Exit('tax_regime');
    if SameText(AValue, 'is_active') then Exit('is_active');
    if SameText(AValue, 'created_at') then Exit('created_at');
    Result := 'id';
  end;
begin
  LConnection := TConnectionFactory.NewConnection;
  LQuery := TFDQuery.Create(nil);
  LCountQuery := TFDQuery.Create(nil);
  LList := TJSONArray.Create;
  LRoot := TJSONObject.Create;
  LPagination := TJSONObject.Create;
  LSort := TJSONObject.Create;
  LFilters := TJSONObject.Create;
  LConditions := TStringList.Create;
  try
    if Trim(AParams.TaxRegime) <> '' then
      LConditions.Add('tax_regime = :tax_regime');
    if AParams.IsActiveSet then
      LConditions.Add('is_active = :is_active');
    if Trim(AParams.Q) <> '' then
      LConditions.Add('(code ILIKE :q OR cnpj ILIKE :q OR legal_name ILIKE :q OR trade_name ILIKE :q)');

    LWhere := '';
    if LConditions.Count > 0 then
    begin
      LWhere := ' WHERE ';
      for I := 0 to LConditions.Count - 1 do
      begin
        if I > 0 then
          LWhere := LWhere + ' AND ';
        LWhere := LWhere + LConditions[I];
      end;
    end;

    LSortBy := ResolveSortBy(AParams.SortBy);
    LSortDir := AParams.NormalizedSortDir;
    LLike := '%' + Trim(AParams.Q) + '%';

    LCountQuery.Connection := LConnection;
    LCountQuery.SQL.Text := 'SELECT COUNT(*) AS total FROM erp_companies' + LWhere;
    if Trim(AParams.TaxRegime) <> '' then
      LCountQuery.ParamByName('tax_regime').AsString := UpperCase(Trim(AParams.TaxRegime));
    if AParams.IsActiveSet then
      LCountQuery.ParamByName('is_active').AsBoolean := AParams.IsActive;
    if Trim(AParams.Q) <> '' then
      LCountQuery.ParamByName('q').AsString := LLike;
    LCountQuery.Open;
    LTotal := LCountQuery.FieldByName('total').AsLargeInt;
    LCountQuery.Close;

    LQuery.Connection := LConnection;
    LQuery.SQL.Text :=
      'SELECT id, code, cnpj, legal_name, trade_name, porte, state_registration, cnae, tax_regime, crt, icms_rate, iss_rate, ' +
      'cep, street, number, district, city, uf, cert_password, cert_status, cert_due_date, fiscal_contact, fiscal_email, phone, ' +
      'is_active, created_at, updated_at ' +
      'FROM erp_companies ' + LWhere + ' ' +
      'ORDER BY ' + LSortBy + ' ' + LSortDir + ' ' +
      'LIMIT :limit OFFSET :offset';
    if Trim(AParams.TaxRegime) <> '' then
      LQuery.ParamByName('tax_regime').AsString := UpperCase(Trim(AParams.TaxRegime));
    if AParams.IsActiveSet then
      LQuery.ParamByName('is_active').AsBoolean := AParams.IsActive;
    if Trim(AParams.Q) <> '' then
      LQuery.ParamByName('q').AsString := LLike;
    LQuery.ParamByName('limit').AsInteger := AParams.PageSize;
    LQuery.ParamByName('offset').AsInteger := AParams.Offset;
    LQuery.Open;
    while not LQuery.Eof do
    begin
      LItem := TJSONObject.Create;
      LItem.AddPair('id', TJSONNumber.Create(LQuery.FieldByName('id').AsLargeInt));
      LItem.AddPair('code', LQuery.FieldByName('code').AsString);
      LItem.AddPair('cnpj', LQuery.FieldByName('cnpj').AsString);
      LItem.AddPair('legal_name', LQuery.FieldByName('legal_name').AsString);
      LItem.AddPair('trade_name', LQuery.FieldByName('trade_name').AsString);
      LItem.AddPair('porte', LQuery.FieldByName('porte').AsString);
      LItem.AddPair('state_registration', LQuery.FieldByName('state_registration').AsString);
      LItem.AddPair('cnae', LQuery.FieldByName('cnae').AsString);
      LItem.AddPair('tax_regime', LQuery.FieldByName('tax_regime').AsString);
      LItem.AddPair('crt', LQuery.FieldByName('crt').AsString);
      LItem.AddPair('icms_rate', TJSONNumber.Create(LQuery.FieldByName('icms_rate').AsFloat));
      LItem.AddPair('iss_rate', TJSONNumber.Create(LQuery.FieldByName('iss_rate').AsFloat));
      LItem.AddPair('cep', LQuery.FieldByName('cep').AsString);
      LItem.AddPair('street', LQuery.FieldByName('street').AsString);
      LItem.AddPair('number', LQuery.FieldByName('number').AsString);
      LItem.AddPair('district', LQuery.FieldByName('district').AsString);
      LItem.AddPair('city', LQuery.FieldByName('city').AsString);
      LItem.AddPair('uf', LQuery.FieldByName('uf').AsString);
      LItem.AddPair('cert_password', LQuery.FieldByName('cert_password').AsString);
      LItem.AddPair('cert_status', LQuery.FieldByName('cert_status').AsString);
      if LQuery.FieldByName('cert_due_date').IsNull then
        LItem.AddPair('cert_due_date', TJSONNull.Create)
      else
        LItem.AddPair('cert_due_date', LQuery.FieldByName('cert_due_date').AsString);
      LItem.AddPair('fiscal_contact', LQuery.FieldByName('fiscal_contact').AsString);
      LItem.AddPair('fiscal_email', LQuery.FieldByName('fiscal_email').AsString);
      LItem.AddPair('phone', LQuery.FieldByName('phone').AsString);
      LItem.AddPair('is_active', TJSONBool.Create(LQuery.FieldByName('is_active').AsBoolean));
      LItem.AddPair('created_at', LQuery.FieldByName('created_at').AsString);
      if LQuery.FieldByName('updated_at').IsNull then
        LItem.AddPair('updated_at', TJSONNull.Create)
      else
        LItem.AddPair('updated_at', LQuery.FieldByName('updated_at').AsString);
      LList.AddElement(LItem);
      LQuery.Next;
    end;

    if AParams.PageSize <= 0 then
      LTotalPages := 1
    else
      LTotalPages := (LTotal + AParams.PageSize - 1) div AParams.PageSize;
    if LTotalPages = 0 then
      LTotalPages := 1;

    LPagination.AddPair('page', TJSONNumber.Create(AParams.Page));
    LPagination.AddPair('page_size', TJSONNumber.Create(AParams.PageSize));
    LPagination.AddPair('total', TJSONNumber.Create(LTotal));
    LPagination.AddPair('total_pages', TJSONNumber.Create(LTotalPages));

    LSort.AddPair('by', LSortBy);
    LSort.AddPair('dir', LSortDir);

    if Trim(AParams.Q) = '' then
      LFilters.AddPair('q', TJSONNull.Create)
    else
      LFilters.AddPair('q', Trim(AParams.Q));
    if Trim(AParams.TaxRegime) = '' then
      LFilters.AddPair('tax_regime', TJSONNull.Create)
    else
      LFilters.AddPair('tax_regime', UpperCase(Trim(AParams.TaxRegime)));
    if AParams.IsActiveSet then
      LFilters.AddPair('is_active', TJSONBool.Create(AParams.IsActive))
    else
      LFilters.AddPair('is_active', TJSONNull.Create);

    LRoot.AddPair('items', LList);
    LRoot.AddPair('pagination', LPagination);
    LRoot.AddPair('sort', LSort);
    LRoot.AddPair('filters', LFilters);
    LList := nil;
    LPagination := nil;
    LSort := nil;
    LFilters := nil;
    Result := LRoot.ToJSON;
  finally
    LConditions.Free;
    if Assigned(LFilters) then LFilters.Free;
    if Assigned(LSort) then LSort.Free;
    if Assigned(LPagination) then LPagination.Free;
    LRoot.Free;
    if Assigned(LList) then LList.Free;
    LCountQuery.Free;
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TCompanyService.UpdateCompany(const AId: Int64; const AInput: TUpdateCompanyInput): Boolean;
var
  LConnection: TFDConnection;
  LFields: TStringList;
  LSql: string;
  LQuery: TFDQuery;
  I: Integer;
begin
  Result := False;
  LConnection := TConnectionFactory.NewConnection;
  LFields := TStringList.Create;
  LQuery := TFDQuery.Create(nil);
  try
    if AInput.HasCode then LFields.Add('code = :code');
    if AInput.HasCNPJ then LFields.Add('cnpj = :cnpj');
    if AInput.HasLegalName then LFields.Add('legal_name = :legal_name');
    if AInput.HasTradeName then LFields.Add('trade_name = :trade_name');
    if AInput.HasPorte then LFields.Add('porte = :porte');
    if AInput.HasStateRegistration then LFields.Add('state_registration = :state_registration');
    if AInput.HasCNAE then LFields.Add('cnae = :cnae');
    if AInput.HasTaxRegime then LFields.Add('tax_regime = :tax_regime');
    if AInput.HasCRT then LFields.Add('crt = :crt');
    if AInput.HasICMSRate then LFields.Add('icms_rate = :icms_rate');
    if AInput.HasISSRate then LFields.Add('iss_rate = :iss_rate');
    if AInput.HasCEP then LFields.Add('cep = :cep');
    if AInput.HasStreet then LFields.Add('street = :street');
    if AInput.HasNumber then LFields.Add('number = :number');
    if AInput.HasDistrict then LFields.Add('district = :district');
    if AInput.HasCity then LFields.Add('city = :city');
    if AInput.HasUF then LFields.Add('uf = :uf');
    if AInput.HasCertPassword then LFields.Add('cert_password = :cert_password');
    if AInput.HasCertStatus then LFields.Add('cert_status = :cert_status');
    if AInput.HasCertDueDate then
      LFields.Add('cert_due_date = :cert_due_date');
    if AInput.HasFiscalContact then LFields.Add('fiscal_contact = :fiscal_contact');
    if AInput.HasFiscalEmail then LFields.Add('fiscal_email = :fiscal_email');
    if AInput.HasPhone then LFields.Add('phone = :phone');
    if AInput.HasIsActive then LFields.Add('is_active = :is_active');
    if LFields.Count = 0 then Exit(False);

    LSql := 'UPDATE erp_companies SET ';
    for I := 0 to LFields.Count - 1 do
    begin
      if I > 0 then
        LSql := LSql + ', ';
      LSql := LSql + LFields[I];
    end;
    LSql := LSql + ', updated_at = NOW() WHERE id = :id RETURNING id';

    LQuery.Connection := LConnection;
    LQuery.SQL.Text := LSql;
    if AInput.HasCode then LQuery.ParamByName('code').AsString := UpperCase(Trim(AInput.Code));
    if AInput.HasCNPJ then LQuery.ParamByName('cnpj').AsString := Trim(AInput.CNPJ);
    if AInput.HasLegalName then LQuery.ParamByName('legal_name').AsString := Trim(AInput.LegalName);
    if AInput.HasTradeName then LQuery.ParamByName('trade_name').AsString := Trim(AInput.TradeName);
    if AInput.HasPorte then LQuery.ParamByName('porte').AsString := Trim(AInput.Porte);
    if AInput.HasStateRegistration then LQuery.ParamByName('state_registration').AsString := Trim(AInput.StateRegistration);
    if AInput.HasCNAE then LQuery.ParamByName('cnae').AsString := Trim(AInput.CNAE);
    if AInput.HasTaxRegime then LQuery.ParamByName('tax_regime').AsString := UpperCase(Trim(AInput.TaxRegime));
    if AInput.HasCRT then LQuery.ParamByName('crt').AsString := Trim(AInput.CRT);
    if AInput.HasICMSRate then LQuery.ParamByName('icms_rate').AsFloat := AInput.ICMSRate;
    if AInput.HasISSRate then LQuery.ParamByName('iss_rate').AsFloat := AInput.ISSRate;
    if AInput.HasCEP then LQuery.ParamByName('cep').AsString := Trim(AInput.CEP);
    if AInput.HasStreet then LQuery.ParamByName('street').AsString := Trim(AInput.Street);
    if AInput.HasNumber then LQuery.ParamByName('number').AsString := Trim(AInput.Number);
    if AInput.HasDistrict then LQuery.ParamByName('district').AsString := Trim(AInput.District);
    if AInput.HasCity then LQuery.ParamByName('city').AsString := Trim(AInput.City);
    if AInput.HasUF then LQuery.ParamByName('uf').AsString := UpperCase(Trim(AInput.UF));
    if AInput.HasCertPassword then LQuery.ParamByName('cert_password').AsString := Trim(AInput.CertPassword);
    if AInput.HasCertStatus then LQuery.ParamByName('cert_status').AsString := LowerCase(Trim(AInput.CertStatus));
    if AInput.HasCertDueDate then
    begin
      if AInput.ClearCertDueDate or (Trim(AInput.CertDueDate) = '') then
      begin
        LQuery.ParamByName('cert_due_date').DataType := ftDate;
        LQuery.ParamByName('cert_due_date').Clear;
      end
      else
        LQuery.ParamByName('cert_due_date').AsString := Trim(AInput.CertDueDate);
    end;
    if AInput.HasFiscalContact then LQuery.ParamByName('fiscal_contact').AsString := Trim(AInput.FiscalContact);
    if AInput.HasFiscalEmail then LQuery.ParamByName('fiscal_email').AsString := Trim(AInput.FiscalEmail);
    if AInput.HasPhone then LQuery.ParamByName('phone').AsString := Trim(AInput.Phone);
    if AInput.HasIsActive then LQuery.ParamByName('is_active').AsBoolean := AInput.IsActive;
    LQuery.ParamByName('id').AsLargeInt := AId;
    LQuery.Open;
    Result := not LQuery.IsEmpty;
  finally
    LQuery.Free;
    LFields.Free;
    LConnection.Free;
  end;
end;

end.
