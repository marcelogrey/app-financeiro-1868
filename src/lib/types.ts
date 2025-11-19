// Tipos do aplicativo EAZZY

export interface User {
  id: string;
  nome: string;
  email: string;
  renda: number;
  profissao: string;
  telefone: string;
  dias_pagamento: number[];
  created_at?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  descricao: string;
  valor: number;
  categoria: string;
  data: string;
  tipo: 'receita' | 'despesa';
  created_at?: string;
}

export interface FinancialSummary {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  transacoes: Transaction[];
}

export const CATEGORIAS_RECEITA = [
  'Salário',
  'Freelance',
  'Investimentos',
  'Vendas',
  'Outros'
];

export const CATEGORIAS_DESPESA = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Saúde',
  'Educação',
  'Lazer',
  'Contas',
  'Outros'
];
