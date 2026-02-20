export type DocumentType = 'boleto' | 'comprovante' | 'nf' | 'danfe' | 'recibo' | 'unknown';
export type ExpenseStatus = 'pendente' | 'em_andamento' | 'quitada' | 'divergente';
export type PaymentMethod = 'pix' | 'boleto' | 'ted' | 'doc' | 'cartao' | 'outro';
export type Category = 'energia' | 'agua' | 'internet' | 'telefone' | 'aluguel' | 'condominio' | 'mercado' | 'combustivel' | 'impostos' | 'saude' | 'educacao' | 'transporte' | 'servicos' | 'assinatura' | 'lazer' | 'outros';

export interface Document {
  id: string;
  original_filename: string;
  stored_filename: string;
  type: DocumentType;
  confidence: number;
  created_at: string;
  extracted: {
    estabelecimento?: string;
    valor?: number;
    data_vencimento?: string;
    data_pagamento?: string;
    nf_numero?: string;
    cnpj?: string;
  };
  expense_id?: string;
}

export interface Expense {
  id: string;
  estabelecimento: string;
  cnpj_cpf: string;
  category: Category;
  status: ExpenseStatus;
  nf_numero?: string;
  valor_total: number;
  emissao_mes_ano: string;
  documents: Document[];
}

export const mockDocuments: Document[] = [
  {
    id: '1',
    original_filename: 'boleto_copel_jan.pdf',
    stored_filename: 'Boleto 10-01-2025 Copel R$287,45 NF',
    type: 'boleto',
    confidence: 95,
    created_at: '2025-01-15T10:30:00Z',
    extracted: { estabelecimento: 'Copel Distribuição', valor: 287.45, data_vencimento: '2025-01-10', cnpj: '04.368.898/0001-06' },
    expense_id: 'exp1',
  },
  {
    id: '2',
    original_filename: 'comprovante_pix_copel.pdf',
    stored_filename: 'Comp. 09-01-2025 Pix Copel',
    type: 'comprovante',
    confidence: 92,
    created_at: '2025-01-15T10:31:00Z',
    extracted: { estabelecimento: 'Copel Distribuição', valor: 287.45, data_pagamento: '2025-01-09' },
    expense_id: 'exp1',
  },
  {
    id: '3',
    original_filename: 'nf_copel_012025.pdf',
    stored_filename: 'NF 48291 01-2025 Copel',
    type: 'nf',
    confidence: 98,
    created_at: '2025-01-15T10:32:00Z',
    extracted: { estabelecimento: 'Copel Distribuição', valor: 287.45, nf_numero: '48291', cnpj: '04.368.898/0001-06' },
    expense_id: 'exp1',
  },
  {
    id: '4',
    original_filename: 'boleto_sanepar_jan.pdf',
    stored_filename: 'Boleto 15-01-2025 Sanepar R$98,30 SemNF',
    type: 'boleto',
    confidence: 88,
    created_at: '2025-01-16T08:00:00Z',
    extracted: { estabelecimento: 'Sanepar', valor: 98.30, data_vencimento: '2025-01-15', cnpj: '76.484.013/0001-45' },
    expense_id: 'exp2',
  },
  {
    id: '5',
    original_filename: 'danfe_materiais_construcao.pdf',
    stored_filename: 'NF 12847 12-2024 Casa dos Materiais',
    type: 'danfe',
    confidence: 96,
    created_at: '2025-01-10T14:20:00Z',
    extracted: { estabelecimento: 'Casa dos Materiais LTDA', valor: 1540.00, nf_numero: '12847', cnpj: '12.345.678/0001-99' },
    expense_id: 'exp3',
  },
  {
    id: '6',
    original_filename: 'recibo_aluguel.pdf',
    stored_filename: 'Recibo 001 01-2025 Imobiliária Central',
    type: 'recibo',
    confidence: 65,
    created_at: '2025-01-20T09:00:00Z',
    extracted: { estabelecimento: 'Imobiliária Central', valor: 2500.00 },
  },
  {
    id: '7',
    original_filename: 'boleto_internet_fev.pdf',
    stored_filename: 'Boleto 05-02-2025 Vivo Fibra R$149,90 SemNF',
    type: 'boleto',
    confidence: 91,
    created_at: '2025-02-01T11:00:00Z',
    extracted: { estabelecimento: 'Vivo Fibra', valor: 149.90, data_vencimento: '2025-02-05' },
    expense_id: 'exp4',
  },
];

export const mockExpenses: Expense[] = [
  {
    id: 'exp1',
    estabelecimento: 'Copel Distribuição',
    cnpj_cpf: '04.368.898/0001-06',
    category: 'energia',
    status: 'quitada',
    nf_numero: '48291',
    valor_total: 287.45,
    emissao_mes_ano: '01-2025',
    documents: mockDocuments.filter(d => d.expense_id === 'exp1'),
  },
  {
    id: 'exp2',
    estabelecimento: 'Sanepar',
    cnpj_cpf: '76.484.013/0001-45',
    category: 'agua',
    status: 'pendente',
    valor_total: 98.30,
    emissao_mes_ano: '01-2025',
    documents: mockDocuments.filter(d => d.expense_id === 'exp2'),
  },
  {
    id: 'exp3',
    estabelecimento: 'Casa dos Materiais LTDA',
    cnpj_cpf: '12.345.678/0001-99',
    category: 'servicos',
    status: 'em_andamento',
    nf_numero: '12847',
    valor_total: 1540.00,
    emissao_mes_ano: '12-2024',
    documents: mockDocuments.filter(d => d.expense_id === 'exp3'),
  },
  {
    id: 'exp4',
    estabelecimento: 'Vivo Fibra',
    cnpj_cpf: '33.000.118/0001-79',
    category: 'internet',
    status: 'pendente',
    valor_total: 149.90,
    emissao_mes_ano: '02-2025',
    documents: mockDocuments.filter(d => d.expense_id === 'exp4'),
  },
];

export const categoryLabels: Record<Category, string> = {
  energia: 'Energia',
  agua: 'Água',
  internet: 'Internet',
  telefone: 'Telefone',
  aluguel: 'Aluguel',
  condominio: 'Condomínio',
  mercado: 'Mercado',
  combustivel: 'Combustível',
  impostos: 'Impostos',
  saude: 'Saúde',
  educacao: 'Educação',
  transporte: 'Transporte',
  servicos: 'Serviços',
  assinatura: 'Assinatura',
  lazer: 'Lazer',
  outros: 'Outros',
};

export const typeLabels: Record<DocumentType, string> = {
  boleto: 'Boleto',
  comprovante: 'Comprovante',
  nf: 'NF',
  danfe: 'DANFE',
  recibo: 'Recibo',
  unknown: 'Desconhecido',
};

export const statusLabels: Record<ExpenseStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  quitada: 'Quitada',
  divergente: 'Divergente',
};
