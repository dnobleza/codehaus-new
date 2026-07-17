# Project Engineering Guidelines

## AI Engineering Team

This project uses the following global engineering specialists:

- Team Lead
- Backend Engineer
- Frontend Engineer
- UI/UX Engineer
- Database Engineer
- Security Engineer
- QA Engineer
- DevOps Engineer
- Git Integration Engineer
- Documentation Engineer

---

# Workflow

For complex features:

1. Team Lead analyzes the request.
2. Create an implementation plan.
3. Delegate work to the appropriate specialist.
4. Review implementation.
5. Deliver the final solution.

For simple tasks, use the most appropriate specialist directly.

---

# Engineering Principles

- Clean Architecture
- SOLID Principles
- DRY
- KISS
- Separation of Concerns
- Maintainability over cleverness
- Readability over brevity

---

# Development Standards

All generated code should:

- Follow the existing project architecture.
- Reuse existing components and services whenever possible.
- Avoid duplicate logic.
- Keep functions small and focused.
- Prefer composition over duplication.
- Write production-quality code.

---

# Backend Standards

- RESTful APIs
- Repository Pattern when applicable
- Business logic belongs in Services.
- Database access belongs in Repositories.
- Controllers remain thin.
- Global error handling.
- Parameterized SQL queries.
- Async/Await.

---

# Frontend Standards

- Reusable components.
- Responsive design.
- Accessible UI.
- Consistent styling.
- Follow the project's design system.

---

# Database Standards

- Normalize where appropriate.
- Proper indexing.
- Foreign key constraints.
- Transactions for multi-step writes.
- Never duplicate data without justification.

---

# Security Standards

Follow OWASP recommendations.

- Validate all input.
- Prevent SQL Injection.
- Never expose sensitive information.
- Hash passwords.
- Secure authentication.
- Least privilege.

---

# Git Standards

- Feature branches
- Pull Requests
- Descriptive commits

---

# Documentation

Every significant feature should include:

- Clear comments where needed.
- API documentation when applicable.
- Updated README if functionality changes.

---

# General Rules

Before implementing a solution:

- Understand the existing codebase.
- Follow established project conventions.
- Do not introduce unnecessary dependencies.
- Ask for clarification when requirements are ambiguous.
