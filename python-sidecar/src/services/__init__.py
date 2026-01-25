"""
Business Logic Layer (Services).

This package contains the core business logic of the application.
Services are responsible for:
1.  Orchestrating data flow between the API layer (Controllers) and the Data Access layer (Repositories).
2.  Implementing complex business rules and workflows (e.g., RAG pipeline, PDF analysis).
3.  Interacting with external systems (ArXiv API, LLM Providers, File System).

Usage:
    Services should be injected into API endpoints using the dependency injection
    mechanism defined in `src.api.deps`.
"""