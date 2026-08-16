# Sincronizar projeto com GitHub

## O que vamos fazer

1. Conectar o GitHub Connector a este projeto Lovable para acessar seu repositório privado.
2. Inspecionar a estrutura e tecnologia do repositório `host-boss-buddy`.
3. Recriar o projeto dentro do Lovable, adaptando o código para a stack atual (TanStack Start).
4. Configurar o GitHub sync (backup bidirecional) do projeto Lovable para o futuro.

## Detalhes técnicos

- O repositório `jhonata2050/host-boss-buddy` não está acessível publicamente, então precisaremos usar o GitHub Connector para ler os arquivos.
- O Lovable não permite importar diretamente um repositório existente; o sync cria um novo repo a partir do projeto Lovable. Por isso, a abordagem será:
  - Listar os arquivos via API do GitHub.
  - Baixar e analisar os arquivos relevantes (package.json, rotas, componentes, estilos, assets).
  - Reescrever/adaptar o código para TanStack Start, Tailwind v4 e shadcn/ui.
  - Instalar dependências equivalentes.
  - Ajustar rotas em `src/routes/` e componentes em `src/components/`.
- Após recriar o app, ativaremos o GitHub sync para manter o código salvo no seu GitHub.

## Limitações e considerações

- Nem todas as tecnologias podem ser portadas 1:1. Se o projeto original usar Next.js, React Router, ou bibliotecas incompatíveis com Workers, precisaremos adaptar.
- Se o projeto for muito grande ou tiver backend complexo, recomendamos focar primeiro na UI principal e depois nas funcionalidades.
- É preciso autorizar o GitHub Connector com acesso ao repositório privado.

## Próximo passo

Assim que aprovado, começaremos conectando o GitHub Connector e listando os arquivos do repositório.
