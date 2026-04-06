import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../hooks/use-toast';
import { Building2, Loader2, Sparkles, Wallet } from 'lucide-react';
import NanoMark from '../components/NanoMark';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas nao coincidem.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    const result = await register(formData.name, formData.email, formData.password);

    if (result.success) {
      toast({
        title: 'Conta criada',
        description: 'Seu ambiente no Nano IA ja esta pronto.',
      });
      navigate('/dashboard');
    } else {
      toast({
        title: 'Erro no registro',
        description: result.error,
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(127,29,29,0.22),_transparent_30%),linear-gradient(180deg,_#090203_0%,_#160405_55%,_#090203_100%)] px-6 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="order-2 border-red-500/15 bg-slate-950/75 p-8 shadow-2xl shadow-red-950/30 backdrop-blur lg:order-1">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-200">
              <Sparkles className="mr-2 h-4 w-4" />
              Novo ambiente financeiro
            </div>
            <h1 className="text-3xl font-semibold text-white">Criar conta</h1>
            <p className="mt-2 text-slate-400">Comece seu painel de pagamentos e gestao financeira.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">
                Nome
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="border-slate-700 bg-slate-950/70 text-white placeholder:text-slate-500"
                placeholder="Seu nome"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="border-slate-700 bg-slate-950/70 text-white placeholder:text-slate-500"
                placeholder="seu@email.com"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">
                  Senha
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="border-slate-700 bg-slate-950/70 text-white placeholder:text-slate-500"
                  placeholder="Crie uma senha"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-300">
                  Confirmar senha
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="border-slate-700 bg-slate-950/70 text-white placeholder:text-slate-500"
                  placeholder="Repita a senha"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-red-500 py-6 text-white hover:bg-red-600">
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
            Ja tem uma conta?{' '}
            <Link to="/login" className="text-red-300 hover:text-red-200">
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
            <div className="flex items-center gap-4">
              <NanoMark className="h-14 w-14" />
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-red-300/80">Nano IA</p>
                <p className="mt-1 text-sm text-slate-400">Setup inicial</p>
              </div>
            </div>

            <h2 className="max-w-2xl text-4xl font-semibold leading-tight text-white md:text-6xl">
              Abra sua base para controlar contas, gastos e recebimentos com clareza.
            </h2>
            <p className="max-w-xl text-lg leading-8 text-slate-300">
              O Nano ja nasce com foco em fluxo de caixa, categorias, lembretes e separacao entre
              operacao pessoal e empresarial.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-red-500/10 bg-slate-950/55 p-5 backdrop-blur">
              <Wallet className="mb-4 h-6 w-6 text-red-300" />
              <h3 className="text-base font-semibold text-white">Categorias vivas</h3>
              <p className="mt-2 text-sm text-slate-400">
                Organize cartao, Pix, assinaturas, equipe, impostos e o que mais fizer sentido para voce.
              </p>
            </Card>

            <Card className="border-red-500/10 bg-slate-950/55 p-5 backdrop-blur">
              <Building2 className="mb-4 h-6 w-6 text-red-200" />
              <h3 className="text-base font-semibold text-white">Separacao natural</h3>
              <p className="mt-2 text-sm text-slate-400">
                Controle gastos pessoais e da empresa sem misturar a visao do negocio.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
