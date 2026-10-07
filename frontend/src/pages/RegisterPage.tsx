import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/layout/AuthShell';
import { Alert } from '../components/feedback/Alert';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';
import { authErrorMessage } from '../services/authErrors';
import type { RegisterRequest } from '../types/auth';
import { isValidEmail } from '../utils/validation';

const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 255;
const MAX_PASSWORD_LENGTH = 128;

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

function validate(
  name: string,
  email: string,
  password: string,
  confirmPassword: string,
): FieldErrors {
  const errors: FieldErrors = {};
  if (!name.trim()) errors.name = 'Informe seu nome.';
  else if (name.length > MAX_NAME_LENGTH)
    errors.name = `O nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres.`;
  if (!email.trim()) errors.email = 'Informe seu e-mail.';
  else if (email.length > MAX_EMAIL_LENGTH)
    errors.email = `O e-mail deve ter no máximo ${MAX_EMAIL_LENGTH} caracteres.`;
  else if (!isValidEmail(email)) errors.email = 'Informe um e-mail válido.';
  if (!password) errors.password = 'Informe uma senha.';
  else if (password.length < MIN_PASSWORD_LENGTH)
    errors.password = `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  else if (password.length > MAX_PASSWORD_LENGTH)
    errors.password = `A senha deve ter no máximo ${MAX_PASSWORD_LENGTH} caracteres.`;
  if (!confirmPassword) errors.confirmPassword = 'Confirme sua senha.';
  else if (password !== confirmPassword) errors.confirmPassword = 'As senhas não coincidem.';
  return errors;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  function clearFieldError(field: keyof FieldErrors) {
    if (fieldErrors[field]) setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const normalizedName = name.trim();
    const normalizedEmail = email.trim();
    const errors = validate(normalizedName, normalizedEmail, password, confirmPassword);
    setFieldErrors(errors);
    if (errors.name || errors.email || errors.password || errors.confirmPassword) {
      const orderedErrors = [
        [errors.name, nameRef],
        [errors.email, emailRef],
        [errors.password, passwordRef],
        [errors.confirmPassword, confirmPasswordRef],
      ] as const;
      const firstInvalid = orderedErrors.find(([message]) => message);
      setValidationMessage(`Corrija os campos destacados. ${firstInvalid![0]}`);
      firstInvalid![1].current?.focus();
      return;
    }
    setValidationMessage('');

    setLoading(true);
    try {
      await api.post<unknown, unknown, RegisterRequest>('/auth/register', {
        name: normalizedName,
        email: normalizedEmail,
        password,
      });
      navigate('/login');
    } catch (cause) {
      setError(authErrorMessage(cause, 'Não foi possível criar a conta.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="grid gap-1.5">
        <h1>Crie sua conta</h1>
        <p className="text-muted-foreground">Comece a analisar seus sistemas legados.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <Input
          label="Nome"
          ref={nameRef}
          name="name"
          autoComplete="name"
          placeholder="Seu nome"
          value={name}
          maxLength={MAX_NAME_LENGTH}
          onChange={(event) => {
            setName(event.target.value);
            clearFieldError('name');
          }}
          error={fieldErrors.name}
        />

        <Input
          label="E-mail"
          ref={emailRef}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@empresa.com"
          value={email}
          maxLength={MAX_EMAIL_LENGTH}
          onChange={(event) => {
            setEmail(event.target.value);
            clearFieldError('email');
          }}
          error={fieldErrors.email}
        />

        <Input
          label="Senha"
          ref={passwordRef}
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo de 8 caracteres"
          value={password}
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={MAX_PASSWORD_LENGTH}
          onChange={(event) => {
            setPassword(event.target.value);
            clearFieldError('password');
          }}
          error={fieldErrors.password}
        />

        <Input
          label="Confirmar senha"
          ref={confirmPasswordRef}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Repita sua senha"
          value={confirmPassword}
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={MAX_PASSWORD_LENGTH}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            clearFieldError('confirmPassword');
          }}
          error={fieldErrors.confirmPassword}
        />

        <Button type="submit" size="lg" loading={loading}>
          Criar conta
        </Button>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {validationMessage}
        </p>
      </form>

      {error && <Alert role="alert">{error}</Alert>}

      <p className="text-center text-muted-foreground">
        Já tem uma conta? <Link to="/login">Entrar</Link>
      </p>
    </AuthShell>
  );
}
