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
