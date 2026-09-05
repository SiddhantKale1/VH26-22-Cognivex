# Live Demo Guide & Evaluation Script

**Event**: UCET 2026 HACK-A-THON: PIXELS TO POSSIBILITIES  
**Deliverable 3**: Live Demo Walkthrough for Evaluators  

This guide provides the exact demonstration sequence to showcase compliance with all core problem statement challenges.

---

## Quick Setup
1. **Start Backend**:
   - Double-click `start_backend.bat` (or run `uvicorn app.main:app --reload` from `backend/` with the virtual environment activated).
   - Backend URL: `http://127.0.0.1:8000`
   - Health check: `http://127.0.0.1:8000/health` (verify `indexed_chunks: 6729`).
2. **Start Frontend**:
   - Double-click `start_frontend.bat` (or run `npm run dev` from `frontend/`).
   - Open browser at `http://localhost:5173`.
3. Alternatively, run `start_all.bat` to launch both with one click.

---

## Test Scenario 1: Exact Code Query
**Objective**: Demonstrate precise lookup of cryptic fault codes with parameter extraction and exact page citation.

- **Query**: `Fault F07900`
- **Machine Scope**: SINAMICS G120 Drive (or leave on Auto-Detect)
- **What to Demonstrate to Judges**:
  1. Instant retrieval of **SINAMICS G120 Operating Instructions** (Page 390).
  2. The system identifies that `F07900` means **"Drive: Motor blocked / speed controller at limit"**.
  3. The response lists specific parameters mentioned in the manual:
     - Torque limits `r1538` and `r1539`
     - Speed threshold parameter `p2175`
     - Delay time parameter `p2177`
  4. Step-by-step checkable action items for the technician.
  5. Click **"View Excerpt"** on the citation to show the verbatim source text from page 390.

---

## Test Scenario 2: Natural Language Symptom Query
**Objective**: Demonstrate semantic search understanding of vague physical symptoms described by a technician without knowing the error code.

- **Query**: `"Why is the drive motor humming loudly and overheating at low speeds?"`
- **Machine Scope**: Auto-Detect or SINAMICS G120 Drive
- **What to Demonstrate to Judges**:
  1. Dense vector semantic search finds load monitoring and thermal protection sections.
  2. System diagnoses motor overheating and potential load blockages or insufficient fan cooling at low speeds.
  3. Recommends checking thermal motor protection parameters and cooling airflow.
  4. Displays citations from G120 manual sections covering **Motor Thermal Protection** and **Load Monitoring**.

---

## Test Scenario 3: Cross-Manual Ambiguity Case
**Objective**: Demonstrate cross-document ambiguity detection when an identical code exists in multiple machine manuals with different meanings.

- **Query**: `Error 8013`
- **Machine Scope**: `All Machines (Auto-Detect)` — **DO NOT select a specific machine yet!**
- **What to Demonstrate to Judges**:
  1. The system detects that `8013` appears in both **SIMATIC S7-1200 PLC** and **SINAMICS G120 Drive**.
  2. Instead of hallucinating a blended answer or guessing, the system triggers the **Ambiguity Alert Banner**:
     > *"The code or symptom '16#8013' appears in manuals for multiple machines with completely different meanings and repair procedures. Which machine are you currently troubleshooting?"*
  3. Two interactive cards appear:
     - **Card 1 (SINAMICS G120 Drive)**: *Function Diagram 8013: Load rotation monitoring via encoder (Page 330)*
     - **Card 2 (SIMATIC S7-1200 PLC)**: *PROFINET Status 8013: Error during connection establishment with TRCV instruction (Page 695)*
  4. Click the **SIMATIC S7-1200 PLC** button.
  5. The assistant immediately resolves the diagnosis for the PLC network socket error with S7-1200 manual page 695 cited!

---

## Test Scenario 4: "Insufficient Information" / Hallucination Control Case
**Objective**: Demonstrate deterministic refusal when documentation does not contain the requested fault or hardware.

- **Query**: `"Error E9999 hydraulic valve burst on production line"`
- **Machine Scope**: `All Machines`
- **What to Demonstrate to Judges**:
  1. Siemens manuals in the knowledge base cover electrical drives and PLCs, not third-party hydraulic valves, and error `E9999` does not exist in the manuals.
  2. The algorithmic retrieval threshold halts the pipeline: **Confidence = Insufficient**.
  3. The system triggers the **Hallucination Guardrail Banner**:
     > *"Hallucination Guardrail Active: Information Not Verified in Indexed Manuals."*
  4. The assistant explains that the code does not exist in official documentation, refusing to invent a fake fix that could be dangerous to plant equipment.
  5. It provides standardized, safe factory protocols (inspecting physical hardware diagnostic LEDs, consulting OEM electrical schematics).

---

## Bonus Test: Multi-Turn Conversational Memory
**Objective**: Demonstrate follow-up troubleshooting dialogue without repeating context.

1. First turn: `"My SINAMICS G120 drive stopped with error F07900"`
   - Assistant answers with causes and motor block checks.
2. Second turn (Follow-up): `"And what if checking motor rotation doesn't fix it?"`
   - Notice that the user **did not repeat** the machine name or error code!
   - Assistant uses conversation memory, retains active fault `F07900` and `sinamics-drive`, and deep-dives into encoder wiring, torque limits `r1538`, and parameter `p2175`!

---

## Bonus Test: Hands-Free Voice Input
**Objective**: Show voice dictation for factory floor technicians wearing gloves.

1. Click the **🎙️ Voice** button in the chat input tray.
2. Speak clearly into your microphone: *"Error F07900 motor blocked"*.
3. Notice the microphone button pulses red with `🔴 Listening...`, transcribes the text directly into the query box, and submits for diagnosis.
