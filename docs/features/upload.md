# Feature: Upload e processamento de arquivos

> Carregar para trabalhar em `FileService`, `FileProcessor`, `ZipProcessor` ou `ProjectContextBuilder`.

## Upload

`POST /api/projects/{id}/files` exige projeto pertencente ao usuário e recebe o campo multipart `file`. O upload pode ocorrer na criação do projeto ou depois, na página do mesmo projeto. `GET /api/projects/{id}/files` lista metadados. A tela de Nova análise consulta essa lista e desabilita o envio quando não há arquivo; o backend também devolve HTTP 400 `INVALID_FILE` **antes** de criar uma análise de projeto sem arquivos.

O `FileService` aceita somente as combinações de nome e MIME abaixo (sufixos com distinção de maiúsculas/minúsculas no upload direto):

| Nome | MIME aceito |
|---|---|
| `.zip` | `application/zip`, `application/x-zip-compressed` |
| `.md` | `text/markdown`, `text/plain` |
| `.txt` | `text/plain` |
| `README` sem extensão | qualquer `text/*` |

Limite por arquivo: **70 MB**; limite da requisição multipart: **75 MB** (inclui overhead). Extensão e MIME são verificados juntos no upload, mas isso não é detecção profunda de conteúdo. Falha por extensão/MIME ou limite no service retorna HTTP 400 `INVALID_FILE`; o limite multipart retorna 400 `FILE_TOO_LARGE`.

O arquivo recebido é armazenado em `upload.temp-dir` (padrão `${user.home}/.legacyai/uploads`); `UploadedFile` guarda metadados e o caminho no PostgreSQL. A cópia usada durante a análise é temporária e removida ao fim; o arquivo original fica disponível para análises posteriores. A exclusão do projeto no código atual não remove explicitamente os bytes armazenados nesse diretório: não assuma limpeza física automática.

## Conteúdo analisável

Aceitação do arquivo para upload **não** garante que seu conteúdo seja analisável. Na tarefa assíncrona iniciada por `POST /api/projects/{id}/analyses`, `FileProcessor` prepara uma cópia de trabalho e `ProjectContextBuilder` extrai texto; falhas levam a status `FAILED` com mensagem pública segura. Arquivos `.txt`, `.md` e `README` precisam ser texto UTF-8 decodificável quando processados. PDF direto não é aceito; PDF dentro de ZIP não é convertido em texto.

O `ZipProcessor` normaliza entradas contra o diretório de extração (proteção contra Zip Slip), ignora diretórios `.git`, `node_modules`, `target`, `build`, `dist`, `.idea` e `.vscode`, e exclui entradas binárias (NUL na amostra inicial ou texto não decodificável em UTF-8). Um ZIP aceito pode não conter texto útil; nesse caso, a análise termina em `FAILED` sem criar relatório. Não há filtro independente de tamanho por entrada extraída no código atual.

`ProjectContextBuilder` ordena README antes de manifests (`pom.xml`, `package.json`, `requirements.txt`), depois configurações e demais arquivos. Identifica Java/JavaScript/TypeScript pelos nomes e Spring Boot/React por conteúdo de manifests. O texto do contexto inclui projeto, linguagens, frameworks, nomes de arquivos e trechos selecionados. O limite padrão é **12.000 caracteres Java** (`String.length`), não uma contagem de tokens específica por provider; projetos extensos podem ter contexto parcial.

Veja [contratos REST](../api/contracts.md) e [análise](analysis.md).