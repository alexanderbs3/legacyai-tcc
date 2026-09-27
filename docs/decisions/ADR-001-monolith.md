# ADR-001 -- Arquitetura Monolitica Modular

**Status:** Aceita
**Contexto:** Projeto academico (TCC), equipe pequena, prazo definido, execucao local necessaria para apresentacao e avaliacao.

## Decisao

Utilizar monolito modular em vez de microsservicos.

## Justificativa

- Elimina sobrecarga operacional: sem multiplos servicos, redes Docker complexas ou orquestracao de containers.
- Facilita execucao local e demonstracao durante a apresentacao do TCC.
- Separacao de responsabilidades mantida por modulos e pacotes Java -- sem acoplamento indevido.
- Microsservicos nao acrescentam valor academico relevante neste escopo e aumentariam complexidade sem beneficio.

## Consequencias

- Backend e um unico processo Spring Boot.
- Modulos comunicam-se por chamada de metodo Java, nao por HTTP ou mensageria.
- Escalabilidade horizontal nao e objetivo do MVP.
- A separacao modular facilita extracao de microsservicos em evolucao futura, se necessario.

## O que NAO esta incluido

Kafka, RabbitMQ, Redis, Kubernetes. Ver `../../SCOPE.md`.
