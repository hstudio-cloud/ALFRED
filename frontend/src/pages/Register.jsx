import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../hooks/use-toast';
import { Building2, Loader2, Sparkles, Wallet } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    const result = await register(formData.name, formData.email, formData.password);

    if (result.success) {
      toast({
        title: 'Conta criada',
        description: 'Seu ambiente no Alfred Finance já está pronto.'
      });
      navigate('/dashboard');
    } else {
      toast({
        title: 'Erro no registro',
        description: result.error,
        variant: 'destructive'
      });
    }

    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#0f172a_55%,_#020617_100%)] px-6 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="order-2 border-slate-700/60 bg-slate-900/75 p-8 backdrop-blur lg:order-1">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
              <Sparkles className="mr-2 h-4 w-4" />
              Novo ambiente financeiro
            </div>
            <h1 className="text-3xl font-semibold text-white">Criar conta</h1>
            <p className="mt-2 text-slate-400">Comece seu painel de pagamentos e gestão financeira.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">Nome</Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="border-slate-700 bg-slate-950/70 text-white"
                placeholder="Seu nome"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="border-slate-700 bg-slate-950/70 text-white"
                placeholder="seu@email.com"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="border-slate-700 bg-slate-950/70 text-white"
                  placeholder="Crie uma senha"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-300">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="border-slate-700 bg-slate-950/70 text-white"
                  placeholder="Repita a senha"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 py-6 text-white hover:bg-emerald-600"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Criar conta'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300">
              Entrar
            </Link>
          </div>

          <div className="mt-4 text-center">
            <Link to="/" className="text-sm text-slate-500 hover:text-slate-300">
              Voltar para a home
            </Link>
          </div>
        </Card>

        <div className="order-1 space-y-8 lg:order-2">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.35em] text-emerald-300/80">Setup inicial</p>
            <h2 className="max-w-2xl text-4xl font-semibold leading-tight text-white md:text-6xl">
              Abra sua base para controlar contas, gastos e recebimentos com clareza.
            </h2>
            <p className="max-w-xl text-lg leading-8 text-slate-300">
              O Alfred já nasce com foco em fluxo de caixa, categorias, lembretes e separação entre operação pessoal e empresarial.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-slate-700/60 bg-slate-900/65 p-5">
              <Wallet className="mb-4 h-6 w-6 text-cyan-300" />
              <h3 className="text-base font-semibold text-white">Categorias vivas</h3>
              <p className="mt-2 text-sm text-slate-400">Organize cartão, Pix, assinaturas, equipe, impostos e o que mais fizer sentido para você.</p>
            </Card>
            <Card className="border-slate-700/60 bg-slate-900/65 p-5">
              <Building2 className="mb-4 h-6 w-6 text-emerald-300" />
              <h3 className="text-base font-semibold text-white">Separação natural</h3>
              <p className="mt-2 text-sm text-slate-400">Controle gastos pessoais e da empresa sem misturar a visão do negócio.</p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
