import { useEffect, useEffectEvent, useState } from 'react';
import { Command } from 'cmdk';
import { FolderKanban, History, LayoutDashboard, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { httpErrorMessage } from '../../services/httpErrors';
import type { Project } from '../../types/project';

/** Paleta de comandos (Ctrl/Cmd + K): navegação, criar projeto e localizar projetos existentes. */
export function CommandMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState('');

  const setMenuOpen = (nextOpen: boolean) => {
    if (nextOpen) {
      setLoadingProjects(true);
      setProjectsError('');
    }
    setOpen(nextOpen);
  };
  const toggleMenu = useEffectEvent(() => setMenuOpen(!open));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        toggleMenu();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const controller = new AbortController();
    api
      .get<Project[]>('/projects', { signal: controller.signal })
      .then((response) => {
        if (active) setProjects(response.data);
      })
      .catch((cause) => {
        if (active && !controller.signal.aborted) {
          setProjects([]);
          setProjectsError(
            httpErrorMessage(cause, 'Projetos indisponíveis. Tente abrir a busca novamente.'),
          );
        }
      })
      .finally(() => {
        if (active) setLoadingProjects(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [open]);

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };
  const shortcut = /mac|iphone|ipad/i.test(navigator.platform) ? '⌘ K' : 'Ctrl K';

  return (
    <>
      <button
        type="button"
        className="inline-flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-surface-secondary px-3 text-left text-sm text-muted-foreground transition-colors duration-(--duration-fast) hover:border-border-hover hover:text-foreground sm:max-w-sm sm:flex-none sm:basis-80"
        aria-label="Abrir busca e comandos"
        onClick={() => setMenuOpen(true)}
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 truncate">Buscar ou executar…</span>
        <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[0.6875rem] sm:inline">
          {shortcut}
        </kbd>
      </button>
      <Command.Dialog
        open={open}
        onOpenChange={setMenuOpen}
        label="Busca e comandos"
        overlayClassName="cmd-overlay"
        contentClassName="cmd-dialog"
      >
        <Command.Input placeholder="Digite um comando ou o nome de um projeto…" />
        <Command.List>
          {loadingProjects && (
            <div className="px-3 py-2 text-xs text-muted-foreground" role="status">
              Carregando projetos…
            </div>
          )}
          {projectsError && (
            <div className="px-3 py-2 text-xs text-danger" role="alert">
              {projectsError}
            </div>
          )}
          <Command.Empty>Nenhum resultado encontrado.</Command.Empty>
          <Command.Group heading="Ações">
            <Command.Item onSelect={() => go('/projects/new')} keywords={['criar', 'novo']}>
              <Plus className="size-4 text-primary" aria-hidden="true" />
              Novo projeto
            </Command.Item>
          </Command.Group>
          <Command.Group heading="Navegar">
            <Command.Item onSelect={() => go('/dashboard')}>
              <LayoutDashboard className="size-4 text-muted-foreground" aria-hidden="true" />
              Dashboard
            </Command.Item>
            <Command.Item onSelect={() => go('/history')} keywords={['análises', 'relatórios']}>
              <History className="size-4 text-muted-foreground" aria-hidden="true" />
              Histórico de análises
            </Command.Item>
          </Command.Group>
          {projects.length > 0 && (
            <Command.Group heading="Projetos">
              {projects.map((project) => (
                <Command.Item
                  key={project.id}
                  value={`projeto ${project.name} ${project.id}`}
                  onSelect={() => go(`/projects/${project.id}`)}
                >
                  <FolderKanban className="size-4 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate">{project.name}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command.Dialog>
    </>
  );
}
