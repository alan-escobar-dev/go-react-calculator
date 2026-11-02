# Prompts

The prompts I used with Claude Code (VS Code extension) while building this project, recorded
verbatim and in order.

> **Note:** The initial planning and the project's `CLAUDE.md` (the conventions file Claude Code
> reads automatically) were drafted with Claude in a separate chat. I also used that chat
> throughout the project as a reviewer: to discuss Claude Code's plans and output, and to help
> me word some of the prompts below.

## 1. Initial request

*The recruiter's greeting and logistics were omitted from the requirements below for privacy.*

```text
I'm working on a take-home assessment: a full-stack calculator with a React + TypeScript frontend and a Go backend. The full requirements are below, and the project conventions are in CLAUDE.md.

I'm new to Go and React, so as we go, briefly explain key decisions and idiomatic patterns so I fully understand the code.

First, check my environment (Go and Node versions) and tell me if anything needs to be installed.

Then, before writing any code, propose a plan that covers:
1. API design: endpoint(s), request and response shapes, and the error format. Compare a single /api/v1/calculate endpoint with one endpoint per operation, and recommend one with its trade-offs.
2. Edge cases to handle in both layers (division by zero, square root of negative numbers, invalid or missing input, unknown operations, very large numbers).
3. Assumptions that need to be documented, such as how "percentage" should work.
4. Implementation steps in small, testable increments, starting with the pure calculator logic and its tests, with a suggested commit message for each step.

Don't implement anything yet; wait for my review of the plan.

Requirements:
Objective:
Build a full-stack calculator application with a React frontend and a backend microservice. The frontend should consume the backend API to perform basic and advanced arithmetic operations. Focus on clean design, maintainable code, and testable architecture.
Requirements. Functional:
Operations:
Addition, Subtraction, Multiplication, Division
Optional: Exponentiation, Square Root, Percentage

Frontend (React):
Intuitive UI for entering input and displaying results
Input validation and error handling
Responsive design (basic mobile support)

Backend (REST API):
Expose endpoints for calculator operations
Validate input and handle edge cases (division by zero, invalid data)
Return results in JSON format
Non-Functional
Clean, readable, and idiomatic code (frontend and backend)
Unit tests covering key functionality for both layers
Documentation: setup instructions, API usage, and design rationale
Optional: Dockerfile for full-stack deployment
Constraints

Frontend: React (TypeScript preferred)

Backend: Go is perferred

Deliverables:
Git repository with frontend and backend code
README with setup instructions, API examples, and design decisions
Unit tests and coverage report
Optional: Dockerfile to run frontend + backend together
Instructions

Use any AI tooling you would like
Spend ~2–4 hours on this assignment. Prioritize correctness, clarity, and maintainability over extra features.
Push your solution to GitHub, GitLab, or another Git repository.
Share any prompts that you used in your work
Make sure your README includes:
Setup instructions
How to run the frontend and backend
Examples of API calls (if using REST)
Design decisions or assumptions
```

## 2. Answers to Claude's planning questionnaire

Before writing the plan, Claude asked three multiple-choice questions.

**Q1. Which UI style should the calculator frontend use? Both call the same Go API; the choice
mainly changes how much client-side logic we write and test.**

- Options: Form-based (Recommended) · Classic keypad
- My answer: `Classic keypad`

**Q2. Which optional items from the requirements should we include? I recommend all four: with the
planned design each is small (roughly 15–30 minutes).** (multiple choice)

- Options: Power (xʸ) · Square root (√) · Percentage (%) · Dockerfile
- My answer: `Power (xʸ), Square root (√), Percentage (%), Dockerfile`

**Q3. If percentage is included, what should it calculate? (This will be documented as an
assumption in the README.)**

- Options: a % of b (Recommended) · Unary x % · a is what % of b
- My answer: `a % of b (Recommended)`

## 3. Notes on the plan

```text
A few notes for the plan:

1. UI: let's go with the classic keypad, but keep the scope tight:
   - The backend performs every calculation. The frontend only manages input state and calls the API when the user presses "=" (or immediately for square root).
   - Model the input logic as a pure reducer (useReducer) so it can be unit-tested independently of the UI.
   - One operation at a time: no operator precedence or multiple pending operations. After a result, the user can start a new number or use the result as the first operand of the next operation.
   - The display shows the full expression (e.g. "15 % of 200") and shows API errors clearly (e.g. division by zero).
   - Keys: digits, decimal point, ±, C, the operators, and "=". Keyboard support only if time allows.
2. Optional items: include all four, but schedule the Dockerfile as the very last step, after everything else works, is tested, and is documented. If we run short on time, it's the first thing to cut.
3. Docker approach: compare (a) a single image where the Go server also serves the built frontend, with (b) a docker-compose setup with separate frontend and backend containers, which keeps the backend a pure API microservice. Recommend one with its trade-offs.
4. Percentage: "a % of b" (a × b / 100). Document it as an assumption in the README.

Then go ahead and write the full plan.
```

## 4. Feedback on the revised plan

```text
1. Drop ErrNonFiniteInput. NaN and ±Inf can't arrive through JSON, so the API boundary already guarantees finite inputs. I'd rather keep the calculator package simpler and document this in the README.
2. For zero raised to a negative power, return a specific error (e.g. "cannot raise zero to a negative power") instead of reusing the division-by-zero error, since the user never pressed ÷.
3. Keep each step minimal: nothing beyond the plan, and ask before adding anything not listed.
4. Make sure PROMPTS.md records my prompts verbatim, including my questionnaire answers and notes. Also mention that the initial planning and CLAUDE.md were drafted with Claude in a separate chat.

GitHub username: <your-username>
Repo name: <repo-name>
```

## 5. Follow-up after Step 0

```text
Step 0 looks good. A few things before Step 1:

1. My GitHub username is alan-escobar-dev and the repo name is go-react-calculator, so the module path is github.com/alan-escobar-dev/go-react-calculator/backend.
2. The repo will be public, so in PROMPTS.md please trim the recruiter email down to the requirements only: remove the greeting with my full name, the Wonderlic mention, the deadline and the submission link. Add a short note that the greeting and logistics were omitted for privacy.
3. Rename the branch to main.

After that, please help me install Go. I’ll commit Step 0 before restarting VS Code.
```

## 6. Start Step 1

```text
Thank you, we can proceed with step 1
```

## 7. Start Step 2

```text
Step 1 is committed. Let’s continue with Step 2
```

## 8. Start Step 3

```text
Step 2 is committed. Let’s continue with Step 3. Since this is the core of the backend, when you’re done, also walk me through the full request flow: from the HTTP request arriving to the JSON response going out.
```

## 9. Concurrency question and Step 4

```text
Step 3 is committed. Quick question before Step 4: is the handler safe for concurrent requests, given that Go’s server runs each request in its own goroutine? Then let’s continue with Step 4
```

## 10. Port 8081 and README notes

```text
Let's go with option 1: move the project to port 8081, including CLAUDE.md and the plan, so the default works on my machine without stopping the NI service

No race test for now, we can revisit it in the Docker step if there's time

Also, make sure the PowerShell BOM finding ends up in the README notes, along with the Invoke-RestMethod examples

When the port change is done, give me the updated commands so I can try the server and the graceful shutdown myself before committing Step 4
```

## 11. Start Step 5

```text
Step 4 is committed. Let’s continue with Step 5. Since I come from Angular, whenever it helps, compare React concepts with their Angular equivalents
```

## 12. Start Step 6

```text
Step 5 is committed and everything works. Let’s continue with Step 6
```

## 13. Start Step 7

```text
Step 6 is committed. Let’s continue with Step 7, when you’re done, walk me through one example key sequence, like “15 % 200 =”, showing how the state changes after each key press
```

## 14. Start Step 8

```text
Step 7 is committed. Let’s continue with Step 8. When it’s done, explain how the useCalculator hook connects the reducer with the API, and tell me how to run both servers to try the calculator in the browser
```

## 15. Start Step 9 (styling)

```text
Step 8 is committed, and I tried the calculator in the browser: it works. Let's continue with Step 9.

Design direction for the styling:
- A dark theme with purple tones: a near-black, slightly purple background, darker number keys, operators in a purple accent, and "=" as the strongest purple so the eye goes there first. Give C its own color so it's clearly distinct.
- Rounded keys with subtle hover and pressed states, and a display area that clearly separates the small expression line from the large result.
- Keep text readable: aim for WCAG AA contrast (4.5:1) on all text, and make the keyboard focus ring clearly visible against the dark background.
- Define the colors as CSS custom properties in one place, so the palette is easy to tweak later.
- Keep everything from the plan: plain CSS, a mobile-first 4-column grid, a full-width "=", keys of at least 44 px, touch-action: manipulation, and long expressions that shrink or wrap instead of overflowing.

Also, Vite's dev server reloads the page every time the coverage report is written. Please make it ignore the coverage folder.

When you're done, tell me how to check the layout at phone width in Chrome DevTools.
```

## 16. Start Step 10 (README)

```text
Step 9 is committed. Let's skip the keyboard support stretch goal and continue with Step 10.

For the README, write it for a reviewer who wants to understand and run the project quickly:
- Start with a short overview and a screenshot of the calculator. Capture clean desktop and phone screenshots of the final UI into a docs/ folder, like you did in Step 9.
- Requirements (Go and Node versions), then a quick start for running the backend and frontend.
- How to run the tests and the coverage reports, with a short coverage summary for both layers.
- An API reference: the endpoint, request and response shapes, the error format and status codes, with examples for both curl (bash) and PowerShell (Invoke-RestMethod), including the BOM note.
- Design decisions with their trade-offs: the single endpoint, the standard library only, the pure calculator package and sentinel errors, strict JSON decoding, the reducer's phases, the backend doing all the math, request cancellation, plain CSS with WCAG AA contrast, and why the port is 8081.
- Assumptions and known limitations, including the notes we agreed on earlier.
- A section on how I used AI: Claude Code for implementation, a separate Claude chat as a reviewer, and me reviewing, testing and committing every step. Link to PROMPTS.md.
- A short project structure overview.

Keep it concise and easy to scan: tables and short sections over long paragraphs. Also finalize PROMPTS.md and update the layout in CLAUDE.md, as the plan says
```

## 17. Resume after a session restart

```text
You can continue :)
```

## 18. Lower the Go requirement

```text
The README is committed and pushed. Docker Desktop is now running; I had to enable WSL's Virtual Machine Platform first. Before Step 11, as you suggested, lower the go directive in go.mod to 1.24, update the Go requirement in the README, and rerun the tests. Stop after that so I can commit it on its own
```

Follow-ups in the same exchange:

```text
oh wait, are we still on max effort?
```

```text
Let's continue
```

## 19. Start Step 11 (Docker)

```text
The go.mod change is committed. Let's do Step 11: Docker Compose with nginx serving the UI and the Go API behind it, plus a "Run with Docker" section in the README. Skip the race test. For the Go build image, use the current supported release (1.27), not 1.24: Go only supports the two newest releases, so 1.24 no longer gets security fixes. The go.mod directive stays as the compatibility floor. When it's done, give me the commands to run it myself and check it in the browser.
```

## 20. Docker files in the CLAUDE.md layout

```text
Yes, please add compose.yaml and the Dockerfiles to the CLAUDE.md layout
```

## 21. Demo GIF in the README

```text
Step 11 is committed. I added a short demo GIF at docs/demo.gif. At the top of the README, replace the desktop screenshot with the GIF and keep the phone screenshot next to it. Delete docs/screenshot-desktop.png if nothing else uses it. Keep it as its own commit. Thanks!!!
```
