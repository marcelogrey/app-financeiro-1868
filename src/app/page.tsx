'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, TrendingUp, TrendingDown, Wallet, Calendar, Download, LogOut } from 'lucide-react';
import { Transaction, FinancialSummary, CATEGORIAS_RECEITA, CATEGORIAS_DESPESA } from '@/lib/types';
import { supabase, isSupabaseAvailable } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function EazzyApp() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear] = useState(new Date().getFullYear());

  // Form state
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    categoria: '',
    data: new Date().toISOString().split('T')[0],
    tipo: 'despesa' as 'receita' | 'despesa'
  });

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      // Se Supabase não está configurado, redireciona para auth
      if (!isSupabaseAvailable() || !supabase) {
        router.push('/auth');
        setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/auth');
          return;
        }

        setUser(session.user);
        loadTransactions(session.user.id);
      } catch (error) {
        console.error('Error checking auth:', error);
        router.push('/auth');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes apenas se Supabase está disponível
    if (isSupabaseAvailable() && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) {
          router.push('/auth');
        } else {
          setUser(session.user);
          loadTransactions(session.user.id);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, [router]);

  // Load transactions from Supabase
  const loadTransactions = async (userId: string) => {
    if (!isSupabaseAvailable() || !supabase) {
      // Fallback to localStorage
      const stored = localStorage.getItem('eazzy_transactions');
      if (stored) {
        setTransactions(JSON.parse(stored));
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('data', { ascending: false });

      if (error) {
        console.error('Error loading transactions:', error);
        // Fallback to localStorage
        const stored = localStorage.getItem('eazzy_transactions');
        if (stored) {
          setTransactions(JSON.parse(stored));
        }
      } else {
        setTransactions(data || []);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      // Fallback to localStorage
      const stored = localStorage.getItem('eazzy_transactions');
      if (stored) {
        setTransactions(JSON.parse(stored));
      }
    }
  };

  // Handle logout
  const handleLogout = async () => {
    if (isSupabaseAvailable() && supabase) {
      await supabase.auth.signOut();
    }
    router.push('/auth');
  };

  // Calculate financial summary
  const getFinancialSummary = (): FinancialSummary => {
    const filtered = transactions.filter(t => {
      const date = new Date(t.data);
      return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    });

    const totalReceitas = filtered
      .filter(t => t.tipo === 'receita')
      .reduce((sum, t) => sum + t.valor, 0);

    const totalDespesas = filtered
      .filter(t => t.tipo === 'despesa')
      .reduce((sum, t) => sum + t.valor, 0);

    return {
      totalReceitas,
      totalDespesas,
      saldo: totalReceitas - totalDespesas,
      transacoes: filtered.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    };
  };

  const summary = getFinancialSummary();

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    const newTransaction = {
      user_id: user.id,
      descricao: formData.descricao,
      valor: parseFloat(formData.valor),
      categoria: formData.categoria,
      data: formData.data,
      tipo: formData.tipo
    };

    // Save to Supabase se disponível
    if (isSupabaseAvailable() && supabase) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .insert([newTransaction])
          .select()
          .single();

        if (error) {
          console.error('Error saving transaction:', error);
          // Fallback to localStorage
          const localTransaction = {
            ...newTransaction,
            id: Date.now().toString(),
            created_at: new Date().toISOString()
          };
          const updated = [...transactions, localTransaction];
          setTransactions(updated);
          localStorage.setItem('eazzy_transactions', JSON.stringify(updated));
        } else {
          setTransactions([data, ...transactions]);
        }
      } catch (error) {
        console.error('Error saving transaction:', error);
        // Fallback to localStorage
        const localTransaction = {
          ...newTransaction,
          id: Date.now().toString(),
          created_at: new Date().toISOString()
        };
        const updated = [...transactions, localTransaction];
        setTransactions(updated);
        localStorage.setItem('eazzy_transactions', JSON.stringify(updated));
      }
    } else {
      // Fallback to localStorage
      const localTransaction = {
        ...newTransaction,
        id: Date.now().toString(),
        created_at: new Date().toISOString()
      };
      const updated = [...transactions, localTransaction];
      setTransactions(updated);
      localStorage.setItem('eazzy_transactions', JSON.stringify(updated));
    }
    
    // Reset form
    setFormData({
      descricao: '',
      valor: '',
      categoria: '',
      data: new Date().toISOString().split('T')[0],
      tipo: 'despesa'
    });
    
    setIsDialogOpen(false);
  };

  // Delete transaction
  const handleDelete = async (id: string) => {
    if (isSupabaseAvailable() && supabase) {
      try {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting transaction:', error);
        }
      } catch (error) {
        console.error('Error deleting transaction:', error);
      }
    }

    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    localStorage.setItem('eazzy_transactions', JSON.stringify(updated));
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor'];
    const rows = summary.transacoes.map(t => [
      new Date(t.data).toLocaleDateString('pt-BR'),
      t.descricao,
      t.categoria,
      t.tipo,
      t.valor.toFixed(2)
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eazzy_relatorio_${selectedMonth + 1}_${selectedYear}.csv`;
    a.click();
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Wallet className="w-16 h-16 mx-auto text-blue-400 animate-pulse mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-blue-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-300 to-cyan-400 p-2 sm:p-3 rounded-xl shadow-lg">
                <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent">
                  EAZZY
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Olá, {user?.user_metadata?.nome || user?.email?.split('@')[0]}!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-300 to-cyan-400 hover:from-blue-400 hover:to-cyan-500 text-white shadow-lg flex-1 sm:flex-none">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Transação
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Adicionar Transação</DialogTitle>
                    <DialogDescription>
                      Registre uma nova receita ou despesa
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Tabs value={formData.tipo} onValueChange={(v) => setFormData({...formData, tipo: v as 'receita' | 'despesa', categoria: ''})}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="receita" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                          Receita
                        </TabsTrigger>
                        <TabsTrigger value="despesa" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
                          Despesa
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <div className="space-y-2">
                      <Label htmlFor="descricao">Descrição</Label>
                      <Input
                        id="descricao"
                        placeholder="Ex: Supermercado, Salário..."
                        value={formData.descricao}
                        onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="valor">Valor (R$)</Label>
                      <Input
                        id="valor"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.valor}
                        onChange={(e) => setFormData({...formData, valor: e.target.value})}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="categoria">Categoria</Label>
                      <Select value={formData.categoria} onValueChange={(v) => setFormData({...formData, categoria: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {(formData.tipo === 'receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA).map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="data">Data</Label>
                      <Input
                        id="data"
                        type="date"
                        value={formData.data}
                        onChange={(e) => setFormData({...formData, data: e.target.value})}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full bg-gradient-to-r from-blue-300 to-cyan-400 hover:from-blue-400 hover:to-cyan-500 text-white">
                      Adicionar Transação
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                size="icon"
                onClick={handleLogout}
                className="border-blue-200 text-blue-400 hover:bg-blue-50"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 sm:py-8">
        {/* Month Selector */}
        <div className="flex items-center justify-between mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-blue-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthNames.map((month, idx) => (
                  <SelectItem key={idx} value={idx.toString()}>{month} {selectedYear}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2 border-blue-200 text-blue-400 hover:bg-blue-50">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-gradient-to-br from-green-400 to-emerald-500 text-white border-0 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                Receitas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl sm:text-3xl font-bold">
                R$ {summary.totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-400 to-pink-500 text-white border-0 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base font-medium flex items-center gap-2">
                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />
                Despesas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl sm:text-3xl font-bold">
                R$ {summary.totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${summary.saldo >= 0 ? 'from-blue-300 to-cyan-400' : 'from-orange-400 to-red-500'} text-white border-0 shadow-xl`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base font-medium flex items-center gap-2">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
                Saldo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl sm:text-3xl font-bold">
                R$ {summary.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions List */}
        <Card className="shadow-xl border-blue-100 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-blue-400">Transações do Mês</CardTitle>
            <CardDescription>
              {summary.transacoes.length} transação(ões) registrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary.transacoes.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="w-16 h-16 mx-auto text-blue-200 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-2">Nenhuma transação registrada</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Clique em "Nova Transação" para começar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {summary.transacoes.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-blue-50 dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow gap-3 border border-blue-100 dark:border-gray-700"
                  >
                    <div className="flex-1">
                      <div className="flex items-start sm:items-center gap-3 mb-2 sm:mb-0">
                        <div className={`p-2 rounded-lg ${transaction.tipo === 'receita' ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                          {transaction.tipo === 'receita' ? (
                            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{transaction.descricao}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className="text-xs bg-blue-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
                              {transaction.categoria}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(transaction.data).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <p className={`text-lg sm:text-xl font-bold ${transaction.tipo === 'receita' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {transaction.tipo === 'receita' ? '+' : '-'} R$ {transaction.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(transaction.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
