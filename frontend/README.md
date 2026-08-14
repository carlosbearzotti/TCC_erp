# Frontend — reserva para a aplicação web

Esta pasta é o espaço exclusivo da interface que consumirá a API Django. O frontend ainda não foi inicializado para evitar escolher ferramentas e gerar código sem uma issue responsável.

O frontend deve consumir o backend em `../backend/`; não altera modelos, migrações, regras de autorização ou arquivos Django diretamente.

Quando a equipe iniciar o frontend, coloque aqui:

```text
src/
  components/      Componentes reutilizáveis
  screens/         Telas públicas e internas
  services/        Cliente HTTP, autenticação e chamadas da API
  routes/          Regras de navegação e redirecionamento por perfil
  features/        Funcionalidades por domínio, quando necessário
```

Responsabilidades esperadas:

- Área pública: cardápio e pedido como convidado;
- Área autenticada: redirecionamento por perfil;
- Uso do `access token` nas chamadas protegidas;
- Renovação de token e tratamento de sessão expirada.

Não coloque código Django, migrações ou regras de banco nesta pasta.
