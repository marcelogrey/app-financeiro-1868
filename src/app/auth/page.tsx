'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseAvailable } from '@/lib/supabase';
import { Wallet, Mail, Lock, User, Phone, Briefcase, DollarSign, Calendar, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Payment mode state
  const [singlePaymentMode, setSinglePaymentMode] = useState(false);

  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  // Register form state
  const [registerData, setRegisterData] = useState({
    nome: '',
    email: '',
    password: '',
    confirmPassword: '',
    telefone: '',
    profissao: '',
    salario: '',
    dia_pagamento_1: '',
    valor_pagamento_1: '',
    dia_pagamento_2: '',
    valor_pagamento_2: ''
  });

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      if (!isSupabaseAvailable() || !supabase) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.push('/');
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };
    checkUser();
  }, [router]);

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!isSupabaseAvailable() || !supabase) {
      setMessage({ type: 'error', text: 'Supabase não está configurado. Conecte sua conta nas Configurações do Projeto.' });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Login realizado com sucesso!' });
      setTimeout(() => router.push('/'), 1000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao fazer login' });
    } finally {
      setLoading(false);
    }
  };

  // Handle register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!isSupabaseAvailable() || !supabase) {
      setMessage({ type: 'error', text: 'Supabase não está configurado. Conecte sua conta nas Configurações do Projeto.' });
      setLoading(false);
      return;
    }

    // Validate passwords match
    if (registerData.password !== registerData.confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem' });
      setLoading(false);
      return;
    }

    // Validate password length
    if (registerData.password.length < 6) {
      setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres' });
      setLoading(false);
      return;
    }

    // Validate salary
    const salario = parseFloat(registerData.salario);
    if (salario <= 0) {
      setMessage({ type: 'error', text: 'O salário deve ser maior que zero' });
      setLoading(false);
      return;
    }

    // Validate payment days
    const dia1 = parseInt(registerData.dia_pagamento_1);
    const valor1 = parseFloat(registerData.valor_pagamento_1);

    if (dia1 < 1 || dia1 > 31) {
      setMessage({ type: 'error', text: 'O dia de pagamento deve estar entre 1 e 31' });
      setLoading(false);
      return;
    }

    if (valor1 <= 0) {
      setMessage({ type: 'error', text: 'O valor de pagamento deve ser maior que zero' });
      setLoading(false);
      return;
    }

    // Validate second payment if not in single payment mode
    let dia2 = 0;
    let valor2 = 0;
    
    if (!singlePaymentMode) {
      dia2 = parseInt(registerData.dia_pagamento_2);
      valor2 = parseFloat(registerData.valor_pagamento_2);

      if (dia2 < 1 || dia2 > 31) {
        setMessage({ type: 'error', text: 'O segundo dia de pagamento deve estar entre 1 e 31' });
        setLoading(false);
        return;
      }

      if (valor2 <= 0) {
        setMessage({ type: 'error', text: 'O segundo valor de pagamento deve ser maior que zero' });
        setLoading(false);
        return;
      }
    }

    const rendaTotal = valor1 + valor2;

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registerData.email,
        password: registerData.password,
        options: {
          data: {
            nome: registerData.nome,
            telefone: registerData.telefone,
            profissao: registerData.profissao,
            salario: salario,
            dia_pagamento_1: dia1,
            valor_pagamento_1: valor1,
            dia_pagamento_2: dia2,
            valor_pagamento_2: valor2,
            renda_total: rendaTotal
          }
        }
      });

      if (authError) throw authError;

      // Create user profile in database
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              nome: registerData.nome,
              email: registerData.email,
              telefone: registerData.telefone,
              profissao: registerData.profissao,
              salario: salario,
              dia_pagamento_1: dia1,
              valor_pagamento_1: valor1,
              dia_pagamento_2: dia2,
              valor_pagamento_2: valor2,
              renda_total: rendaTotal
            }
          ]);

        if (profileError) throw profileError;
      }

      setMessage({ type: 'success', text: 'Conta criada com sucesso! Verifique seu email.' });
      
      // Reset form
      setRegisterData({
        nome: '',
        email: '',
        password: '',
        confirmPassword: '',
        telefone: '',
        profissao: '',
        salario: '',
        dia_pagamento_1: '',
        valor_pagamento_1: '',
        dia_pagamento_2: '',
        valor_pagamento_2: ''
      });
      setSinglePaymentMode(false);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao criar conta' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-blue-300 to-cyan-400 p-3 rounded-xl shadow-lg">
              <Wallet className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent">
              EAZZY
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Gestão Financeira Simplificada</p>
        </div>

        {/* Supabase Warning */}
        {!isSupabaseAvailable() && (
          <div className="mb-4 p-4 rounded-lg bg-orange-100 text-orange-800 border border-orange-200">
            <p className="font-semibold mb-1">⚠️ Configuração Necessária</p>
            <p className="text-sm">
              Para usar autenticação, conecte sua conta Supabase em <strong>Configurações do Projeto → Integrações</strong>.
            </p>
          </div>
        )}

        {/* Message Alert */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Auth Card */}
        <Card className="shadow-2xl border-blue-100 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-blue-400">Bem-vindo!</CardTitle>
            <CardDescription className="text-center">
              Entre na sua conta ou crie uma nova
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="register">Registrar</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-400" />
                      Email
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                      disabled={loading || !isSupabaseAvailable()}
                      className="border-blue-200 focus:border-blue-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-blue-400" />
                      Senha
                    </Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                        disabled={loading || !isSupabaseAvailable()}
                        className="border-blue-200 focus:border-blue-400 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-400 transition-colors"
                        tabIndex={-1}
                      >
                        {showLoginPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-300 to-cyan-400 hover:from-blue-400 hover:to-cyan-500 text-white shadow-lg"
                    disabled={loading || !isSupabaseAvailable()}
                  >
                    {loading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-nome" className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-400" />
                      Nome Completo
                    </Label>
                    <Input
                      id="register-nome"
                      type="text"
                      placeholder="João Silva"
                      value={registerData.nome}
                      onChange={(e) => setRegisterData({ ...registerData, nome: e.target.value })}
                      required
                      disabled={loading || !isSupabaseAvailable()}
                      className="border-blue-200 focus:border-blue-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-400" />
                      Email
                    </Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      required
                      disabled={loading || !isSupabaseAvailable()}
                      className="border-blue-200 focus:border-blue-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-password" className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-blue-400" />
                        Senha
                      </Label>
                      <div className="relative">
                        <Input
                          id="register-password"
                          type={showRegisterPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={registerData.password}
                          onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                          required
                          disabled={loading || !isSupabaseAvailable()}
                          className="border-blue-200 focus:border-blue-400 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-400 transition-colors"
                          tabIndex={-1}
                        >
                          {showRegisterPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-confirm" className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-blue-400" />
                        Confirmar
                      </Label>
                      <div className="relative">
                        <Input
                          id="register-confirm"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={registerData.confirmPassword}
                          onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                          required
                          disabled={loading || !isSupabaseAvailable()}
                          className="border-blue-200 focus:border-blue-400 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-400 transition-colors"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-telefone" className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-blue-400" />
                      Telefone
                    </Label>
                    <Input
                      id="register-telefone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={registerData.telefone}
                      onChange={(e) => setRegisterData({ ...registerData, telefone: e.target.value })}
                      required
                      disabled={loading || !isSupabaseAvailable()}
                      className="border-blue-200 focus:border-blue-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-profissao" className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-blue-400" />
                      Profissão
                    </Label>
                    <Input
                      id="register-profissao"
                      type="text"
                      placeholder="Desenvolvedor"
                      value={registerData.profissao}
                      onChange={(e) => setRegisterData({ ...registerData, profissao: e.target.value })}
                      required
                      disabled={loading || !isSupabaseAvailable()}
                      className="border-blue-200 focus:border-blue-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-salario" className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-blue-400" />
                      Salário
                    </Label>
                    <Input
                      id="register-salario"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="5000.00"
                      value={registerData.salario}
                      onChange={(e) => setRegisterData({ ...registerData, salario: e.target.value })}
                      required
                      disabled={loading || !isSupabaseAvailable()}
                      className="border-blue-200 focus:border-blue-400"
                    />
                  </div>

                  {/* Dias de Pagamento Section */}
                  <div className="space-y-4 pt-4 border-t border-blue-200">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-base font-semibold text-blue-400">
                        <Calendar className="w-5 h-5" />
                        Dias de Pagamento
                      </Label>
                      
                      {/* Toggle Pills */}
                      <div className="inline-flex rounded-full bg-gray-200 dark:bg-gray-700 p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSinglePaymentMode(true);
                            setRegisterData({
                              ...registerData,
                              dia_pagamento_2: '',
                              valor_pagamento_2: ''
                            });
                          }}
                          disabled={!isSupabaseAvailable()}
                          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                            singlePaymentMode
                              ? 'bg-blue-400 text-white shadow-md'
                              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          Uma data
                        </button>
                        <button
                          type="button"
                          onClick={() => setSinglePaymentMode(false)}
                          disabled={!isSupabaseAvailable()}
                          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                            !singlePaymentMode
                              ? 'bg-cyan-400 text-white shadow-md'
                              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          Duas datas
                        </button>
                      </div>
                    </div>

                    {/* Primeiro Pagamento */}
                    <div className="bg-blue-50 dark:bg-gray-800 p-4 rounded-xl border-2 border-blue-200 dark:border-blue-900 space-y-3">
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {singlePaymentMode ? "Pagamento Mensal" : "Primeiro Pagamento"}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="dia-1" className="text-xs">
                            Dia do Mês
                          </Label>
                          <Input
                            id="dia-1"
                            type="number"
                            min="1"
                            max="31"
                            placeholder="5"
                            value={registerData.dia_pagamento_1}
                            onChange={(e) => setRegisterData({ ...registerData, dia_pagamento_1: e.target.value })}
                            required
                            disabled={loading || !isSupabaseAvailable()}
                            className="border-blue-200 focus:border-blue-400"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="valor-1" className="text-xs flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            Valor (R$)
                          </Label>
                          <Input
                            id="valor-1"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="2500.00"
                            value={registerData.valor_pagamento_1}
                            onChange={(e) => setRegisterData({ ...registerData, valor_pagamento_1: e.target.value })}
                            required
                            disabled={loading || !isSupabaseAvailable()}
                            className="border-blue-200 focus:border-blue-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Segundo Pagamento - Only show if not in single payment mode */}
                    {!singlePaymentMode && (
                      <div className="bg-cyan-50 dark:bg-gray-800 p-4 rounded-xl border-2 border-cyan-200 dark:border-cyan-900 space-y-3">
                        <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400">Segundo Pagamento</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="dia-2" className="text-xs">
                              Dia do Mês
                            </Label>
                            <Input
                              id="dia-2"
                              type="number"
                              min="1"
                              max="31"
                              placeholder="20"
                              value={registerData.dia_pagamento_2}
                              onChange={(e) => setRegisterData({ ...registerData, dia_pagamento_2: e.target.value })}
                              required={!singlePaymentMode}
                              disabled={loading || !isSupabaseAvailable()}
                              className="border-cyan-200 focus:border-cyan-400"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="valor-2" className="text-xs flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              Valor (R$)
                            </Label>
                            <Input
                              id="valor-2"
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="2500.00"
                              value={registerData.valor_pagamento_2}
                              onChange={(e) => setRegisterData({ ...registerData, valor_pagamento_2: e.target.value })}
                              required={!singlePaymentMode}
                              disabled={loading || !isSupabaseAvailable()}
                              className="border-cyan-200 focus:border-cyan-400"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Total Preview */}
                    {registerData.valor_pagamento_1 && (
                      <div className="bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-gray-800 dark:to-gray-700 p-3 rounded-lg text-center">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Renda Total Mensal</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          R$ {(
                            parseFloat(registerData.valor_pagamento_1) + 
                            (singlePaymentMode ? 0 : parseFloat(registerData.valor_pagamento_2 || '0'))
                          ).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-300 to-cyan-400 hover:from-blue-400 hover:to-cyan-500 text-white shadow-lg"
                    disabled={loading || !isSupabaseAvailable()}
                  >
                    {loading ? 'Criando conta...' : 'Criar Conta'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Ao criar uma conta, você concorda com nossos Termos de Uso
        </p>
      </div>
    </div>
  );
}
