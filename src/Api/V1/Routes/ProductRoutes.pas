unit ProductRoutes;

interface

type
  TProductRoutes = class
  public
    class procedure Register; static;
  end;

implementation

uses
  System.SysUtils,
  System.JSON,
  System.RegularExpressions,
  Horse,
  AuthMiddleware,
  CategoryService,
  ProductService,
  ListQueryParser,
  ListQueryParams,
  ApiResponse;

function IsValidGTIN(const AValue: string): Boolean;
var
  LValue: string;
begin
  LValue := UpperCase(Trim(AValue));
  Result := SameText(LValue, 'SEM GTIN') or
    TRegEx.IsMatch(LValue, '^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$');
end;

function IsValidNCM(const AValue: string): Boolean;
begin
  Result := TRegEx.IsMatch(Trim(AValue), '^\d{8}$');
end;

function IsValidCFOP(const AValue: string): Boolean;
begin
  Result := TRegEx.IsMatch(Trim(AValue), '^\d{4}$');
end;

function IsValidCEST(const AValue: string): Boolean;
begin
  if Trim(AValue) = '' then
    Exit(True);
  Result := TRegEx.IsMatch(Trim(AValue), '^\d{7}$');
end;

function IsValidUnit(const AValue: string): Boolean;
var
  LValue: string;
begin
  LValue := Trim(AValue);
  Result := (LValue <> '') and (Length(LValue) <= 6);
end;

function IsValidCode(const AValue: string; const ADigits: Integer): Boolean;
var
  LPattern: string;
begin
  if Trim(AValue) = '' then
    Exit(False);
  LPattern := '^\d{' + IntToStr(ADigits) + '}$';
  Result := TRegEx.IsMatch(Trim(AValue), LPattern);
end;

function IsValidPercent(const AValue: Double): Boolean;
begin
  Result := (AValue >= 0) and (AValue <= 100);
end;

function TryHandleProductPersistenceError(ARes: THorseResponse; const AErrorMessage: string): Boolean;
var
  LError: string;
begin
  LError := LowerCase(AErrorMessage);
  Result := True;

  if (Pos('uq_erp_products_sku', LError) > 0) or
     ((Pos('duplicate key value', LError) > 0) and (Pos('sku', LError) > 0)) then
  begin
    TApiResponse.SendError(ARes, 409, 'duplicate_sku', 'Ja existe produto com este SKU.');
    Exit;
  end;

  if Pos('ck_erp_products_ncm', LError) > 0 then
  begin
    TApiResponse.SendError(ARes, 400, 'invalid_payload', 'ncm invalido. Informe 8 digitos numericos.');
    Exit;
  end;

  if Pos('ck_erp_products_cfop', LError) > 0 then
  begin
    TApiResponse.SendError(ARes, 400, 'invalid_payload', 'cfop invalido. Informe 4 digitos numericos.');
    Exit;
  end;

  if Pos('ck_erp_products_cest', LError) > 0 then
  begin
    TApiResponse.SendError(ARes, 400, 'invalid_payload', 'cest invalido. Informe 7 digitos numericos.');
    Exit;
  end;

  if Pos('ck_erp_products_icms_orig', LError) > 0 then
  begin
    TApiResponse.SendError(ARes, 400, 'invalid_payload', 'icms_orig invalido. Use valor de 0 a 8.');
    Exit;
  end;

  if (Pos('erp_products_category_id_fkey', LError) > 0) or (Pos('fk_erp_products', LError) > 0) then
  begin
    TApiResponse.SendError(ARes, 400, 'invalid_category', 'Categoria informada nao existe.');
    Exit;
  end;

  Result := False;
end;

class procedure TProductRoutes.Register;
begin
  THorse.Get('/api/v1/products',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LParams: TListQueryParams;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'products.read') then
        Exit;
      LParams := TListQueryParser.Parse(AReq);
      TApiResponse.SendSuccess(ARes, TProductService.ListProductsJson(LParams));
    end
  );

  THorse.Get('/api/v1/products/:id',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LJson: string;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'products.read') then
        Exit;

      LId := StrToInt64Def(AReq.Params['id'], 0);
      if LId <= 0 then
      begin
        TApiResponse.SendError(ARes, 400, 'invalid_id', 'ID invalido.');
        Exit;
      end;

      LJson := TProductService.GetProductJson(LId);
      if LJson = '' then
      begin
        TApiResponse.SendError(ARes, 404, 'product_not_found', 'Produto nao encontrado.');
        Exit;
      end;

      TApiResponse.SendSuccess(ARes, LJson);
    end
  );

  THorse.Post('/api/v1/products',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LBody: TJSONValue;
      LObj: TJSONObject;
      LInput: TCreateProductInput;
      LId: Int64;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'products.create') then
        Exit;

      LBody := TJSONObject.ParseJSONValue(AReq.Body);
      try
        if (LBody = nil) or not (LBody is TJSONObject) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_json', 'Payload JSON invalido.');
          Exit;
        end;

        LObj := TJSONObject(LBody);
        LInput := Default(TCreateProductInput);
        LInput.SKU := LObj.GetValue<string>('sku', '');
        LInput.Name := LObj.GetValue<string>('name', '');
        LInput.Description := LObj.GetValue<string>('description', '');
        LInput.GTIN := LObj.GetValue<string>('gtin', 'SEM GTIN');
        LInput.NCM := LObj.GetValue<string>('ncm', '');
        LInput.CEST := LObj.GetValue<string>('cest', '');
        LInput.CFOP := LObj.GetValue<string>('cfop', '');
        LInput.UCom := LObj.GetValue<string>('u_com', 'UN');
        LInput.UTrib := LObj.GetValue<string>('u_trib', 'UN');
        LInput.EXTIPI := LObj.GetValue<string>('extipi', '');
        LInput.CBenef := LObj.GetValue<string>('cbenef', '');
        LInput.NVE := LObj.GetValue<string>('nve', '');
        LInput.IndEscala := LObj.GetValue<string>('ind_escala', '');
        LInput.CNPJFab := LObj.GetValue<string>('cnpj_fab', '');
        LInput.ICMSOrig := LObj.GetValue<string>('icms_orig', '0');
        LInput.ICMSCST := LObj.GetValue<string>('icms_cst', '');
        LInput.ICMSCSOSN := LObj.GetValue<string>('icms_csosn', '');
        LInput.ICMSModBC := LObj.GetValue<string>('icms_mod_bc', '');
        LInput.ICMSPRedBC := LObj.GetValue<Double>('icms_p_red_bc', 0);
        LInput.ICMSPICMS := LObj.GetValue<Double>('icms_p_icms', 0);
        LInput.IPICST := LObj.GetValue<string>('ipi_cst', '');
        LInput.IPICEnq := LObj.GetValue<string>('ipi_c_enq', '');
        LInput.IPIPIPI := LObj.GetValue<Double>('ipi_p_ipi', 0);
        LInput.PISCST := LObj.GetValue<string>('pis_cst', '49');
        LInput.PISPIS := LObj.GetValue<Double>('pis_p_pis', 0);
        LInput.COFINSCST := LObj.GetValue<string>('cofins_cst', '49');
        LInput.COFINSPCOFINS := LObj.GetValue<Double>('cofins_p_cofins', 0);
        LInput.HasCategoryId := LObj.TryGetValue<Int64>('category_id', LInput.CategoryId);
        LInput.UnitPrice := LObj.GetValue<Double>('unit_price', 0);
        LInput.StockQty := LObj.GetValue<Double>('stock_qty', 0);
        LInput.IsActive := LObj.GetValue<Boolean>('is_active', True);

        if (Trim(LInput.SKU) = '') or (Trim(LInput.Name) = '') then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'Campos sku e name sao obrigatorios.');
          Exit;
        end;
        if not IsValidGTIN(LInput.GTIN) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'gtin invalido. Use GTIN numerico (8, 12, 13 ou 14 digitos) ou "SEM GTIN".');
          Exit;
        end;
        if not IsValidNCM(LInput.NCM) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'ncm invalido. Informe 8 digitos numericos.');
          Exit;
        end;
        if not IsValidCFOP(LInput.CFOP) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'cfop invalido. Informe 4 digitos numericos.');
          Exit;
        end;
        if not IsValidCEST(LInput.CEST) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'cest invalido. Informe 7 digitos numericos.');
          Exit;
        end;
        if (not IsValidUnit(LInput.UCom)) or (not IsValidUnit(LInput.UTrib)) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'u_com e u_trib sao obrigatorios e devem ter no maximo 6 caracteres.');
          Exit;
        end;
        if (Trim(LInput.CNPJFab) <> '') and (not TRegEx.IsMatch(Trim(LInput.CNPJFab), '^\d{14}$')) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'cnpj_fab invalido. Informe 14 digitos numericos.');
          Exit;
        end;
        if Trim(LInput.IndEscala) <> '' then
        begin
          LInput.IndEscala := UpperCase(Trim(LInput.IndEscala));
          if not ((LInput.IndEscala = 'S') or (LInput.IndEscala = 'N')) then
          begin
            TApiResponse.SendError(ARes, 400, 'invalid_payload', 'ind_escala invalido. Use S ou N.');
            Exit;
          end;
          if (LInput.IndEscala = 'N') and (Trim(LInput.CNPJFab) = '') then
          begin
            TApiResponse.SendError(ARes, 400, 'invalid_payload', 'cnpj_fab e obrigatorio quando ind_escala = N.');
            Exit;
          end;
        end;
        if not TRegEx.IsMatch(Trim(LInput.ICMSOrig), '^[0-8]$') then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'icms_orig invalido. Use valor de 0 a 8.');
          Exit;
        end;
        if (Trim(LInput.ICMSCST) = '') and (Trim(LInput.ICMSCSOSN) = '') then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'informe icms_cst ou icms_csosn.');
          Exit;
        end;
        if (Trim(LInput.ICMSCST) <> '') and (not IsValidCode(LInput.ICMSCST, 2)) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'icms_cst invalido. Informe 2 digitos.');
          Exit;
        end;
        if (Trim(LInput.ICMSCSOSN) <> '') and (not IsValidCode(LInput.ICMSCSOSN, 3)) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'icms_csosn invalido. Informe 3 digitos.');
          Exit;
        end;
        if (Trim(LInput.ICMSModBC) <> '') and (not TRegEx.IsMatch(Trim(LInput.ICMSModBC), '^[0-3]$')) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'icms_mod_bc invalido. Use 0, 1, 2 ou 3.');
          Exit;
        end;
        if (Trim(LInput.IPICST) <> '') and (not IsValidCode(LInput.IPICST, 2)) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'ipi_cst invalido. Informe 2 digitos.');
          Exit;
        end;
        if (Trim(LInput.IPICEnq) <> '') and (not IsValidCode(LInput.IPICEnq, 3)) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'ipi_c_enq invalido. Informe 3 digitos.');
          Exit;
        end;
        if not IsValidCode(LInput.PISCST, 2) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'pis_cst invalido. Informe 2 digitos.');
          Exit;
        end;
        if not IsValidCode(LInput.COFINSCST, 2) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'cofins_cst invalido. Informe 2 digitos.');
          Exit;
        end;
        if (not IsValidPercent(LInput.ICMSPRedBC)) or (not IsValidPercent(LInput.ICMSPICMS)) or
           (not IsValidPercent(LInput.IPIPIPI)) or (not IsValidPercent(LInput.PISPIS)) or
           (not IsValidPercent(LInput.COFINSPCOFINS)) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'aliquotas devem estar entre 0 e 100.');
          Exit;
        end;
        if (LInput.UnitPrice < 0) or (LInput.StockQty < 0) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'unit_price e stock_qty devem ser maiores ou iguais a zero.');
          Exit;
        end;
        if LInput.HasCategoryId and (not TCategoryService.Exists(LInput.CategoryId)) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_category', 'Categoria informada nao existe.');
          Exit;
        end;

        try
          LId := TProductService.CreateProduct(LInput);
        except
          on E: Exception do
          begin
            if TryHandleProductPersistenceError(ARes, E.Message) then
              Exit;
            raise;
          end;
        end;
        ARes.Status(201).ContentType('application/json').Send('{"status":"ok","id":' + IntToStr(LId) + '}');
      finally
        LBody.Free;
      end;
    end
  );

  THorse.Put('/api/v1/products/:id',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LBody: TJSONValue;
      LObj: TJSONObject;
      LInput: TUpdateProductInput;
      LOk: Boolean;
      LCategoryNode: TJSONValue;
      LFiscalNode: TJSONValue;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'products.update') then
        Exit;

      LId := StrToInt64Def(AReq.Params['id'], 0);
      if LId <= 0 then
      begin
        TApiResponse.SendError(ARes, 400, 'invalid_id', 'ID invalido.');
        Exit;
      end;

      LBody := TJSONObject.ParseJSONValue(AReq.Body);
      try
        if (LBody = nil) or not (LBody is TJSONObject) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_json', 'Payload JSON invalido.');
          Exit;
        end;

        LObj := TJSONObject(LBody);
        LInput := Default(TUpdateProductInput);
        LInput.HasSKU := LObj.TryGetValue<string>('sku', LInput.SKU);
        LInput.HasName := LObj.TryGetValue<string>('name', LInput.Name);
        LInput.HasDescription := LObj.TryGetValue<string>('description', LInput.Description);
        LInput.HasGTIN := LObj.TryGetValue<string>('gtin', LInput.GTIN);
        LInput.HasNCM := LObj.TryGetValue<string>('ncm', LInput.NCM);
        LFiscalNode := LObj.FindValue('cest');
        if LFiscalNode <> nil then
        begin
          if LFiscalNode is TJSONNull then
            LInput.ClearCEST := True
          else
            LInput.HasCEST := LObj.TryGetValue<string>('cest', LInput.CEST);
        end;
        LInput.HasCFOP := LObj.TryGetValue<string>('cfop', LInput.CFOP);
        LInput.HasUCom := LObj.TryGetValue<string>('u_com', LInput.UCom);
        LInput.HasUTrib := LObj.TryGetValue<string>('u_trib', LInput.UTrib);
        LFiscalNode := LObj.FindValue('extipi');
        if LFiscalNode <> nil then
        begin
          if LFiscalNode is TJSONNull then
            LInput.ClearEXTIPI := True
          else
            LInput.HasEXTIPI := LObj.TryGetValue<string>('extipi', LInput.EXTIPI);
        end;
        LFiscalNode := LObj.FindValue('cbenef');
        if LFiscalNode <> nil then
        begin
          if LFiscalNode is TJSONNull then
            LInput.ClearCBenef := True
          else
            LInput.HasCBenef := LObj.TryGetValue<string>('cbenef', LInput.CBenef);
        end;
        LFiscalNode := LObj.FindValue('nve');
        if LFiscalNode <> nil then
        begin
          if LFiscalNode is TJSONNull then
            LInput.ClearNVE := True
          else
            LInput.HasNVE := LObj.TryGetValue<string>('nve', LInput.NVE);
        end;
        LFiscalNode := LObj.FindValue('ind_escala');
        if LFiscalNode <> nil then
        begin
          if LFiscalNode is TJSONNull then
            LInput.ClearIndEscala := True
          else
            LInput.HasIndEscala := LObj.TryGetValue<string>('ind_escala', LInput.IndEscala);
        end;
        LFiscalNode := LObj.FindValue('cnpj_fab');
        if LFiscalNode <> nil then
        begin
          if LFiscalNode is TJSONNull then
            LInput.ClearCNPJFab := True
          else
            LInput.HasCNPJFab := LObj.TryGetValue<string>('cnpj_fab', LInput.CNPJFab);
        end;
        LInput.HasICMSOrig := LObj.TryGetValue<string>('icms_orig', LInput.ICMSOrig);
        LFiscalNode := LObj.FindValue('icms_cst');
        if LFiscalNode <> nil then
        begin
          if LFiscalNode is TJSONNull then
            LInput.ClearICMSCST := True
          else
            LInput.HasICMSCST := LObj.TryGetValue<string>('icms_cst', LInput.ICMSCST);
        end;
        LFiscalNode := LObj.FindValue('icms_csosn');
        if LFiscalNode <> nil then
        begin
          if LFiscalNode is TJSONNull then
            LInput.ClearICMSCSOSN := True
          else
            LInput.HasICMSCSOSN := LObj.TryGetValue<string>('icms_csosn', LInput.ICMSCSOSN);
        end;
        LFiscalNode := LObj.FindValue('icms_mod_bc');
        if LFiscalNode <> nil then
        begin
          if LFiscalNode is TJSONNull then
            LInput.ClearICMSModBC := True
          else
            LInput.HasICMSModBC := LObj.TryGetValue<string>('icms_mod_bc', LInput.ICMSModBC);
        end;
        LInput.HasICMSPRedBC := LObj.TryGetValue<Double>('icms_p_red_bc', LInput.ICMSPRedBC);
        LInput.HasICMSPICMS := LObj.TryGetValue<Double>('icms_p_icms', LInput.ICMSPICMS);
        LFiscalNode := LObj.FindValue('ipi_cst');
        if LFiscalNode <> nil then
        begin
          if LFiscalNode is TJSONNull then
            LInput.ClearIPICST := True
          else
            LInput.HasIPICST := LObj.TryGetValue<string>('ipi_cst', LInput.IPICST);
        end;
        LFiscalNode := LObj.FindValue('ipi_c_enq');
        if LFiscalNode <> nil then
        begin
          if LFiscalNode is TJSONNull then
            LInput.ClearIPICEnq := True
          else
            LInput.HasIPICEnq := LObj.TryGetValue<string>('ipi_c_enq', LInput.IPICEnq);
        end;
        LInput.HasIPIPIPI := LObj.TryGetValue<Double>('ipi_p_ipi', LInput.IPIPIPI);
        LInput.HasPISCST := LObj.TryGetValue<string>('pis_cst', LInput.PISCST);
        LInput.HasPISPIS := LObj.TryGetValue<Double>('pis_p_pis', LInput.PISPIS);
        LInput.HasCOFINSCST := LObj.TryGetValue<string>('cofins_cst', LInput.COFINSCST);
        LInput.HasCOFINSPCOFINS := LObj.TryGetValue<Double>('cofins_p_cofins', LInput.COFINSPCOFINS);
        LCategoryNode := LObj.FindValue('category_id');
        if LCategoryNode <> nil then
        begin
          if LCategoryNode is TJSONNull then
            LInput.ClearCategoryId := True
          else
            LInput.HasCategoryId := LObj.TryGetValue<Int64>('category_id', LInput.CategoryId);
        end;
        LInput.HasUnitPrice := LObj.TryGetValue<Double>('unit_price', LInput.UnitPrice);
        LInput.HasStockQty := LObj.TryGetValue<Double>('stock_qty', LInput.StockQty);
        LInput.HasIsActive := LObj.TryGetValue<Boolean>('is_active', LInput.IsActive);

        if LInput.HasGTIN and (not IsValidGTIN(LInput.GTIN)) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'gtin invalido. Use GTIN numerico (8, 12, 13 ou 14 digitos) ou "SEM GTIN".');
          Exit;
        end;
        if LInput.HasNCM and (not IsValidNCM(LInput.NCM)) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'ncm invalido. Informe 8 digitos numericos.');
          Exit;
        end;
        if LInput.HasCFOP and (not IsValidCFOP(LInput.CFOP)) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'cfop invalido. Informe 4 digitos numericos.');
          Exit;
        end;
        if LInput.HasCEST and (not IsValidCEST(LInput.CEST)) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'cest invalido. Informe 7 digitos numericos.');
          Exit;
        end;
        if LInput.HasUCom and (not IsValidUnit(LInput.UCom)) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'u_com invalido. Informe de 1 a 6 caracteres.');
          Exit;
        end;
        if LInput.HasUTrib and (not IsValidUnit(LInput.UTrib)) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'u_trib invalido. Informe de 1 a 6 caracteres.');
          Exit;
        end;
        if LInput.HasCNPJFab and (Trim(LInput.CNPJFab) <> '') and (not TRegEx.IsMatch(Trim(LInput.CNPJFab), '^\d{14}$')) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'cnpj_fab invalido. Informe 14 digitos numericos.');
          Exit;
        end;
        if LInput.HasIndEscala then
        begin
          LInput.IndEscala := UpperCase(Trim(LInput.IndEscala));
          if not ((LInput.IndEscala = 'S') or (LInput.IndEscala = 'N')) then
          begin
            TApiResponse.SendError(ARes, 400, 'invalid_payload', 'ind_escala invalido. Use S ou N.');
            Exit;
          end;
          if (LInput.IndEscala = 'N') and (
               ((LInput.HasCNPJFab) and (Trim(LInput.CNPJFab) = '')) or
               LInput.ClearCNPJFab or
               ((not LInput.HasCNPJFab) and (not LInput.ClearCNPJFab))
             ) then
          begin
            TApiResponse.SendError(ARes, 400, 'invalid_payload', 'ao informar ind_escala = N, envie tambem cnpj_fab.');
            Exit;
          end;
        end;
        if LInput.HasICMSOrig and (not TRegEx.IsMatch(Trim(LInput.ICMSOrig), '^[0-8]$')) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'icms_orig invalido. Use valor de 0 a 8.');
          Exit;
        end;
        if LInput.HasICMSCST and (not IsValidCode(LInput.ICMSCST, 2)) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'icms_cst invalido. Informe 2 digitos.');
          Exit;
        end;
        if LInput.HasICMSCSOSN and (not IsValidCode(LInput.ICMSCSOSN, 3)) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'icms_csosn invalido. Informe 3 digitos.');
          Exit;
        end;
        if LInput.HasICMSModBC and (not TRegEx.IsMatch(Trim(LInput.ICMSModBC), '^[0-3]$')) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'icms_mod_bc invalido. Use 0, 1, 2 ou 3.');
          Exit;
        end;
        if LInput.HasIPICST and (not IsValidCode(LInput.IPICST, 2)) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'ipi_cst invalido. Informe 2 digitos.');
          Exit;
        end;
        if LInput.HasIPICEnq and (not IsValidCode(LInput.IPICEnq, 3)) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'ipi_c_enq invalido. Informe 3 digitos.');
          Exit;
        end;
        if LInput.HasPISCST and (not IsValidCode(LInput.PISCST, 2)) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'pis_cst invalido. Informe 2 digitos.');
          Exit;
        end;
        if LInput.HasCOFINSCST and (not IsValidCode(LInput.COFINSCST, 2)) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'cofins_cst invalido. Informe 2 digitos.');
          Exit;
        end;
        if (LInput.HasICMSPRedBC and (not IsValidPercent(LInput.ICMSPRedBC))) or
           (LInput.HasICMSPICMS and (not IsValidPercent(LInput.ICMSPICMS))) or
           (LInput.HasIPIPIPI and (not IsValidPercent(LInput.IPIPIPI))) or
           (LInput.HasPISPIS and (not IsValidPercent(LInput.PISPIS))) or
           (LInput.HasCOFINSPCOFINS and (not IsValidPercent(LInput.COFINSPCOFINS))) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'aliquotas devem estar entre 0 e 100.');
          Exit;
        end;
        if (LInput.ClearICMSCST and LInput.ClearICMSCSOSN) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'nao e permitido limpar icms_cst e icms_csosn ao mesmo tempo.');
          Exit;
        end;
        if LInput.HasUnitPrice and (LInput.UnitPrice < 0) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'unit_price deve ser maior ou igual a zero.');
          Exit;
        end;
        if LInput.HasStockQty and (LInput.StockQty < 0) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload', 'stock_qty deve ser maior ou igual a zero.');
          Exit;
        end;
        if LInput.HasCategoryId and (not TCategoryService.Exists(LInput.CategoryId)) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_category', 'Categoria informada nao existe.');
          Exit;
        end;

        try
          LOk := TProductService.UpdateProduct(LId, LInput);
        except
          on E: Exception do
          begin
            if TryHandleProductPersistenceError(ARes, E.Message) then
              Exit;
            raise;
          end;
        end;
        if not LOk then
        begin
          TApiResponse.SendError(ARes, 404, 'product_not_found', 'Produto nao encontrado ou sem alteracoes.');
          Exit;
        end;

        TApiResponse.SendSuccess(ARes, '{"status":"ok"}');
      finally
        LBody.Free;
      end;
    end
  );

  THorse.Delete('/api/v1/products/:id',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LOk: Boolean;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'products.delete') then
        Exit;

      LId := StrToInt64Def(AReq.Params['id'], 0);
      if LId <= 0 then
      begin
        TApiResponse.SendError(ARes, 400, 'invalid_id', 'ID invalido.');
        Exit;
      end;

      LOk := TProductService.DeleteProduct(LId);
      if not LOk then
      begin
        TApiResponse.SendError(ARes, 404, 'product_not_found', 'Produto nao encontrado.');
        Exit;
      end;

      TApiResponse.SendSuccess(ARes, '{"status":"ok"}');
    end
  );
end;

end.
