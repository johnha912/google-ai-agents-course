# AI Agents: Intensive Vibe Coding Workspace

Welcome to the organized workspace for the **5-Day AI Agents: Intensive Vibe Coding Course With Google**. This repository contains a collection of AI agents, custom agent skills, web applications, and utility scripts developed during the course.

## 📁 Repository Structure

The workspace has been organized into a logical directory structure:

```text
.
├── agents/                  # AI Agent projects
│   ├── my-agent/            # ReAct assistant with custom weather/time tools (playground & evals)
│   ├── weather-assistant/   # ReAct weather assistant with containerization & local configs
│   └── ambient-expense-agent/ # Event-driven corporate expense agent with security screening and local evals
│

├── apps/                    # Web applications
│   └── bq-release-notes/    # Flask dashboard that tracks and parses Google BigQuery RSS release notes
│
├── skills/                  # Reusable custom skills (created using agents-cli)
│   ├── database-schema-validator/
│   ├── git-commit-formatter/
│   ├── json-to-pydantic/
│   └── license-header-adder/
│
├── scripts/                 # Independent utility/automation scripts
│   ├── process_docs.py      # Automates document organization, summarization, and date extraction
│   ├── my_script.py         # Sandbox script
│   └── product_model.py     # Pydantic product data model
│
└── data/                    # Documents, inputs, outputs, and sample files
    ├── Documents/           # PDFs, JSON logs, SQL scripts, user service YAMLs
    ├── Financial/           # Invoices and receipts sorted automatically by `process_docs.py`
    ├── git_test/            # Local Git interaction testing sandbox
    ├── bad_schema.sql       # Input for database schema validation skill
    └── product.json         # Input for JSON-to-Pydantic parsing skill
```

---

## 🚀 Projects and Quick Start

### 1. BigQuery Release Notes Web App
A Flask-based dashboard that fetches, parses, and displays BigQuery release notes from the official Google Cloud feed.

* **Location**: `apps/bq-release-notes/`
* **Run**:
  ```bash
  cd apps/bq-release-notes
  pip install -r ../../data/Documents/requirements.txt
  python app.py
  ```
* **Dashboard Access**: `http://127.0.0.1:5000`

### 2. AI Agents (using `agents-cli`)
ReAct agents implementing custom tool use with the Gemini model and ADK (Agent Development Kit).

* **Location**: `agents/my-agent/` and `agents/weather-assistant/`
* **Local Interactive Playground**:
  ```bash
  cd agents/my-agent
  agents-cli playground
  ```
  *(Launches the interactive Web UI on `http://127.0.0.1:8080/dev-ui/?app=app`)*
* **Running Tests & Evals**:
  ```bash
  agents-cli eval generate
  agents-cli eval grade
  ```

### 3. Ambient Expense Approval Agent
An event-driven ambient service that processes corporate expenses, implements strict security checkpoints (PII scrubbing and prompt injection defense), and supports local evaluations using custom LLM-as-judge criteria.

* **Location**: `agents/ambient-expense-agent/`
* **Local Web Service (FastAPI)**:
  ```bash
  cd agents/ambient-expense-agent
  uv run python -m expense_agent.fast_api_app
  ```
  *(Runs a local FastAPI server on port 8080. Normalizes Pub/Sub push notification payloads.)*
* **Running Evaluations**:
  ```bash
  cd agents/ambient-expense-agent
  uv run python tests/eval/run_and_report.py
  ```
  *(Runs the synthetic dataset, intercepts HITL decisions, and outputs the routing and security scorecard.)*

### 4. Custom Agent Skills
Custom skills generated and structured to extend agent capabilities:
* **Database Schema Validator**: Validates SQL database schemas against design rules.
* **Git Commit Formatter**: Generates semantic commits.
* **JSON to Pydantic**: Translates JSON models directly to structured Pydantic classes.
* **License Header Adder**: Prepends licensing headers to codebase files.

### 5. Document Processing Scripts
Automated document management pipeline.
* **Location**: `scripts/process_docs.py`
* **Features**:
  - Automatically categorizes incoming files (`PDF`/`DOCX`) into Invoices, Receipts, and Reports.
  - Summarizes textual files.
  - Extracts dates from PDF invoices and tags the filenames accordingly.
* **Run**:
  ```bash
  python scripts/process_docs.py
  ```

---

## ⚙️ Requirements & Prerequisites

* **Python 3.11+**
* **uv**: Recommended Python package manager. Install with:
  ```bash
  powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
  ```
* **agents-cli**: Google Agents CLI. Install with:
  ```bash
  uv tool install google-agents-cli
  ```
