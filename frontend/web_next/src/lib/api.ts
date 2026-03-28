const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:9000";

type ApiErrorPayload = {
  message?: string;
};

export type LoginResponse = {
  status: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: number;
  login: string;
  name: string;
};

export type DashboardSummary = {
  kpis: Record<string, number | string>;
  recent_orders: Array<{
    id: number;
    client_name: string;
    status: string;
    total_amount: number;
    created_at: string;
  }>;
  due_receivables: Array<{
    id: number;
    client_name: string;
    status: string;
    balance_amount: number;
    due_date: string;
  }>;
  top_products?: Array<{
    name: string;
    amount: number;
  }>;
  critical_stock?: Array<{
    id: number;
    name: string;
    qty: number;
  }>;
  fiscal_notes?: Array<{
    num: string;
    dest: string;
    status: string;
  }>;
};

export type Product = {
  id: number;
  sku: string;
  name: string;
  description: string;
  gtin: string;
  ncm: string;
  cest: string | null;
  cfop: string;
  u_com: string;
  u_trib: string;
  extipi: string | null;
  cbenef: string | null;
  nve: string | null;
  ind_escala: string | null;
  cnpj_fab: string | null;
  icms_orig: string;
  icms_cst: string | null;
  icms_csosn: string | null;
  icms_mod_bc: string | null;
  icms_p_red_bc: number;
  icms_p_icms: number;
  ipi_cst: string | null;
  ipi_c_enq: string | null;
  ipi_p_ipi: number;
  pis_cst: string;
  pis_p_pis: number;
  cofins_cst: string;
  cofins_p_cofins: number;
  category_id: number | null;
  category_name: string | null;
  unit_price: number;
  stock_qty: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

export type ProductListResponse = {
  items: Product[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  sort: {
    by: string;
    dir: "ASC" | "DESC";
  };
  filters: {
    q: string | null;
    is_active: boolean | null;
  };
};

export type ProductCreatePayload = {
  sku: string;
  name: string;
  description?: string;
  gtin: string;
  ncm: string;
  cest?: string;
  cfop: string;
  u_com: string;
  u_trib: string;
  extipi?: string;
  cbenef?: string;
  nve?: string;
  ind_escala?: string;
  cnpj_fab?: string;
  icms_orig?: string;
  icms_cst?: string;
  icms_csosn?: string;
  icms_mod_bc?: string;
  icms_p_red_bc?: number;
  icms_p_icms?: number;
  ipi_cst?: string;
  ipi_c_enq?: string;
  ipi_p_ipi?: number;
  pis_cst?: string;
  pis_p_pis?: number;
  cofins_cst?: string;
  cofins_p_cofins?: number;
  category_id?: number;
  unit_price: number;
  stock_qty: number;
  is_active?: boolean;
};

export type ProductUpdatePayload = Partial<
  Omit<ProductCreatePayload, "sku" | "name" | "unit_price" | "stock_qty">
> & {
  sku?: string;
  name?: string;
  description?: string;
  unit_price?: number;
  stock_qty?: number;
  category_id?: number | null;
  cest?: string | null;
  extipi?: string | null;
  cbenef?: string | null;
  nve?: string | null;
  ind_escala?: string | null;
  cnpj_fab?: string | null;
  icms_cst?: string | null;
  icms_csosn?: string | null;
  icms_mod_bc?: string | null;
  ipi_cst?: string | null;
  ipi_c_enq?: string | null;
};

export type CreateProductResponse = {
  status: string;
  id: number;
};

export type ClientApiItem = {
  id: number;
  document_type: string;
  document: string;
  name: string;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
};

export type ClientListResponse = {
  items: ClientApiItem[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  sort: {
    by: string;
    dir: "ASC" | "DESC";
  };
  filters: {
    q: string | null;
    document_type: string | null;
    is_active: boolean | null;
  };
};

export type ClientCreatePayload = {
  document_type: string;
  document: string;
  name: string;
  email?: string;
  phone?: string;
  is_active?: boolean;
};

export type ClientUpdatePayload = Partial<ClientCreatePayload>;

export type CompanyApiItem = {
  id: number;
  code: string;
  cnpj: string;
  legal_name: string;
  trade_name: string;
  porte: string;
  state_registration: string;
  cnae: string;
  tax_regime: "SN" | "LP" | "LR";
  crt: string;
  icms_rate: number;
  iss_rate: number;
  cep: string;
  street: string;
  number: string;
  district: string;
  city: string;
  uf: string;
  cert_password: string;
  cert_status: "valid" | "invalid";
  cert_due_date: string | null;
  fiscal_contact: string;
  fiscal_email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

export type CompanyListResponse = {
  items: CompanyApiItem[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  sort: {
    by: string;
    dir: "ASC" | "DESC";
  };
  filters: {
    q: string | null;
    tax_regime: string | null;
    is_active: boolean | null;
  };
};

export type CompanyCreatePayload = {
  code: string;
  cnpj: string;
  legal_name: string;
  trade_name?: string;
  porte: string;
  state_registration?: string;
  cnae?: string;
  tax_regime: "SN" | "LP" | "LR";
  crt: string;
  icms_rate?: number;
  iss_rate?: number;
  cep?: string;
  street?: string;
  number?: string;
  district?: string;
  city?: string;
  uf?: string;
  cert_password?: string;
  cert_status?: "valid" | "invalid";
  cert_due_date?: string;
  fiscal_contact?: string;
  fiscal_email?: string;
  phone?: string;
  is_active?: boolean;
};

export type CompanyUpdatePayload = Partial<CompanyCreatePayload>;

export type OrderListItem = {
  id: number;
  client_id: number;
  client_name: string;
  status: string;
  total_amount: number;
  invoice_number: string | null;
  items_count: number;
  created_at: string;
  confirmed_at: string | null;
  invoiced_at: string | null;
  canceled_at: string | null;
};

export type OrderListResponse = {
  items: OrderListItem[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  sort: {
    by: string;
    dir: "ASC" | "DESC";
  };
  filters: {
    q: string | null;
    status: string | null;
    client_id: number | null;
  };
};

export type OrderDetail = {
  id: number;
  client_id: number;
  client_name: string;
  status: string;
  total_amount: number;
  created_at: string;
  items: Array<{
    id: number;
    line_no: number;
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
};

export type FiscalDocument = {
  id: number;
  order_id: number;
  status: string;
  document_type: string;
  series: string;
  number: string;
  access_key: string | null;
  protocol: string | null;
  error_message: string | null;
  issued_at: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderCreatePayload = {
  client_id: number;
  notes?: string;
  items: Array<{
    product_id: number;
    quantity: number;
  }>;
};

export type QuoteStatus = "DRAFTING" | "PENDING" | "APPROVED" | "REJECTED" | "CONVERTED" | "CANCELED";

export type QuoteListItem = {
  id: number;
  code: string;
  client_id: number;
  client_name: string;
  status: QuoteStatus;
  total_amount: number;
  items_count: number;
  linked_order_id: number | null;
  created_at: string;
};

export type QuoteListResponse = {
  items: QuoteListItem[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  sort: {
    by: string;
    dir: "ASC" | "DESC";
  };
  filters: {
    q: string | null;
    status: string | null;
    client_id: number | null;
  };
};

export type QuoteDetail = {
  id: number;
  code: string;
  client_id: number;
  client_name: string;
  status: QuoteStatus;
  total_amount: number;
  notes: string;
  linked_order_id: number | null;
  created_at: string;
  items: Array<{
    id: number;
    line_no: number;
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
};

export type QuoteHistoryItem = {
  id: number;
  old_status: QuoteStatus | null;
  new_status: QuoteStatus;
  action: string;
  note: string | null;
  changed_by_name: string | null;
  changed_at: string;
};

export type QuoteUpdatePayload = {
  client_id: number;
  notes?: string;
  items: Array<{
    product_id: number;
    quantity: number;
  }>;
};

export type QuoteCreatePayload = {
  client_id: number;
  notes?: string;
  items: Array<{
    product_id: number;
    quantity: number;
  }>;
};

export type ReceivableStatus = "OPEN" | "PARTIAL" | "PAID" | "CANCELED";

export type ReceivableItem = {
  id: number;
  order_id: number;
  client_id: number;
  client_name: string;
  status: ReceivableStatus;
  original_amount: number;
  paid_amount: number;
  balance_amount: number;
  due_date: string;
  installment_no: number;
  installments_total: number;
  payment_method: string;
  source: string;
  created_at: string;
  paid_at: string | null;
};

export type ReceivablePayment = {
  id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string;
  created_at: string;
  is_reversed: boolean;
  reversed_at: string | null;
  reversed_reason: string | null;
};

export type ReceivableDetail = ReceivableItem & {
  payments: ReceivablePayment[];
};

export type ReceivableListResponse = {
  items: ReceivableItem[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  sort: {
    by: string;
    dir: "ASC" | "DESC";
  };
  filters: {
    q: string | null;
    status: string | null;
    client_id: number | null;
    order_id: number | null;
  };
};

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Resposta invalida da API.");
  }
}

async function apiFetch(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new Error(
      `API indisponivel em ${API_BASE_URL}. Inicie o backend (SistemaERPVendas.exe) e tente novamente.`,
    );
  }
}

function withAuthHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

async function parseApiError(response: Response, fallbackMessage: string): Promise<Error> {
  if (response.status === 401 || response.status === 403) {
    return new Error("unauthorized");
  }

  try {
    const payload = await parseJson<ApiErrorPayload>(response);
    return new Error(payload.message ?? fallbackMessage);
  } catch {
    return new Error(fallbackMessage);
  }
}

export async function loginRequest(
  login: string,
  password: string,
): Promise<LoginResponse> {
  const response = await apiFetch("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password }),
  });

  const payload = await parseJson<{ message?: string } & LoginResponse>(response);
  if (!response.ok) {
    throw new Error(payload.message ?? "Falha no login.");
  }

  return payload;
}

export async function dashboardSummaryRequest(
  accessToken: string,
  period?: "today" | "week" | "month",
): Promise<DashboardSummary> {
  const query = new URLSearchParams();
  if (period) {
    query.set("period", period);
  }
  const path = query.toString()
    ? `/api/v1/dashboard/summary?${query.toString()}`
    : "/api/v1/dashboard/summary";

  const response = await apiFetch(path, {
    method: "GET",
    headers: withAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao carregar dashboard.");
  }

  return parseJson<DashboardSummary>(response);
}

export async function listProductsRequest(
  accessToken: string,
  params: {
    page?: number;
    pageSize?: number;
    q?: string;
    sortBy?: string;
    sortDir?: "asc" | "desc";
    isActive?: "all" | "true" | "false";
  },
): Promise<ProductListResponse> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("page_size", String(params.pageSize ?? 10));
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.sortBy?.trim()) query.set("sort_by", params.sortBy.trim());
  if (params.sortDir) query.set("sort_dir", params.sortDir);
  if (params.isActive === "true") query.set("is_active", "true");
  if (params.isActive === "false") query.set("is_active", "false");

  const response = await apiFetch(`/api/v1/products?${query.toString()}`, {
    method: "GET",
    headers: withAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao listar produtos.");
  }

  return parseJson<ProductListResponse>(response);
}

export async function getProductRequest(
  accessToken: string,
  productId: number,
): Promise<Product> {
  const response = await apiFetch(`/api/v1/products/${productId}`, {
    method: "GET",
    headers: withAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao carregar produto.");
  }

  return parseJson<Product>(response);
}

export async function createProductRequest(
  accessToken: string,
  payload: ProductCreatePayload,
): Promise<CreateProductResponse> {
  const response = await apiFetch("/api/v1/products", {
    method: "POST",
    headers: {
      ...withAuthHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao criar produto.");
  }

  return parseJson<CreateProductResponse>(response);
}

export async function updateProductRequest(
  accessToken: string,
  productId: number,
  payload: ProductUpdatePayload,
): Promise<{ status: string }> {
  const response = await apiFetch(`/api/v1/products/${productId}`, {
    method: "PUT",
    headers: {
      ...withAuthHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao atualizar produto.");
  }

  return parseJson<{ status: string }>(response);
}

export async function deleteProductRequest(
  accessToken: string,
  productId: number,
): Promise<{ status: string }> {
  const response = await apiFetch(`/api/v1/products/${productId}`, {
    method: "DELETE",
    headers: withAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao inativar produto.");
  }

  return parseJson<{ status: string }>(response);
}

export async function listClientsRequest(
  accessToken: string,
  params: {
    page?: number;
    pageSize?: number;
    q?: string;
    sortBy?: string;
    sortDir?: "asc" | "desc";
    isActive?: "all" | "true" | "false";
    documentType?: string;
  } = {},
): Promise<ClientListResponse> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("page_size", String(params.pageSize ?? 100));
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.sortBy?.trim()) query.set("sort_by", params.sortBy.trim());
  if (params.sortDir) query.set("sort_dir", params.sortDir);
  if (params.documentType?.trim()) query.set("document_type", params.documentType.trim());
  if (params.isActive === "true") query.set("is_active", "true");
  if (params.isActive === "false") query.set("is_active", "false");

  const response = await apiFetch(`/api/v1/clients?${query.toString()}`, {
    method: "GET",
    headers: withAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao listar clientes.");
  }

  return parseJson<ClientListResponse>(response);
}

export async function createClientRequest(
  accessToken: string,
  payload: ClientCreatePayload,
): Promise<{ status: string; id: number }> {
  const response = await apiFetch("/api/v1/clients", {
    method: "POST",
    headers: {
      ...withAuthHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao criar cliente.");
  }

  return parseJson<{ status: string; id: number }>(response);
}

export async function updateClientRequest(
  accessToken: string,
  clientId: number,
  payload: ClientUpdatePayload,
): Promise<{ status: string }> {
  const response = await apiFetch(`/api/v1/clients/${clientId}`, {
    method: "PUT",
    headers: {
      ...withAuthHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao atualizar cliente.");
  }

  return parseJson<{ status: string }>(response);
}

export async function deleteClientRequest(
  accessToken: string,
  clientId: number,
): Promise<{ status: string }> {
  const response = await apiFetch(`/api/v1/clients/${clientId}`, {
    method: "DELETE",
    headers: withAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao inativar cliente.");
  }

  return parseJson<{ status: string }>(response);
}

export async function listCompaniesRequest(
  accessToken: string,
  params: {
    page?: number;
    pageSize?: number;
    q?: string;
    sortBy?: string;
    sortDir?: "asc" | "desc";
    isActive?: "all" | "true" | "false";
    taxRegime?: "all" | "SN" | "LP" | "LR";
  } = {},
): Promise<CompanyListResponse> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("page_size", String(params.pageSize ?? 100));
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.sortBy?.trim()) query.set("sort_by", params.sortBy.trim());
  if (params.sortDir) query.set("sort_dir", params.sortDir);
  if (params.taxRegime && params.taxRegime !== "all") query.set("tax_regime", params.taxRegime);
  if (params.isActive === "true") query.set("is_active", "true");
  if (params.isActive === "false") query.set("is_active", "false");

  const response = await apiFetch(`/api/v1/companies?${query.toString()}`, {
    method: "GET",
    headers: withAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao listar empresas.");
  }

  return parseJson<CompanyListResponse>(response);
}

export async function createCompanyRequest(
  accessToken: string,
  payload: CompanyCreatePayload,
): Promise<{ status: string; id: number }> {
  const response = await apiFetch("/api/v1/companies", {
    method: "POST",
    headers: {
      ...withAuthHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao criar empresa.");
  }

  return parseJson<{ status: string; id: number }>(response);
}

export async function updateCompanyRequest(
  accessToken: string,
  companyId: number,
  payload: CompanyUpdatePayload,
): Promise<{ status: string }> {
  const response = await apiFetch(`/api/v1/companies/${companyId}`, {
    method: "PUT",
    headers: {
      ...withAuthHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao atualizar empresa.");
  }

  return parseJson<{ status: string }>(response);
}

export async function deleteCompanyRequest(
  accessToken: string,
  companyId: number,
): Promise<{ status: string }> {
  const response = await apiFetch(`/api/v1/companies/${companyId}`, {
    method: "DELETE",
    headers: withAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao inativar empresa.");
  }

  return parseJson<{ status: string }>(response);
}

export async function listOrdersRequest(
  accessToken: string,
  params: {
    page?: number;
    pageSize?: number;
    q?: string;
    status?: string;
    sortBy?: string;
    sortDir?: "asc" | "desc";
  } = {},
): Promise<OrderListResponse> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("page_size", String(params.pageSize ?? 100));
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.status?.trim()) query.set("status", params.status.trim());
  if (params.sortBy?.trim()) query.set("sort_by", params.sortBy.trim());
  if (params.sortDir) query.set("sort_dir", params.sortDir);

  const response = await apiFetch(`/api/v1/orders?${query.toString()}`, {
    method: "GET",
    headers: withAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao listar pedidos.");
  }

  return parseJson<OrderListResponse>(response);
}

export async function getOrderRequest(
  accessToken: string,
  orderId: number,
): Promise<OrderDetail> {
  const response = await apiFetch(`/api/v1/orders/${orderId}`, {
    method: "GET",
    headers: withAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao carregar pedido.");
  }

  return parseJson<OrderDetail>(response);
}

export async function createOrderRequest(
  accessToken: string,
  payload: OrderCreatePayload,
): Promise<{ status: string; id: number }> {
  const response = await apiFetch("/api/v1/orders", {
    method: "POST",
    headers: {
      ...withAuthHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao criar pedido.");
  }

  return parseJson<{ status: string; id: number }>(response);
}

export async function invoiceOrderRequest(
  accessToken: string,
  orderId: number,
  payload?: {
    invoice_number?: string;
    payment_term?: "CASH" | "INSTALLMENT";
    installments?: number;
    first_due_date?: string;
    interval_days?: number;
    payment_method?: string;
  },
): Promise<{ status: string }> {
  const response = await apiFetch(`/api/v1/orders/${orderId}/invoice`, {
    method: "POST",
    headers: {
      ...withAuthHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      invoice_number: payload?.invoice_number ?? "",
      payment_term: payload?.payment_term ?? "INSTALLMENT",
      installments: payload?.installments ?? 1,
      first_due_date: payload?.first_due_date ?? "",
      interval_days: payload?.interval_days ?? 30,
      payment_method: payload?.payment_method ?? "UNSPECIFIED",
    }),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao faturar pedido.");
  }

  return parseJson<{ status: string }>(response);
}

export async function emitOrderFiscalRequest(
  accessToken: string,
  orderId: number,
  payload?: { series?: string; number?: string },
): Promise<{ status: string; id: number }> {
  const response = await apiFetch(`/api/v1/orders/${orderId}/fiscal/emit`, {
    method: "POST",
    headers: {
      ...withAuthHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      series: payload?.series ?? "",
      number: payload?.number ?? "",
    }),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao emitir fiscal.");
  }

  return parseJson<{ status: string; id: number }>(response);
}

export async function confirmOrderRequest(
  accessToken: string,
  orderId: number,
): Promise<{ status: string }> {
  const response = await apiFetch(`/api/v1/orders/${orderId}/confirm`, {
    method: "POST",
    headers: withAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao aprovar pedido.");
  }

  return parseJson<{ status: string }>(response);
}

export async function cancelOrderRequest(
  accessToken: string,
  orderId: number,
): Promise<{ status: string }> {
  const response = await apiFetch(`/api/v1/orders/${orderId}/cancel`, {
    method: "POST",
    headers: withAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao cancelar pedido.");
  }

  return parseJson<{ status: string }>(response);
}

export async function getOrderFiscalRequest(
  accessToken: string,
  orderId: number,
): Promise<FiscalDocument | null> {
  const response = await apiFetch(`/api/v1/orders/${orderId}/fiscal`, {
    method: "GET",
    headers: withAuthHeaders(accessToken),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao consultar documento fiscal.");
  }

  return parseJson<FiscalDocument>(response);
}

export async function listQuotesRequest(
  accessToken: string,
  params: {
    page?: number;
    pageSize?: number;
    q?: string;
    status?: string;
    sortBy?: string;
    sortDir?: "asc" | "desc";
  } = {},
): Promise<QuoteListResponse> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("page_size", String(params.pageSize ?? 100));
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.status?.trim()) query.set("status", params.status.trim());
  if (params.sortBy?.trim()) query.set("sort_by", params.sortBy.trim());
  if (params.sortDir) query.set("sort_dir", params.sortDir);

  const response = await apiFetch(`/api/v1/quotes?${query.toString()}`, {
    method: "GET",
    headers: withAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao listar orcamentos.");
  }

  return parseJson<QuoteListResponse>(response);
}

export async function createQuoteRequest(
  accessToken: string,
  payload: QuoteCreatePayload,
): Promise<{ status: string; id: number }> {
  const response = await apiFetch("/api/v1/quotes", {
    method: "POST",
    headers: {
      ...withAuthHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao criar orcamento.");
  }

  return parseJson<{ status: string; id: number }>(response);
}

export async function getQuoteRequest(
  accessToken: string,
  quoteId: number,
): Promise<QuoteDetail> {
  const response = await apiFetch(`/api/v1/quotes/${quoteId}`, {
    method: "GET",
    headers: withAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao carregar orcamento.");
  }

  return parseJson<QuoteDetail>(response);
}

export async function getQuoteHistoryRequest(
  accessToken: string,
  quoteId: number,
): Promise<{ items: QuoteHistoryItem[] }> {
  const response = await apiFetch(`/api/v1/quotes/${quoteId}/history`, {
    method: "GET",
    headers: withAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao carregar historico do orcamento.");
  }

  return parseJson<{ items: QuoteHistoryItem[] }>(response);
}

export async function updateQuoteRequest(
  accessToken: string,
  quoteId: number,
  payload: QuoteUpdatePayload,
): Promise<{ status: string }> {
  const response = await apiFetch(`/api/v1/quotes/${quoteId}`, {
    method: "PUT",
    headers: {
      ...withAuthHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao atualizar orcamento.");
  }

  return parseJson<{ status: string }>(response);
}

export async function approveQuoteRequest(
  accessToken: string,
  quoteId: number,
): Promise<{ status: string }> {
  const response = await apiFetch(`/api/v1/quotes/${quoteId}/approve`, {
    method: "POST",
    headers: withAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao aprovar orcamento.");
  }

  return parseJson<{ status: string }>(response);
}

export async function rejectQuoteRequest(
  accessToken: string,
  quoteId: number,
): Promise<{ status: string }> {
  const response = await apiFetch(`/api/v1/quotes/${quoteId}/reject`, {
    method: "POST",
    headers: withAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao reprovar orcamento.");
  }

  return parseJson<{ status: string }>(response);
}

export async function cancelQuoteRequest(
  accessToken: string,
  quoteId: number,
): Promise<{ status: string }> {
  const response = await apiFetch(`/api/v1/quotes/${quoteId}/cancel`, {
    method: "POST",
    headers: withAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao cancelar orcamento.");
  }

  return parseJson<{ status: string }>(response);
}

export async function convertQuoteRequest(
  accessToken: string,
  quoteId: number,
): Promise<{ status: string; order_id: number }> {
  const response = await apiFetch(`/api/v1/quotes/${quoteId}/convert`, {
    method: "POST",
    headers: withAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao converter orcamento.");
  }

  return parseJson<{ status: string; order_id: number }>(response);
}

export async function listReceivablesRequest(
  accessToken: string,
  params: {
    page?: number;
    pageSize?: number;
    q?: string;
    status?: string;
    clientId?: number;
    orderId?: number;
    sortBy?: string;
    sortDir?: "asc" | "desc";
  } = {},
): Promise<ReceivableListResponse> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("page_size", String(params.pageSize ?? 50));
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.status?.trim()) query.set("status", params.status.trim());
  if (params.clientId && params.clientId > 0) query.set("client_id", String(params.clientId));
  if (params.orderId && params.orderId > 0) query.set("order_id", String(params.orderId));
  if (params.sortBy?.trim()) query.set("sort_by", params.sortBy.trim());
  if (params.sortDir) query.set("sort_dir", params.sortDir);

  const response = await apiFetch(`/api/v1/receivables?${query.toString()}`, {
    method: "GET",
    headers: withAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao listar contas a receber.");
  }

  return parseJson<ReceivableListResponse>(response);
}

export async function getReceivableRequest(
  accessToken: string,
  receivableId: number,
): Promise<ReceivableDetail> {
  const response = await apiFetch(`/api/v1/receivables/${receivableId}`, {
    method: "GET",
    headers: withAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao carregar titulo.");
  }

  return parseJson<ReceivableDetail>(response);
}

export async function registerReceivablePaymentRequest(
  accessToken: string,
  receivableId: number,
  payload: {
    amount: number;
    payment_method: string;
    payment_date?: string;
    notes?: string;
  },
): Promise<{ status: string }> {
  const response = await apiFetch(`/api/v1/receivables/${receivableId}/payments`, {
    method: "POST",
    headers: {
      ...withAuthHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Falha ao registrar pagamento.");
  }

  return parseJson<{ status: string }>(response);
}
