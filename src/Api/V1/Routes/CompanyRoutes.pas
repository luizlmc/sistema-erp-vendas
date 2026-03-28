unit CompanyRoutes;

interface

type
  TCompanyRoutes = class
  public
    class procedure Register; static;
  end;

implementation

uses
  System.SysUtils,
  System.JSON,
  Horse,
  AuthMiddleware,
  CompanyService,
  ListQueryParser,
  ListQueryParams,
  ApiResponse;

class procedure TCompanyRoutes.Register;
begin
  THorse.Get('/api/v1/companies',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LParams: TListQueryParams;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'companies.read') then Exit;
      LParams := TListQueryParser.Parse(AReq);
      TApiResponse.SendSuccess(ARes, TCompanyService.ListCompaniesJson(LParams));
    end
  );

  THorse.Get('/api/v1/companies/:id',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LJson: string;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'companies.read') then Exit;
      LId := StrToInt64Def(AReq.Params['id'], 0);
      if LId <= 0 then
      begin
        TApiResponse.SendError(ARes, 400, 'invalid_id', 'ID invalido.');
        Exit;
      end;
      LJson := TCompanyService.GetCompanyJson(LId);
      if LJson = '' then
      begin
        TApiResponse.SendError(ARes, 404, 'company_not_found', 'Empresa nao encontrada.');
        Exit;
      end;
      TApiResponse.SendSuccess(ARes, LJson);
    end
  );

  THorse.Post('/api/v1/companies',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LBody: TJSONValue;
      LObj: TJSONObject;
      LInput: TCreateCompanyInput;
      LId: Int64;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'companies.create') then Exit;
      LBody := TJSONObject.ParseJSONValue(AReq.Body);
      try
        if (LBody = nil) or not (LBody is TJSONObject) then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_json', 'Payload JSON invalido.');
          Exit;
        end;
        LObj := TJSONObject(LBody);
        LInput.Code := LObj.GetValue<string>('code', '');
        LInput.CNPJ := LObj.GetValue<string>('cnpj', '');
        LInput.LegalName := LObj.GetValue<string>('legal_name', '');
        LInput.TradeName := LObj.GetValue<string>('trade_name', '');
        LInput.Porte := LObj.GetValue<string>('porte', '');
        LInput.StateRegistration := LObj.GetValue<string>('state_registration', '');
        LInput.CNAE := LObj.GetValue<string>('cnae', '');
        LInput.TaxRegime := LObj.GetValue<string>('tax_regime', '');
        LInput.CRT := LObj.GetValue<string>('crt', '');
        LInput.ICMSRate := LObj.GetValue<Double>('icms_rate', 0);
        LInput.ISSRate := LObj.GetValue<Double>('iss_rate', 0);
        LInput.CEP := LObj.GetValue<string>('cep', '');
        LInput.Street := LObj.GetValue<string>('street', '');
        LInput.Number := LObj.GetValue<string>('number', '');
        LInput.District := LObj.GetValue<string>('district', '');
        LInput.City := LObj.GetValue<string>('city', '');
        LInput.UF := LObj.GetValue<string>('uf', '');
        LInput.CertPassword := LObj.GetValue<string>('cert_password', '');
        LInput.CertStatus := LObj.GetValue<string>('cert_status', 'valid');
        LInput.CertDueDate := LObj.GetValue<string>('cert_due_date', '');
        LInput.FiscalContact := LObj.GetValue<string>('fiscal_contact', '');
        LInput.FiscalEmail := LObj.GetValue<string>('fiscal_email', '');
        LInput.Phone := LObj.GetValue<string>('phone', '');
        LInput.IsActive := LObj.GetValue<Boolean>('is_active', True);

        if (Trim(LInput.Code) = '') or (Trim(LInput.CNPJ) = '') or (Trim(LInput.LegalName) = '') or
           (Trim(LInput.Porte) = '') or (Trim(LInput.TaxRegime) = '') or (Trim(LInput.CRT) = '') then
        begin
          TApiResponse.SendError(ARes, 400, 'invalid_payload',
            'Campos code, cnpj, legal_name, porte, tax_regime e crt sao obrigatorios.');
          Exit;
        end;

        LId := TCompanyService.CreateCompany(LInput);
        ARes.Status(201).ContentType('application/json').Send('{"status":"ok","id":' + IntToStr(LId) + '}');
      finally
        LBody.Free;
      end;
    end
  );

  THorse.Put('/api/v1/companies/:id',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LBody: TJSONValue;
      LObj: TJSONObject;
      LInput: TUpdateCompanyInput;
      LOk: Boolean;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'companies.update') then Exit;
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
        LInput.HasCode := LObj.TryGetValue<string>('code', LInput.Code);
        LInput.HasCNPJ := LObj.TryGetValue<string>('cnpj', LInput.CNPJ);
        LInput.HasLegalName := LObj.TryGetValue<string>('legal_name', LInput.LegalName);
        LInput.HasTradeName := LObj.TryGetValue<string>('trade_name', LInput.TradeName);
        LInput.HasPorte := LObj.TryGetValue<string>('porte', LInput.Porte);
        LInput.HasStateRegistration := LObj.TryGetValue<string>('state_registration', LInput.StateRegistration);
        LInput.HasCNAE := LObj.TryGetValue<string>('cnae', LInput.CNAE);
        LInput.HasTaxRegime := LObj.TryGetValue<string>('tax_regime', LInput.TaxRegime);
        LInput.HasCRT := LObj.TryGetValue<string>('crt', LInput.CRT);
        LInput.HasICMSRate := LObj.TryGetValue<Double>('icms_rate', LInput.ICMSRate);
        LInput.HasISSRate := LObj.TryGetValue<Double>('iss_rate', LInput.ISSRate);
        LInput.HasCEP := LObj.TryGetValue<string>('cep', LInput.CEP);
        LInput.HasStreet := LObj.TryGetValue<string>('street', LInput.Street);
        LInput.HasNumber := LObj.TryGetValue<string>('number', LInput.Number);
        LInput.HasDistrict := LObj.TryGetValue<string>('district', LInput.District);
        LInput.HasCity := LObj.TryGetValue<string>('city', LInput.City);
        LInput.HasUF := LObj.TryGetValue<string>('uf', LInput.UF);
        LInput.HasCertPassword := LObj.TryGetValue<string>('cert_password', LInput.CertPassword);
        LInput.HasCertStatus := LObj.TryGetValue<string>('cert_status', LInput.CertStatus);
        LInput.HasCertDueDate := LObj.TryGetValue<string>('cert_due_date', LInput.CertDueDate);
        LInput.ClearCertDueDate := LInput.HasCertDueDate and (Trim(LInput.CertDueDate) = '');
        LInput.HasFiscalContact := LObj.TryGetValue<string>('fiscal_contact', LInput.FiscalContact);
        LInput.HasFiscalEmail := LObj.TryGetValue<string>('fiscal_email', LInput.FiscalEmail);
        LInput.HasPhone := LObj.TryGetValue<string>('phone', LInput.Phone);
        LInput.HasIsActive := LObj.TryGetValue<Boolean>('is_active', LInput.IsActive);

        LOk := TCompanyService.UpdateCompany(LId, LInput);
        if not LOk then
        begin
          TApiResponse.SendError(ARes, 404, 'company_not_found', 'Empresa nao encontrada ou sem alteracoes.');
          Exit;
        end;
        TApiResponse.SendSuccess(ARes, '{"status":"ok"}');
      finally
        LBody.Free;
      end;
    end
  );

  THorse.Delete('/api/v1/companies/:id',
    procedure(AReq: THorseRequest; ARes: THorseResponse)
    var
      LId: Int64;
      LOk: Boolean;
    begin
      if not TAuthMiddleware.AuthorizePermission(AReq, ARes, 'companies.delete') then Exit;
      LId := StrToInt64Def(AReq.Params['id'], 0);
      if LId <= 0 then
      begin
        TApiResponse.SendError(ARes, 400, 'invalid_id', 'ID invalido.');
        Exit;
      end;
      LOk := TCompanyService.DeleteCompany(LId);
      if not LOk then
      begin
        TApiResponse.SendError(ARes, 404, 'company_not_found', 'Empresa nao encontrada.');
        Exit;
      end;
      TApiResponse.SendSuccess(ARes, '{"status":"ok"}');
    end
  );
end;

end.
