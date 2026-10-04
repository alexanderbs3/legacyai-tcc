import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
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

  function clearFieldError(field: keyof FieldErrors) {
    if (fieldErrors[field]) setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const errors = validate(name, email, password, confirmPassword);
    setFieldErrors(errors);
    if (errors.name || errors.email || errors.password || errors.confirmPassword) return;

    setLoading(true);
    try {
      await api.post<unknown, unknown, RegisterRequest>('/auth/register', {
        name,
        email,
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
    <main className="auth-page page-enter">
      <Card className="auth-card">
        <Brand to="/login" />

        <div className="auth-heading">
          <h1>Crie sua conta</h1>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <Input
            label="Nome"
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
            type="email"
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
            type="password"
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
            type="password"
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

          <Button type="submit" loading={loading}>
            Criar conta
          </Button>
        </form>

        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}

        <p className="auth-footer">
          Já tem uma conta? <Link to="/login">Entrar</Link>
        </p>
      </Card>
    </main>
  );
}
