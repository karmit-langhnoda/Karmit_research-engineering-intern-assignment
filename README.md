# Reddit Narrative Dashboard

## 1. Video Demo
Add your demo video link here.

## 2. Project Link
Add your deployed project link here.

## 3. Problem Statement
Online discussions around politics and social issues are highly fragmented across communities, ideologies, and sources. It is difficult for users to quickly understand:

1. Which topics are trending over time.
2. How different communities are connected.
3. What ideological patterns are visible.
4. Which external sources are being shared most.
5. How to explore large Reddit datasets using natural language.

This project solves that by combining data analytics, semantic retrieval, clustering, and conversational interaction into one explainable dashboard.

## 4. Our Approach
The project follows an end-to-end pipeline:

1. Collect and preprocess Reddit dataset.
2. Store structured records in DuckDB for fast analytical queries.
3. Create and persist vector embeddings in ChromaDB for semantic retrieval.
4. Build FastAPI endpoints for stats, trends, search, network, clusters, ideology, and sources.
5. Use a LangGraph-based agent pipeline to process search/chat queries through:
   1. Query understanding
   2. Semantic retrieval
   3. Data aggregation
   4. AI synthesis
6. Visualize insights in a React frontend with dedicated tabs.
7. Deploy frontend on Vercel and backend on AWS EC2 using Docker and CI/CD.

## 5. Tech Stack

### Frontend
1. React
2. Vite
3. Zustand
4. D3.js
5. Recharts
6. Axios
7. Tailwind CSS

### Backend
1. FastAPI
2. Uvicorn
3. LangGraph
4. LangChain
5. Groq API integration
6. DuckDB
7. ChromaDB
8. Sentence Transformers
9. Scikit-learn
10. UMAP

### DevOps and Deployment
1. Docker
2. GitHub Actions
3. AWS EC2
4. Docker Hub
5. Vercel

## 6. Project Structure

    Assignment_23BCE157/
      README.md
      Prompts.md
      backend/
        main.py
        requirements.txt
        Dockerfile
        docker-compose.ec2.yml
        agents/
          graph.py
          nodes.py
        database/
          duckdb_client.py
          chroma_client.py
        ml/
          embeddings.py
          clustering.py
          summarizer.py
          global_trends.py
        preprocessing/
          ingest.py
      frontend/
        package.json
        src/
          App.jsx
          api/
            index.js
          components/
            Header.jsx
            TabBar.jsx
            TrendingTab.jsx
            TopicCluster.jsx
            NetworkTab.jsx
            IdeologyTab.jsx
            SourcesTab.jsx
            Chatbot.jsx
          store/
            useStore.js
      data/
        reddit.duckdb
        chroma_db/
        embeddings.npy
        metadata.json

## 7. Workflow Overview

### Data Layer
1. Raw Reddit data is ingested using preprocessing scripts.
2. Structured records are stored in DuckDB.
3. Text embeddings are generated and stored in ChromaDB.

### Intelligence Layer
1. Semantic search retrieves relevant posts by meaning, not only keywords.
2. LangGraph agent pipeline produces summaries, related queries, and contextual insights.
3. Topic clustering groups semantically similar posts for map visualization.

### API Layer
FastAPI serves endpoints for:

1. Health check
2. Summary statistics
3. Trending timeline and subreddit breakdown
4. Search and chat intelligence
5. Network graph generation
6. Topic clusters
7. Ideology and source intelligence
8. Post-level drilldown

### Presentation Layer
1. Dashboard tab for trends and analytics
2. Community network graph tab
3. Ideology breakdown tab
4. Source intelligence tab
5. Chat assistant tab with conversational context

## 8. Core Functionalities
1. Dataset-level summary metrics.
2. Trending topic and activity timeline analysis.
3. Semantic search with AI summary and related follow-up prompts.
4. Topic cluster map with adjustable cluster count.
5. Community network visualization with graph metrics.
6. Ideology distribution and filtering.
7. Source/domain analysis.
8. Conversational chat assistant separated from search visualization flow.
9. Error-safe responses for production stability.
10. Deployment-ready architecture for cloud hosting.

## 9. Behind the Scenes: How It Works
1. DuckDB powers fast aggregations for timelines, counts, and breakdowns.
2. ChromaDB stores vector indexes for semantic retrieval.
3. Sentence Transformer model converts text into embedding vectors.
4. KMeans and UMAP generate cluster labels and 2D topic map points.
5. LangGraph orchestrates multi-step query reasoning.
6. FastAPI acts as orchestration layer between frontend and ML/data components.
7. React components consume APIs and render interactive visual analytics.
8. Zustand keeps global state for filters, tabs, search, and chat context.
9. Docker standardizes runtime across local and cloud environments.
10. GitHub Actions automates build and deploy to EC2.

## 10. Impact
This project transforms unstructured Reddit conversations into actionable narrative intelligence by combining:

1. Data engineering
2. NLP and semantic AI
3. Graph and cluster analytics
4. Interactive visualization
5. Production-grade deployment practices