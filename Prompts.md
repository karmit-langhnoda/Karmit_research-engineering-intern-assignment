# AI-Assisted Development Prompts

## 1. Data Ingestion Pipeline
**Prompt:**  
Design a clean data ingestion pipeline for Reddit data where I read JSONL input and store it in DuckDB with fields needed for timeline, ideology, source, and network analysis.

**AI Response:**  
Provided a structured preprocessing pipeline including schema design, JSONL parsing, null value handling, timestamp normalization, and transformation logic. Suggested a unified ingestion script that converts raw Reddit data into a clean, query-efficient DuckDB table for downstream analytics.

---

## 2. Semantic Retrieval with Embeddings
**Prompt:**  
Help me create semantic retrieval for my Reddit dashboard using vector embeddings and Chroma persistent storage from local project data.

**AI Response:**  
Recommended an embedding model strategy, persistent Chroma storage setup, and metadata schema for filtering (subreddit, ideology, etc.). Also outlined a retrieval function design that supports semantic queries combined with structured filters.

---

## 3. Robust Semantic Search
**Prompt:**  
Write a robust semantic search method with edge-case handling for empty input, short query, and multilingual user text.

**AI Response:**  
Designed a fault-tolerant search pipeline including input validation, fallback handling, optional translation support, embedding generation, vector similarity search, and consistent response formatting for frontend use.

---

## 4. LangGraph Agent Pipeline
**Prompt:**  
Build a LangGraph agent pipeline for this project with nodes for query understanding, retrieval, aggregation, and synthesis.

**AI Response:**  
Proposed a modular graph-based pipeline where each node processes and updates shared state. Included stages for intent parsing, retrieval, result aggregation, and final synthesis, with error handling and structured outputs.

---

## 5. FastAPI Backend Endpoints
**Prompt:**  
Add API endpoints in FastAPI for stats, trending, search, network, clusters, ideology, and sources with reusable filter inputs.

**AI Response:**  
Outlined a clean API structure with reusable query parameters and modular service layers. Each endpoint integrates DuckDB queries and Chroma retrieval, returning consistent JSON responses optimized for frontend visualization.

---

## 6. Topic Clustering Logic
**Prompt:**  
I need topic cluster visualization support. Give me backend logic for embeddings-based clustering that is stable on low-resource EC2 instances.

**AI Response:**  
Suggested lightweight clustering strategies with controlled dataset size, embedding normalization, and optional dimensionality reduction. Included safeguards like capped inputs and exception handling to ensure stable execution.

---

## 7. Search vs Chat Separation
**Prompt:**  
How should I separate Search and Chat features so search drives dashboard visualization but chatbot behaves as conversational assistant with context memory?

**AI Response:**  
Recommended a decoupled architecture: search endpoints update visualization state, while chat maintains independent conversational context. Chat APIs accept recent history for contextual reasoning without interfering with analytics queries.

---

## 8. Docker Deployment Setup
**Prompt:**  
Create deployment-ready Docker setup for backend with health endpoint, secure runtime user, and compatibility with DuckDB and Chroma mounted data.

**AI Response:**  
Provided a production-ready Docker strategy including multi-stage builds, non-root execution, volume mounts for persistent data, health check endpoint, and optimized startup commands for reliability.

---

## 9. Production Hardening
**Prompt:**  
Give me final production hardening steps for this stack to avoid CORS confusion, Chroma readonly issues, startup failures, and unstable cluster requests.

**AI Response:**  
Suggested best practices including proper CORS configuration, writable storage mounts, lazy loading of heavy components, strict input limits, structured error handling, and detailed logging for easier debugging in production.