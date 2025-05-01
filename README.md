flowchart TD
 subgraph Input["Input"]
        A["RPG Source Code Files incl. /COPY"]
  end
 subgraph subGraph1["LLM-Driven Analysis & Transformation Core"]
        B["Step 1: LLM Code Parser"]
        C["Step 2: LLM Pseudocode Generator"]
        D["Step 3: LLM Flow Diagram Generator"]
        E["Step 4: LLM Business Doc Generator"]
        F["Step 5: LLM Target Code Generator - Python/Java"]
  end
 subgraph subGraph2["Generated Artifacts & Documentation"]
        G["Parsed Code Representation"]
        H["Generated Pseudocode"]
        I["Generated Flow Diagram"]
        J["Generated Business Document"]
        K["Generated Target Code Draft - Python/Java"]
  end
 subgraph subGraph3["Developer Refinement & CI/CD"]
        L["Developer IDE - Cursor AI"]
        M["Jenkins Pipeline"]
        N["Checkmarx - SAST"]
        O["SonarQube - Code Quality"]
        P["Version Control - e.g., Git"]
        Q["Final Modernized & Verified Code"]
  end
    A -- RPG Source --> B & C & D & E
    B -- Parsed Code (JSON/Structured) --> C
    C -- Pseudocode --> D & E & F
    B -- Parsed Code --> D & E & F
    D -- Flow Diagram (Mermaid/Text) --> E
    E -- Business Document Draft --> F
    D -- Flow Diagram --> F
    B --> G
    C --> H
    D --> I
    E --> J
    F --> K
    J -- Input/Context --> L
    I -- Input/Context --> L
    H -- Input/Context --> L
    G -- Input/Context --> L
    K -- Initial Code --> L
    L -- Refined Code --> P
    P -- Trigger --> M
    M -- Run --> N & O
    N -- Scan Results --> M
    O -- Quality Gates --> M
    M -- Build/Test Status --> P
    P -- Verified Code --> Q

    style L fill:#cde,stroke:#333
    style M fill:#fce,stroke:#333
    style N fill:#fce,stroke:#333
    style O fill:#fce,stroke:#333
    style P fill:#fce,stroke:#333
    style subGraph1 fill:#FF6D00


---
config:
  layout: fixed
---
flowchart LR
 subgraph RMA["RPG Modernization Assistant"]
    direction TB
        RPG@{ label: "<div style=\"text-align:center;\">\n            <img src=\"https://img.icons8.com/color/48/000000/document.png\" width=\"32\"><br>\n            <b>Legacy RPG</b><br>\n            Source Code\n            </div>" }
        TOOL@{ label: "<div style=\"text-align:center;\">\n            <img src=\"https://img.icons8.com/color/48/000000/wrench.png\" width=\"32\"><br>\n            <b>Multi-LLM</b><br>\n            Processing\n            </div>" }
  end
 subgraph ARTIFACTS["Generated Artifacts"]
    direction TB
        PSEUDO@{ label: "<div style=\"text-align:center;\">\n            <img src=\"https://img.icons8.com/color/48/000000/workflow.png\" width=\"32\"><br>\n            <b>Pseudocode</b><br>\n            Core Logic\n            </div>" }
        FLOW@{ label: "<div style=\"text-align:center;\">\n            <img src=\"https://img.icons8.com/color/48/000000/activity-feed.png\" width=\"32\"><br>\n            <b>Flow Diagrams</b><br>\n            Visual Process\n            </div>" }
        BIZ@{ label: "<div style=\"text-align:center;\">\n            <img src=\"https://img.icons8.com/color/48/000000/business-report.png\" width=\"32\"><br>\n            <b>Business Logic</b><br>\n            Domain Knowledge\n            </div>" }
        CODE@{ label: "<div style=\"text-align:center;\">\n            <img src=\"https://img.icons8.com/color/48/000000/source-code.png\" width=\"32\"><br>\n            <b>Initial Code</b><br>\n            Structure &amp; Logic\n            </div>" }
  end
 subgraph CURSOR["Cursor AI IDE"]
    direction TB
        IMPORT@{ label: "<div style=\"text-align:center;\">\n            <img src=\"https://img.icons8.com/color/48/000000/import.png\" width=\"32\"><br>\n            <b>Import &amp; Ingest</b><br>\n            All Artifacts\n            </div>" }
        CONTEXT@{ label: "<div style=\"text-align:center;\">\n            <img src=\"https://img.icons8.com/color/48/000000/brain.png\" width=\"32\"><br>\n            <b>Context Window</b><br>\n            Full Understanding\n            </div>" }
        VIBE@{ label: "<div style=\"text-align:center;\">\n            <img src=\"https://img.icons8.com/color/48/000000/chat.png\" width=\"32\"><br>\n            <b>Vibe Coding</b><br>\n            Natural Language\n            </div>" }
        PAIR@{ label: "<div style=\"text-align:center;\">\n            <img src=\"https://img.icons8.com/color/48/000000/collaborate.png\" width=\"32\"><br>\n            <b>AI Pair Programming</b><br>\n            Collaborative Development\n            </div>" }
  end
 subgraph OUTPUT["Complete Application"]
    direction TB
        MODULES@{ label: "<div style=\"text-align:center;\">\n            <img src=\"https://img.icons8.com/color/48/000000/module.png\" width=\"32\"><br>\n            <b>Full Modules</b><br>\n            Business Components\n            </div>" }
        UI@{ label: "<div style=\"text-align:center;\">\n            <img src=\"https://img.icons8.com/color/48/000000/microsoft-forms.png\" width=\"32\"><br>\n            <b>Modern UI</b><br>\n            User Experience\n            </div>" }
        TESTS@{ label: "<div style=\"text-align:center;\">\n            <img src=\"https://img.icons8.com/color/48/000000/test-tube.png\" width=\"32\"><br>\n            <b>Comprehensive Tests</b><br>\n            Quality Assurance\n            </div>" }
        DOCS@{ label: "<div style=\"text-align:center;\">\n            <img src=\"https://img.icons8.com/color/48/000000/documents.png\" width=\"32\"><br>\n            <b>Complete Documentation</b><br>\n            Developer &amp; User Docs\n            </div>" }
  end
    RPG --> TOOL
    TOOL --> PSEUDO & FLOW & BIZ & CODE
    PSEUDO --> IMPORT
    FLOW --> IMPORT
    BIZ --> IMPORT
    CODE --> IMPORT
    IMPORT --> CONTEXT
    CONTEXT --> VIBE
    VIBE --> PAIR
    PAIR --> MODULES & UI & TESTS & DOCS
    MODULES --> DEPLOY@{ label: "<div style=\"text-align:center;\">\n        <img src=\"https://img.icons8.com/color/48/000000/rocket.png\" width=\"32\"><br>\n        <b>PRODUCTION DEPLOYMENT</b><br>\n        Modern Application\n        </div>" }
    UI --> DEPLOY
    TESTS --> DEPLOY
    DOCS --> DEPLOY
    RMA -. FOUNDATION<br>BUILDING .-> ARTIFACTS
    ARTIFACTS -. CONTEXT<br>TRANSFER .-> CURSOR
    CURSOR -. COMPLETE<br>DEVELOPMENT .-> OUTPUT
    OUTPUT -. DELIVER<br>VALUE .-> DEPLOY
    RPG@{ shape: rect}
    TOOL@{ shape: rect}
    PSEUDO@{ shape: rect}
    FLOW@{ shape: rect}
    BIZ@{ shape: rect}
    CODE@{ shape: rect}
    IMPORT@{ shape: rect}
    CONTEXT@{ shape: rect}
    VIBE@{ shape: rect}
    PAIR@{ shape: rect}
    MODULES@{ shape: rect}
    UI@{ shape: rect}
    TESTS@{ shape: rect}
    DOCS@{ shape: rect}
    DEPLOY@{ shape: rect}
     RPG:::rpgBox
     TOOL:::rpgBox
     PSEUDO:::artifactsBox
     FLOW:::artifactsBox
     BIZ:::artifactsBox
     CODE:::artifactsBox
     IMPORT:::cursorBox
     CONTEXT:::cursorBox
     VIBE:::cursorBox
     PAIR:::cursorBox
     MODULES:::outputBox
     UI:::outputBox
     TESTS:::outputBox
     DOCS:::outputBox
     DEPLOY:::deployBox
    classDef rpgBox fill:#fae5d3,stroke:#e67e22,stroke-width:2px,color:#e67e22,rx:5px
    classDef artifactsBox fill:#d4efdf,stroke:#27ae60,stroke-width:2px,color:#27ae60,rx:5px
    classDef cursorBox fill:#d6eaf8,stroke:#2980b9,stroke-width:3px,color:#2980b9,rx:10px
    classDef outputBox fill:#f5eef8,stroke:#8e44ad,stroke-width:2px,color:#8e44ad,rx:5px
    classDef deployBox fill:#fadbd8,stroke:#c0392b,stroke-width:3px,color:#c0392b,rx:10px
