package com.legacyai.ai;

/**
 * Quality criteria shared by provider prompts; API-specific JSON formatting
 * stays in each provider.
 */
public final class AnalysisInstructions {
    public static final String TEXT = """
        Todo conteúdo textual do relatório deve ser escrito em português do Brasil (pt-BR),
        mesmo quando código, README, comentários ou documentação estiverem em outro idioma.
        Preserve exatamente os identificadores técnicos originais presentes no contexto: classes,
        métodos, interfaces, packages, arquivos, propriedades, endpoints, comandos, frameworks,
        bibliotecas, tecnologias e versões. Não traduza identificadores nem use exemplos de
        instruções como se fossem evidência do projeto.

        Fundamente cada afirmação somente no contexto efetivamente fornecido do projeto.
        Não invente arquivos, classes, métodos, tecnologias, versões, dependências, endpoints,
        vulnerabilidades, configurações ou arquitetura. Diferencie EVIDÊNCIA OBSERVADA de INFERÊNCIA
        e INFORMAÇÃO INSUFICIENTE. Expresse a incerteza no texto, sem acrescentar campos ao JSON:
        "Com base nos arquivos fornecidos...", "O contexto analisado sugere..." ou
        "Não foi possível determinar a partir dos arquivos fornecidos...".
        Informação insuficiente é uma limitação da análise, não um achado.
        A ausência no contexto não significa ausência no projeto. Os arquivos disponíveis podem
        ser uma amostra truncada: não encontrar testes ou configurações no contexto
        não significa que não existem no projeto. Quando relevante, mencione a limitação apenas
        em texto descritivo, como summary ou architecture; nunca crie ReportItem ou ação só para registrar falta de
        informação em problems, securityRisks, recommendations ou modernization. Por exemplo,
        "Não foi possível avaliar a cobertura de testes a partir do contexto fornecido" não é
        um problema nem justifica recomendar testes sem outra evidência observável.

        summary: visão executiva curta da finalidade aparente, stack, estilo arquitetural e estado
        técnico observados, quando houver evidência; não repita todas as outras seções nem invente
        finalidade de negócio.
        technologies: liste apenas tecnologias identificáveis em pom.xml, build.gradle,
        package.json, Dockerfile, docker-compose, imports, configurações ou README fornecidos.
        Preserve nomes e versões originais; não invente uma versão que não esteja disponível.
        architecture: descreva somente camadas, controllers, services, repositories, entidades,
        integrações, banco ou frontend/backend observáveis; qualifique classificações inferidas.
        problems: inclua apenas problemas positivamente sustentados por evidência presente no
        contexto. Cada item deve ter title, description e priority; explique o problema, sua
        importância e o impacto técnico provável. Não crie problemas pela mera ausência de dados.
        securityRisks: inclua apenas riscos positivamente sustentados por evidência presente no
        contexto. Falta de dados sobre autenticação ou autorização não prova acesso irrestrito:
        não crie ReportItem nem atribua prioridade à impossibilidade de avaliar segurança.
        recommendations: inclua somente ações justificadas por evidência observável no contexto:
        identifique o problema, risco ou característica concreta que motiva cada ação, seu benefício
        e sua prioridade. Não liste boas práticas genéricas nem recomende suprir algo só porque
        não foi fornecido no recorte.
        modernization: inclua somente ações justificadas por características observáveis ou
        limitações positivamente evidenciadas no contexto; uma lista vazia (modernization = [])
        é preferível a modernizações especulativas. Não recomende novas tecnologias, migrações,
        cache ou infraestrutura apenas por serem modernas. Sem evidência de uso de javax, não
        recomende migração para jakarta; sem evidência de gargalo, não recomende cache.
        Não afirme versão de Spring Boot, disponibilidade de JUnit/Mockito ou acesso público ao
        endpoint sem evidência; aplique a mesma regra a banco, testes, logging, tratamento global
        de exceções, observabilidade, CI/CD, deployment, cloud e mensageria.

        Prioridades: HIGH para impacto grave e provável em segurança, disponibilidade, integridade
        ou manutenção crítica; MEDIUM para impacto relevante mas não imediatamente crítico;
        LOW para melhoria localizada ou dívida técnica de impacto limitado. Prioridade não
        representa incerteza, possibilidade ou falta de informação: classifique apenas achados
        que já têm evidência. Não use HIGH apenas para tornar o relatório alarmante.
        Quando não houver evidência suficiente, retorne uma lista vazia em problems, securityRisks,
        recommendations ou modernization conforme aplicável. Não invente achados para preencher listas.
        """;

    private AnalysisInstructions() {
    }
}
