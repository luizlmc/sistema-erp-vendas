unit ProductService;

interface

uses
  ListQueryParams;

type
  TCreateProductInput = record
    SKU: string;
    Name: string;
    Description: string;
    GTIN: string;
    NCM: string;
    CEST: string;
    CFOP: string;
    UCom: string;
    UTrib: string;
    EXTIPI: string;
    CBenef: string;
    NVE: string;
    IndEscala: string;
    CNPJFab: string;
    ICMSOrig: string;
    ICMSCST: string;
    ICMSCSOSN: string;
    ICMSModBC: string;
    ICMSPRedBC: Double;
    ICMSPICMS: Double;
    IPICST: string;
    IPICEnq: string;
    IPIPIPI: Double;
    PISCST: string;
    PISPIS: Double;
    COFINSCST: string;
    COFINSPCOFINS: Double;
    CategoryId: Int64;
    HasCategoryId: Boolean;
    UnitPrice: Double;
    StockQty: Double;
    IsActive: Boolean;
  end;

  TUpdateProductInput = record
    SKU: string;
    Name: string;
    Description: string;
    GTIN: string;
    NCM: string;
    CEST: string;
    CFOP: string;
    UCom: string;
    UTrib: string;
    EXTIPI: string;
    CBenef: string;
    NVE: string;
    IndEscala: string;
    CNPJFab: string;
    ICMSOrig: string;
    ICMSCST: string;
    ICMSCSOSN: string;
    ICMSModBC: string;
    ICMSPRedBC: Double;
    ICMSPICMS: Double;
    IPICST: string;
    IPICEnq: string;
    IPIPIPI: Double;
    PISCST: string;
    PISPIS: Double;
    COFINSCST: string;
    COFINSPCOFINS: Double;
    CategoryId: Int64;
    UnitPrice: Double;
    StockQty: Double;
    IsActive: Boolean;
    HasSKU: Boolean;
    HasName: Boolean;
    HasDescription: Boolean;
    HasGTIN: Boolean;
    HasNCM: Boolean;
    HasCEST: Boolean;
    ClearCEST: Boolean;
    HasCFOP: Boolean;
    HasUCom: Boolean;
    HasUTrib: Boolean;
    HasEXTIPI: Boolean;
    ClearEXTIPI: Boolean;
    HasCBenef: Boolean;
    ClearCBenef: Boolean;
    HasNVE: Boolean;
    ClearNVE: Boolean;
    HasIndEscala: Boolean;
    ClearIndEscala: Boolean;
    HasCNPJFab: Boolean;
    ClearCNPJFab: Boolean;
    HasICMSOrig: Boolean;
    HasICMSCST: Boolean;
    ClearICMSCST: Boolean;
    HasICMSCSOSN: Boolean;
    ClearICMSCSOSN: Boolean;
    HasICMSModBC: Boolean;
    ClearICMSModBC: Boolean;
    HasICMSPRedBC: Boolean;
    HasICMSPICMS: Boolean;
    HasIPICST: Boolean;
    ClearIPICST: Boolean;
    HasIPICEnq: Boolean;
    ClearIPICEnq: Boolean;
    HasIPIPIPI: Boolean;
    HasPISCST: Boolean;
    HasPISPIS: Boolean;
    HasCOFINSCST: Boolean;
    HasCOFINSPCOFINS: Boolean;
    HasCategoryId: Boolean;
    ClearCategoryId: Boolean;
    HasUnitPrice: Boolean;
    HasStockQty: Boolean;
    HasIsActive: Boolean;
  end;

  TProductService = class
  public
    class function ListProductsJson(const AParams: TListQueryParams): string; static;
    class function GetProductJson(const AId: Int64): string; static;
    class function CreateProduct(const AInput: TCreateProductInput): Int64; static;
    class function UpdateProduct(const AId: Int64; const AInput: TUpdateProductInput): Boolean; static;
    class function DeleteProduct(const AId: Int64): Boolean; static;
  end;

implementation

uses
  System.SysUtils,
  System.Classes,
  System.JSON,
  Data.DB,
  FireDAC.Comp.Client,
  DBConnectionFactory;

class function TProductService.CreateProduct(const AInput: TCreateProductInput): Int64;
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
      'INSERT INTO erp_products (' +
      'sku, name, description, gtin, ncm, cest, cfop, u_com, u_trib, extipi, cbenef, nve, ind_escala, cnpj_fab, ' +
      'icms_orig, icms_cst, icms_csosn, icms_mod_bc, icms_p_red_bc, icms_p_icms, ipi_cst, ipi_c_enq, ipi_p_ipi, ' +
      'pis_cst, pis_p_pis, cofins_cst, cofins_p_cofins, category_id, unit_price, stock_qty, is_active' +
      ') VALUES (' +
      ':sku, :name, :description, :gtin, :ncm, :cest, :cfop, :u_com, :u_trib, :extipi, :cbenef, :nve, :ind_escala, :cnpj_fab, ' +
      ':icms_orig, :icms_cst, :icms_csosn, :icms_mod_bc, :icms_p_red_bc, :icms_p_icms, :ipi_cst, :ipi_c_enq, :ipi_p_ipi, ' +
      ':pis_cst, :pis_p_pis, :cofins_cst, :cofins_p_cofins, :category_id, :unit_price, :stock_qty, :is_active' +
      ') ' +
      'RETURNING id';
    LQuery.ParamByName('sku').AsString := UpperCase(Trim(AInput.SKU));
    LQuery.ParamByName('name').AsString := Trim(AInput.Name);
    LQuery.ParamByName('description').AsString := Trim(AInput.Description);
    LQuery.ParamByName('gtin').AsString := UpperCase(Trim(AInput.GTIN));
    LQuery.ParamByName('ncm').AsString := Trim(AInput.NCM);
    if Trim(AInput.CEST) <> '' then
      LQuery.ParamByName('cest').AsString := Trim(AInput.CEST)
    else
    begin
      LQuery.ParamByName('cest').DataType := ftString;
      LQuery.ParamByName('cest').Clear;
    end;
    LQuery.ParamByName('cfop').AsString := Trim(AInput.CFOP);
    LQuery.ParamByName('u_com').AsString := UpperCase(Trim(AInput.UCom));
    LQuery.ParamByName('u_trib').AsString := UpperCase(Trim(AInput.UTrib));
    if Trim(AInput.EXTIPI) <> '' then
      LQuery.ParamByName('extipi').AsString := Trim(AInput.EXTIPI)
    else
    begin
      LQuery.ParamByName('extipi').DataType := ftString;
      LQuery.ParamByName('extipi').Clear;
    end;
    if Trim(AInput.CBenef) <> '' then
      LQuery.ParamByName('cbenef').AsString := UpperCase(Trim(AInput.CBenef))
    else
    begin
      LQuery.ParamByName('cbenef').DataType := ftString;
      LQuery.ParamByName('cbenef').Clear;
    end;
    if Trim(AInput.NVE) <> '' then
      LQuery.ParamByName('nve').AsString := UpperCase(Trim(AInput.NVE))
    else
    begin
      LQuery.ParamByName('nve').DataType := ftString;
      LQuery.ParamByName('nve').Clear;
    end;
    if Trim(AInput.IndEscala) <> '' then
      LQuery.ParamByName('ind_escala').AsString := UpperCase(Trim(AInput.IndEscala))
    else
    begin
      LQuery.ParamByName('ind_escala').DataType := ftString;
      LQuery.ParamByName('ind_escala').Clear;
    end;
    if Trim(AInput.CNPJFab) <> '' then
      LQuery.ParamByName('cnpj_fab').AsString := Trim(AInput.CNPJFab)
    else
    begin
      LQuery.ParamByName('cnpj_fab').DataType := ftString;
      LQuery.ParamByName('cnpj_fab').Clear;
    end;
    LQuery.ParamByName('icms_orig').AsString := Trim(AInput.ICMSOrig);
    if Trim(AInput.ICMSCST) <> '' then
      LQuery.ParamByName('icms_cst').AsString := Trim(AInput.ICMSCST)
    else
    begin
      LQuery.ParamByName('icms_cst').DataType := ftString;
      LQuery.ParamByName('icms_cst').Clear;
    end;
    if Trim(AInput.ICMSCSOSN) <> '' then
      LQuery.ParamByName('icms_csosn').AsString := Trim(AInput.ICMSCSOSN)
    else
    begin
      LQuery.ParamByName('icms_csosn').DataType := ftString;
      LQuery.ParamByName('icms_csosn').Clear;
    end;
    if Trim(AInput.ICMSModBC) <> '' then
      LQuery.ParamByName('icms_mod_bc').AsString := Trim(AInput.ICMSModBC)
    else
    begin
      LQuery.ParamByName('icms_mod_bc').DataType := ftString;
      LQuery.ParamByName('icms_mod_bc').Clear;
    end;
    LQuery.ParamByName('icms_p_red_bc').AsFloat := AInput.ICMSPRedBC;
    LQuery.ParamByName('icms_p_icms').AsFloat := AInput.ICMSPICMS;
    if Trim(AInput.IPICST) <> '' then
      LQuery.ParamByName('ipi_cst').AsString := Trim(AInput.IPICST)
    else
    begin
      LQuery.ParamByName('ipi_cst').DataType := ftString;
      LQuery.ParamByName('ipi_cst').Clear;
    end;
    if Trim(AInput.IPICEnq) <> '' then
      LQuery.ParamByName('ipi_c_enq').AsString := Trim(AInput.IPICEnq)
    else
    begin
      LQuery.ParamByName('ipi_c_enq').DataType := ftString;
      LQuery.ParamByName('ipi_c_enq').Clear;
    end;
    LQuery.ParamByName('ipi_p_ipi').AsFloat := AInput.IPIPIPI;
    LQuery.ParamByName('pis_cst').AsString := Trim(AInput.PISCST);
    LQuery.ParamByName('pis_p_pis').AsFloat := AInput.PISPIS;
    LQuery.ParamByName('cofins_cst').AsString := Trim(AInput.COFINSCST);
    LQuery.ParamByName('cofins_p_cofins').AsFloat := AInput.COFINSPCOFINS;
    if AInput.HasCategoryId then
      LQuery.ParamByName('category_id').AsLargeInt := AInput.CategoryId
    else
    begin
      LQuery.ParamByName('category_id').DataType := ftLargeint;
      LQuery.ParamByName('category_id').Clear;
    end;
    LQuery.ParamByName('unit_price').AsFloat := AInput.UnitPrice;
    LQuery.ParamByName('stock_qty').AsFloat := AInput.StockQty;
    LQuery.ParamByName('is_active').AsBoolean := AInput.IsActive;
    LQuery.Open;
    Result := LQuery.Fields[0].AsLargeInt;
  finally
    LQuery.Free;
    LConnection.Free;
  end;
end;

class function TProductService.DeleteProduct(const AId: Int64): Boolean;
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
      'UPDATE erp_products ' +
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

class function TProductService.GetProductJson(const AId: Int64): string;
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
      'SELECT p.id, p.sku, p.name, p.description, p.gtin, p.ncm, p.cest, p.cfop, p.u_com, p.u_trib, p.extipi, p.cbenef, p.nve, p.ind_escala, p.cnpj_fab, ' +
      'p.icms_orig, p.icms_cst, p.icms_csosn, p.icms_mod_bc, p.icms_p_red_bc, p.icms_p_icms, p.ipi_cst, p.ipi_c_enq, p.ipi_p_ipi, ' +
      'p.pis_cst, p.pis_p_pis, p.cofins_cst, p.cofins_p_cofins, p.category_id, c.name AS category_name, ' +
      ' p.unit_price, p.stock_qty, p.is_active, p.created_at, p.updated_at ' +
      'FROM erp_products p ' +
      'LEFT JOIN erp_categories c ON c.id = p.category_id ' +
      'WHERE p.id = :id LIMIT 1';
    LQuery.ParamByName('id').AsLargeInt := AId;
    LQuery.Open;
    if LQuery.IsEmpty then
      Exit;

    LItem := TJSONObject.Create;
    try
      LItem.AddPair('id', TJSONNumber.Create(LQuery.FieldByName('id').AsLargeInt));
      LItem.AddPair('sku', LQuery.FieldByName('sku').AsString);
      LItem.AddPair('name', LQuery.FieldByName('name').AsString);
      LItem.AddPair('description', LQuery.FieldByName('description').AsString);
      LItem.AddPair('gtin', LQuery.FieldByName('gtin').AsString);
      LItem.AddPair('ncm', LQuery.FieldByName('ncm').AsString);
      if LQuery.FieldByName('cest').IsNull then
        LItem.AddPair('cest', TJSONNull.Create)
      else
        LItem.AddPair('cest', LQuery.FieldByName('cest').AsString);
      LItem.AddPair('cfop', LQuery.FieldByName('cfop').AsString);
      LItem.AddPair('u_com', LQuery.FieldByName('u_com').AsString);
      LItem.AddPair('u_trib', LQuery.FieldByName('u_trib').AsString);
      if LQuery.FieldByName('extipi').IsNull then
        LItem.AddPair('extipi', TJSONNull.Create)
      else
        LItem.AddPair('extipi', LQuery.FieldByName('extipi').AsString);
      if LQuery.FieldByName('cbenef').IsNull then
        LItem.AddPair('cbenef', TJSONNull.Create)
      else
        LItem.AddPair('cbenef', LQuery.FieldByName('cbenef').AsString);
      if LQuery.FieldByName('nve').IsNull then
        LItem.AddPair('nve', TJSONNull.Create)
      else
        LItem.AddPair('nve', LQuery.FieldByName('nve').AsString);
      if LQuery.FieldByName('ind_escala').IsNull then
        LItem.AddPair('ind_escala', TJSONNull.Create)
      else
        LItem.AddPair('ind_escala', LQuery.FieldByName('ind_escala').AsString);
      if LQuery.FieldByName('cnpj_fab').IsNull then
        LItem.AddPair('cnpj_fab', TJSONNull.Create)
      else
        LItem.AddPair('cnpj_fab', LQuery.FieldByName('cnpj_fab').AsString);
      LItem.AddPair('icms_orig', LQuery.FieldByName('icms_orig').AsString);
      if LQuery.FieldByName('icms_cst').IsNull then
        LItem.AddPair('icms_cst', TJSONNull.Create)
      else
        LItem.AddPair('icms_cst', LQuery.FieldByName('icms_cst').AsString);
      if LQuery.FieldByName('icms_csosn').IsNull then
        LItem.AddPair('icms_csosn', TJSONNull.Create)
      else
        LItem.AddPair('icms_csosn', LQuery.FieldByName('icms_csosn').AsString);
      if LQuery.FieldByName('icms_mod_bc').IsNull then
        LItem.AddPair('icms_mod_bc', TJSONNull.Create)
      else
        LItem.AddPair('icms_mod_bc', LQuery.FieldByName('icms_mod_bc').AsString);
      LItem.AddPair('icms_p_red_bc', TJSONNumber.Create(LQuery.FieldByName('icms_p_red_bc').AsFloat));
      LItem.AddPair('icms_p_icms', TJSONNumber.Create(LQuery.FieldByName('icms_p_icms').AsFloat));
      if LQuery.FieldByName('ipi_cst').IsNull then
        LItem.AddPair('ipi_cst', TJSONNull.Create)
      else
        LItem.AddPair('ipi_cst', LQuery.FieldByName('ipi_cst').AsString);
      if LQuery.FieldByName('ipi_c_enq').IsNull then
        LItem.AddPair('ipi_c_enq', TJSONNull.Create)
      else
        LItem.AddPair('ipi_c_enq', LQuery.FieldByName('ipi_c_enq').AsString);
      LItem.AddPair('ipi_p_ipi', TJSONNumber.Create(LQuery.FieldByName('ipi_p_ipi').AsFloat));
      LItem.AddPair('pis_cst', LQuery.FieldByName('pis_cst').AsString);
      LItem.AddPair('pis_p_pis', TJSONNumber.Create(LQuery.FieldByName('pis_p_pis').AsFloat));
      LItem.AddPair('cofins_cst', LQuery.FieldByName('cofins_cst').AsString);
      LItem.AddPair('cofins_p_cofins', TJSONNumber.Create(LQuery.FieldByName('cofins_p_cofins').AsFloat));
      if LQuery.FieldByName('category_id').IsNull then
        LItem.AddPair('category_id', TJSONNull.Create)
      else
        LItem.AddPair('category_id', TJSONNumber.Create(LQuery.FieldByName('category_id').AsLargeInt));
      if LQuery.FieldByName('category_name').IsNull then
        LItem.AddPair('category_name', TJSONNull.Create)
      else
        LItem.AddPair('category_name', LQuery.FieldByName('category_name').AsString);
      LItem.AddPair('unit_price', TJSONNumber.Create(LQuery.FieldByName('unit_price').AsFloat));
      LItem.AddPair('stock_qty', TJSONNumber.Create(LQuery.FieldByName('stock_qty').AsFloat));
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

class function TProductService.ListProductsJson(const AParams: TListQueryParams): string;
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
    if SameText(AValue, 'sku') then Exit('p.sku');
    if SameText(AValue, 'gtin') then Exit('p.gtin');
    if SameText(AValue, 'ncm') then Exit('p.ncm');
    if SameText(AValue, 'name') then Exit('p.name');
    if SameText(AValue, 'unit_price') then Exit('p.unit_price');
    if SameText(AValue, 'stock_qty') then Exit('p.stock_qty');
    if SameText(AValue, 'is_active') then Exit('p.is_active');
    if SameText(AValue, 'created_at') then Exit('p.created_at');
    if SameText(AValue, 'updated_at') then Exit('p.updated_at');
    Result := 'p.id';
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
    if AParams.IsActiveSet then
      LConditions.Add('p.is_active = :is_active');
    if Trim(AParams.Q) <> '' then
      LConditions.Add('(p.sku ILIKE :q OR p.gtin ILIKE :q OR p.ncm ILIKE :q OR p.name ILIKE :q OR p.description ILIKE :q OR COALESCE(c.name, '''') ILIKE :q)');

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
    LCountQuery.SQL.Text :=
      'SELECT COUNT(*) AS total ' +
      'FROM erp_products p ' +
      'LEFT JOIN erp_categories c ON c.id = p.category_id ' +
      LWhere;
    if AParams.IsActiveSet then
      LCountQuery.ParamByName('is_active').AsBoolean := AParams.IsActive;
    if Trim(AParams.Q) <> '' then
      LCountQuery.ParamByName('q').AsString := LLike;
    LCountQuery.Open;
    LTotal := LCountQuery.FieldByName('total').AsLargeInt;
    LCountQuery.Close;

    LQuery.Connection := LConnection;
    LQuery.SQL.Text :=
      'SELECT p.id, p.sku, p.name, p.description, p.gtin, p.ncm, p.cest, p.cfop, p.u_com, p.u_trib, p.extipi, p.cbenef, p.nve, p.ind_escala, p.cnpj_fab, ' +
      'p.icms_orig, p.icms_cst, p.icms_csosn, p.icms_mod_bc, p.icms_p_red_bc, p.icms_p_icms, p.ipi_cst, p.ipi_c_enq, p.ipi_p_ipi, ' +
      'p.pis_cst, p.pis_p_pis, p.cofins_cst, p.cofins_p_cofins, p.category_id, c.name AS category_name, ' +
      ' p.unit_price, p.stock_qty, p.is_active, p.created_at, p.updated_at ' +
      'FROM erp_products p ' +
      'LEFT JOIN erp_categories c ON c.id = p.category_id ' +
      LWhere + ' ' +
      'ORDER BY ' + LSortBy + ' ' + LSortDir + ' ' +
      'LIMIT :limit OFFSET :offset';
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
      LItem.AddPair('sku', LQuery.FieldByName('sku').AsString);
      LItem.AddPair('gtin', LQuery.FieldByName('gtin').AsString);
      LItem.AddPair('ncm', LQuery.FieldByName('ncm').AsString);
      if LQuery.FieldByName('cest').IsNull then
        LItem.AddPair('cest', TJSONNull.Create)
      else
        LItem.AddPair('cest', LQuery.FieldByName('cest').AsString);
      LItem.AddPair('cfop', LQuery.FieldByName('cfop').AsString);
      LItem.AddPair('u_com', LQuery.FieldByName('u_com').AsString);
      LItem.AddPair('u_trib', LQuery.FieldByName('u_trib').AsString);
      if LQuery.FieldByName('extipi').IsNull then
        LItem.AddPair('extipi', TJSONNull.Create)
      else
        LItem.AddPair('extipi', LQuery.FieldByName('extipi').AsString);
      if LQuery.FieldByName('cbenef').IsNull then
        LItem.AddPair('cbenef', TJSONNull.Create)
      else
        LItem.AddPair('cbenef', LQuery.FieldByName('cbenef').AsString);
      if LQuery.FieldByName('nve').IsNull then
        LItem.AddPair('nve', TJSONNull.Create)
      else
        LItem.AddPair('nve', LQuery.FieldByName('nve').AsString);
      if LQuery.FieldByName('ind_escala').IsNull then
        LItem.AddPair('ind_escala', TJSONNull.Create)
      else
        LItem.AddPair('ind_escala', LQuery.FieldByName('ind_escala').AsString);
      if LQuery.FieldByName('cnpj_fab').IsNull then
        LItem.AddPair('cnpj_fab', TJSONNull.Create)
      else
        LItem.AddPair('cnpj_fab', LQuery.FieldByName('cnpj_fab').AsString);
      LItem.AddPair('icms_orig', LQuery.FieldByName('icms_orig').AsString);
      if LQuery.FieldByName('icms_cst').IsNull then
        LItem.AddPair('icms_cst', TJSONNull.Create)
      else
        LItem.AddPair('icms_cst', LQuery.FieldByName('icms_cst').AsString);
      if LQuery.FieldByName('icms_csosn').IsNull then
        LItem.AddPair('icms_csosn', TJSONNull.Create)
      else
        LItem.AddPair('icms_csosn', LQuery.FieldByName('icms_csosn').AsString);
      if LQuery.FieldByName('icms_mod_bc').IsNull then
        LItem.AddPair('icms_mod_bc', TJSONNull.Create)
      else
        LItem.AddPair('icms_mod_bc', LQuery.FieldByName('icms_mod_bc').AsString);
      LItem.AddPair('icms_p_red_bc', TJSONNumber.Create(LQuery.FieldByName('icms_p_red_bc').AsFloat));
      LItem.AddPair('icms_p_icms', TJSONNumber.Create(LQuery.FieldByName('icms_p_icms').AsFloat));
      if LQuery.FieldByName('ipi_cst').IsNull then
        LItem.AddPair('ipi_cst', TJSONNull.Create)
      else
        LItem.AddPair('ipi_cst', LQuery.FieldByName('ipi_cst').AsString);
      if LQuery.FieldByName('ipi_c_enq').IsNull then
        LItem.AddPair('ipi_c_enq', TJSONNull.Create)
      else
        LItem.AddPair('ipi_c_enq', LQuery.FieldByName('ipi_c_enq').AsString);
      LItem.AddPair('ipi_p_ipi', TJSONNumber.Create(LQuery.FieldByName('ipi_p_ipi').AsFloat));
      LItem.AddPair('pis_cst', LQuery.FieldByName('pis_cst').AsString);
      LItem.AddPair('pis_p_pis', TJSONNumber.Create(LQuery.FieldByName('pis_p_pis').AsFloat));
      LItem.AddPair('cofins_cst', LQuery.FieldByName('cofins_cst').AsString);
      LItem.AddPair('cofins_p_cofins', TJSONNumber.Create(LQuery.FieldByName('cofins_p_cofins').AsFloat));
      LItem.AddPair('name', LQuery.FieldByName('name').AsString);
      LItem.AddPair('description', LQuery.FieldByName('description').AsString);
      if LQuery.FieldByName('category_id').IsNull then
        LItem.AddPair('category_id', TJSONNull.Create)
      else
        LItem.AddPair('category_id', TJSONNumber.Create(LQuery.FieldByName('category_id').AsLargeInt));
      if LQuery.FieldByName('category_name').IsNull then
        LItem.AddPair('category_name', TJSONNull.Create)
      else
        LItem.AddPair('category_name', LQuery.FieldByName('category_name').AsString);
      LItem.AddPair('unit_price', TJSONNumber.Create(LQuery.FieldByName('unit_price').AsFloat));
      LItem.AddPair('stock_qty', TJSONNumber.Create(LQuery.FieldByName('stock_qty').AsFloat));
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

    LSort.AddPair('by', StringReplace(LSortBy, 'p.', '', [rfReplaceAll]));
    LSort.AddPair('dir', LSortDir);

    if Trim(AParams.Q) = '' then
      LFilters.AddPair('q', TJSONNull.Create)
    else
      LFilters.AddPair('q', Trim(AParams.Q));
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

class function TProductService.UpdateProduct(const AId: Int64; const AInput: TUpdateProductInput): Boolean;
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
    if AInput.HasSKU then LFields.Add('sku = :sku');
    if AInput.HasName then LFields.Add('name = :name');
    if AInput.HasDescription then LFields.Add('description = :description');
    if AInput.HasGTIN then LFields.Add('gtin = :gtin');
    if AInput.HasNCM then LFields.Add('ncm = :ncm');
    if AInput.HasCEST then LFields.Add('cest = :cest');
    if AInput.ClearCEST then LFields.Add('cest = NULL');
    if AInput.HasCFOP then LFields.Add('cfop = :cfop');
    if AInput.HasUCom then LFields.Add('u_com = :u_com');
    if AInput.HasUTrib then LFields.Add('u_trib = :u_trib');
    if AInput.HasEXTIPI then LFields.Add('extipi = :extipi');
    if AInput.ClearEXTIPI then LFields.Add('extipi = NULL');
    if AInput.HasCBenef then LFields.Add('cbenef = :cbenef');
    if AInput.ClearCBenef then LFields.Add('cbenef = NULL');
    if AInput.HasNVE then LFields.Add('nve = :nve');
    if AInput.ClearNVE then LFields.Add('nve = NULL');
    if AInput.HasIndEscala then LFields.Add('ind_escala = :ind_escala');
    if AInput.ClearIndEscala then LFields.Add('ind_escala = NULL');
    if AInput.HasCNPJFab then LFields.Add('cnpj_fab = :cnpj_fab');
    if AInput.ClearCNPJFab then LFields.Add('cnpj_fab = NULL');
    if AInput.HasICMSOrig then LFields.Add('icms_orig = :icms_orig');
    if AInput.HasICMSCST then LFields.Add('icms_cst = :icms_cst');
    if AInput.ClearICMSCST then LFields.Add('icms_cst = NULL');
    if AInput.HasICMSCSOSN then LFields.Add('icms_csosn = :icms_csosn');
    if AInput.ClearICMSCSOSN then LFields.Add('icms_csosn = NULL');
    if AInput.HasICMSModBC then LFields.Add('icms_mod_bc = :icms_mod_bc');
    if AInput.ClearICMSModBC then LFields.Add('icms_mod_bc = NULL');
    if AInput.HasICMSPRedBC then LFields.Add('icms_p_red_bc = :icms_p_red_bc');
    if AInput.HasICMSPICMS then LFields.Add('icms_p_icms = :icms_p_icms');
    if AInput.HasIPICST then LFields.Add('ipi_cst = :ipi_cst');
    if AInput.ClearIPICST then LFields.Add('ipi_cst = NULL');
    if AInput.HasIPICEnq then LFields.Add('ipi_c_enq = :ipi_c_enq');
    if AInput.ClearIPICEnq then LFields.Add('ipi_c_enq = NULL');
    if AInput.HasIPIPIPI then LFields.Add('ipi_p_ipi = :ipi_p_ipi');
    if AInput.HasPISCST then LFields.Add('pis_cst = :pis_cst');
    if AInput.HasPISPIS then LFields.Add('pis_p_pis = :pis_p_pis');
    if AInput.HasCOFINSCST then LFields.Add('cofins_cst = :cofins_cst');
    if AInput.HasCOFINSPCOFINS then LFields.Add('cofins_p_cofins = :cofins_p_cofins');
    if AInput.HasCategoryId then LFields.Add('category_id = :category_id');
    if AInput.ClearCategoryId then LFields.Add('category_id = NULL');
    if AInput.HasUnitPrice then LFields.Add('unit_price = :unit_price');
    if AInput.HasStockQty then LFields.Add('stock_qty = :stock_qty');
    if AInput.HasIsActive then LFields.Add('is_active = :is_active');
    LFields.Add('updated_at = NOW()');
    if LFields.Count = 0 then
      Exit(False);

    LSql := 'UPDATE erp_products SET ';
    for I := 0 to LFields.Count - 1 do
    begin
      if I > 0 then
        LSql := LSql + ', ';
      LSql := LSql + LFields[I];
    end;
    LSql := LSql + ' WHERE id = :id RETURNING id';

    LQuery.Connection := LConnection;
    LQuery.SQL.Text := LSql;
    if AInput.HasSKU then LQuery.ParamByName('sku').AsString := UpperCase(Trim(AInput.SKU));
    if AInput.HasName then LQuery.ParamByName('name').AsString := Trim(AInput.Name);
    if AInput.HasDescription then LQuery.ParamByName('description').AsString := Trim(AInput.Description);
    if AInput.HasGTIN then LQuery.ParamByName('gtin').AsString := UpperCase(Trim(AInput.GTIN));
    if AInput.HasNCM then LQuery.ParamByName('ncm').AsString := Trim(AInput.NCM);
    if AInput.HasCEST then LQuery.ParamByName('cest').AsString := Trim(AInput.CEST);
    if AInput.HasCFOP then LQuery.ParamByName('cfop').AsString := Trim(AInput.CFOP);
    if AInput.HasUCom then LQuery.ParamByName('u_com').AsString := UpperCase(Trim(AInput.UCom));
    if AInput.HasUTrib then LQuery.ParamByName('u_trib').AsString := UpperCase(Trim(AInput.UTrib));
    if AInput.HasEXTIPI then LQuery.ParamByName('extipi').AsString := Trim(AInput.EXTIPI);
    if AInput.HasCBenef then LQuery.ParamByName('cbenef').AsString := UpperCase(Trim(AInput.CBenef));
    if AInput.HasNVE then LQuery.ParamByName('nve').AsString := UpperCase(Trim(AInput.NVE));
    if AInput.HasIndEscala then LQuery.ParamByName('ind_escala').AsString := UpperCase(Trim(AInput.IndEscala));
    if AInput.HasCNPJFab then LQuery.ParamByName('cnpj_fab').AsString := Trim(AInput.CNPJFab);
    if AInput.HasICMSOrig then LQuery.ParamByName('icms_orig').AsString := Trim(AInput.ICMSOrig);
    if AInput.HasICMSCST then LQuery.ParamByName('icms_cst').AsString := Trim(AInput.ICMSCST);
    if AInput.HasICMSCSOSN then LQuery.ParamByName('icms_csosn').AsString := Trim(AInput.ICMSCSOSN);
    if AInput.HasICMSModBC then LQuery.ParamByName('icms_mod_bc').AsString := Trim(AInput.ICMSModBC);
    if AInput.HasICMSPRedBC then LQuery.ParamByName('icms_p_red_bc').AsFloat := AInput.ICMSPRedBC;
    if AInput.HasICMSPICMS then LQuery.ParamByName('icms_p_icms').AsFloat := AInput.ICMSPICMS;
    if AInput.HasIPICST then LQuery.ParamByName('ipi_cst').AsString := Trim(AInput.IPICST);
    if AInput.HasIPICEnq then LQuery.ParamByName('ipi_c_enq').AsString := Trim(AInput.IPICEnq);
    if AInput.HasIPIPIPI then LQuery.ParamByName('ipi_p_ipi').AsFloat := AInput.IPIPIPI;
    if AInput.HasPISCST then LQuery.ParamByName('pis_cst').AsString := Trim(AInput.PISCST);
    if AInput.HasPISPIS then LQuery.ParamByName('pis_p_pis').AsFloat := AInput.PISPIS;
    if AInput.HasCOFINSCST then LQuery.ParamByName('cofins_cst').AsString := Trim(AInput.COFINSCST);
    if AInput.HasCOFINSPCOFINS then LQuery.ParamByName('cofins_p_cofins').AsFloat := AInput.COFINSPCOFINS;
    if AInput.HasCategoryId then LQuery.ParamByName('category_id').AsLargeInt := AInput.CategoryId;
    if AInput.HasUnitPrice then LQuery.ParamByName('unit_price').AsFloat := AInput.UnitPrice;
    if AInput.HasStockQty then LQuery.ParamByName('stock_qty').AsFloat := AInput.StockQty;
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
