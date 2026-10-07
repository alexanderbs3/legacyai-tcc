import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/layout/AuthShell';
import { Alert } from '../components/feedback/Alert';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api, setToken } from '../services/api';
import { authErrorMessage } from '../services/authErrors';
import type { AuthResponse, LoginRequest } from '../types/auth';
import { isValidEmail } from '../utils/validation';

type FieldErrors = {
  email?: string;
  password?: string;
};

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email.trim()) errors.email = 'Informe seu e-mail.';
  else if (!isValidEmail(email)) errors.email = 'Informe um e-mail válido.';
  if (!password) errors.password = 'Informe sua senha.';
  return errors;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const normalizedEmail = email.trim();
    const errors = validate(normalizedEmail, password);
    setFieldErrors(errors);
    if (errors.email || errors.password) {
      const firstError = errors.email ?? errors.password!;
      setValidationMessage(`Corrija os campos destacados. ${firstError}`);
      (errors.email ? emailRef : passwordRef).current?.focus();
      return;
    }
    setValidationMessage('');

    setLoading(true);
    try {
      const { data } = await api.post<AuthResponse, { data: AuthResponse }, LoginRequest>(
        '/auth/login',
        { email: normalizedEmail, password },
      );
      if (!setToken(data.token)) {
        setError('O navegador bloqueou o armazenamento da sessão. Verifique suas configurações.');
        return;
      }
      navigate('/dashboard');
    } catch (cause) {
      setError(authErrorMessage(cause, 'Não foi possível autenticar.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="grid gap-1.5">
        <h1>Boas-vindas de volta</h1>
        <p className="text-muted-foreground">Entre para continuar suas análises.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <Input
          label="E-mail"
          ref={emailRef}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@empresa.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (fieldErrors.email) setFieldErrors((current) => ({ ...current, email: undefined }));
          }}
          error={fieldErrors.email}
        />

        <Input
          label="Senha"
          ref={passwordRef}
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Sua senha"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (fieldErrors.password)
              setFieldErrors((current) => ({ ...current, password: undefined }));
          }}
          error={fieldErrors.password}
        />

        <Button type="submit" size="lg" loading={loading}>
          Entrar
        </Button>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {validationMessage}
        </p>
      </form>

      {error && <Alert role="alert">{error}</Alert>}

      <p className="text-center text-muted-foreground">
        Ainda não tem uma conta? <Link to="/register">Criar conta</Link>
      </p>
    </AuthShell>
  );
}
