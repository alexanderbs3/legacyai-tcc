# Feature: Upload e Processamento de Arquivos

> Carregar este arquivo quando trabalhar em: upload, extracao de ZIP, FileProcessor, ZipProcessor ou ProjectContextBuilder.

## Fluxo completo

```
POST /api/projects/{id}/files
  -> validar extensao e tipo MIME
  -> validar tamanho maximo
  -> persistir metadados (UploadedFile)
  -> armazenar arquivo temporariamente

POST /api/projects/{id}/analyses  <- dispara o processamento
  -> FileProcessor.processFiles(uploadedFiles)
    -> ZipProcessor.extractSafely()  [se ZIP]
    -> filtrar arquivos irrelevantes
    -> ProjectContextBuilder.build(filteredFiles)
       -> identificar linguagens e frameworks
       -> selecionar arquivos prioritarios
       -> montar contexto dentro do limite de tokens
  -> AIProvider.analyze(AIAnalysisRequest com o contexto)
```

---

## Backend -- pacote `com.legacyai.file`

### Validacoes obrigatorias (em ordem)

| Verificacao  | Detalhe                                                                      |
|--------------|------------------------------------------------------------------------------|
| Extensao     | `.zip`, `.md`, `.txt`, `README`                                              |
| Tipo MIME    | Validar conteudo -- nao confiar so na extensao                               |
| Tamanho      | Upload e requisicao multipart limitados a 50 MB                              |
| Zip Slip     | Normalizar caminho extraido; confirmar que fica dentro do diretorio temporario|
| Limpeza      | `finally` / try-with-resources remove temporarios apos processamento         |

### Arquivos ignorados durante extracao ZIP

```
.git/    node_modules/    target/    build/    dist/    .idea/    .vscode/
Binarios / executaveis / imagens / arquivos compilados
Arquivos acima do limite de tamanho individual [spec]
```

### ProjectContextBuilder -- formato de saida [spec]

```
PROJECT: <nome do projeto>
LANGUAGES: <linguagens identificadas>
FRAMEWORKS: <frameworks identificados>
IMPORTANT FILES: <lista de arquivos prioritarios>
SELECTED CONTENT: <trechos textuais relevantes e limitados>
```

**Prioridade de selecao:** README -> arquivos de build/dependencias (pom.xml, package.json, requirements.txt) -> configuracoes -> codigo-fonte relevante.

**Limite de tokens:** o contexto enviado a IA deve respeitar o limite do provedor.
Selecao de conteudo e chamada a IA devem permanecer separadas.

---

## Contrato REST

-> `../api/contracts.md` -- secao Upload de Arquivos.

## Regras criticas

- Nunca processar arquivo sem validacao previa de extensao e tipo MIME.
- Verificar Zip Slip antes de escrever qualquer arquivo extraido no disco.
- Limpar temporarios mesmo em caso de falha -- usar try-with-resources ou `finally`.
