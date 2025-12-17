# DUBBER AI & SUPER APP - ARCHITECTURAL MANIFESTO

**GOAL:** Build a world-class "System-as-a-Service" module that integrates into a future Super App (Browser-OS).

## 1. Core Philosophy: "SaaS-as-an-API"
Every application we build (like DubberAI) must function as a standalone micro-frontend that can be injected into a larger container (Super App).
*   **The Super App** is just a shell (Header, Sidebar, Tab System).
*   **DubberAI** is an App (Tab) within it.
*   **Integration:** The Super App loads DubberAI via a unified Interface/API. It passes UserAuth and Credits down; DubberAI passes UI and Logic up.

## 2. Design Pattern: The "Provider" Abstraction
To ensure modularity and avoid spaghetti code, we strictly adhere to the **Interface-Provider Pattern**.

### Rules:
1.  **Strict Interfaces (`types.ts`):** Define *what* needs to be done, not *how*.
    *   Example: `transcribe(audio)` returns `text`. It doesn't care if it's Gemini, OpenAI, or Local Whisper.
2.  **Provider Registry (`providers.ts`):** A central factory that returns the implementation.
    *   Easy Switch: To go from Cloud to Local, we only change `getSTT()` in the Registry. The rest of the app changes ZERO lines of code.
3.  **Pipeline Orchestrator (`pipeline.ts`):** Managing the flow (Upload -> STT -> Trans -> TTS -> Sync).
    *   State Machine: Manages `JobState`.
    *   UI Agnostic: The pipeline doesn't touch the DOM. It updates a State Object.

## 3. UI/UX Principles
*   **Visual Pipeline:** The "Metro Stop" visualization is our signature. It must track progress precisely.
*   **Clickable Workflow:** Users define their path by clicking pipeline nodes (Cascading Logic: Selecting Step C auto-selects A and B).
*   **Separation of Concerns:**
    *   **Input Zone:** "Source Media" & "Voice Library" (Config).
    *   **Action Zone:** "Processing" (Monitor & Start Button).
    *   **Result Zone:** Video/Audio Player.

## 4. Future-Proofing for Local Execution
To switch to Local Hardware (GPU 4090):
1.  **Backend:** We replace the Gemini API calls in `providers.ts` with `fetch('http://localhost:8000/transcribe')`.
2.  **Python Backend:** We build a simple Python API wrapping:
    *   `Faster-Whisper` (STT)
    *   `NLLB / Madlad` (Translation)
    *   `Coqui TTS / RVC` (Cloning)
    *   `Wav2Lip / SadTalker` (Sync)

## 5. Coding Standards for AI Generation
When asking AI to update this project:
*   "Maintain the Provider Pattern."
*   "Do not mix UI logic with Business Logic (keep `pipeline.ts` pure)."
*   "Ensure the UI is responsive and dark-mode first."
*   "Use Tailwind for all styling."

---
*Copy this prompt to ensure consistency in future iterations.*
