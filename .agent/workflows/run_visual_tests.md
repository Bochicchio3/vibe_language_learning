---
description: Run visual behavior tests and generate a report
---

1. Read the content of `docs/visual_behavior_tests.md` to get the latest test definitions.
2. Call the `browser_subagent` tool with the following task:
   "You are a QA engineer. Execute the following visual verification steps on http://localhost:5173.
   
   [INSERT CONTENT OF docs/visual_behavior_tests.md HERE]
   
   For each step, perform the action and verify the expected result.
   Report your findings for each section, clearly marking PASS or FAIL."

3. Create a new file in `tests/outputs/` named `report_YYYY-MM-DD_HH-MM-SS.md` (use current timestamp).
4. Write the full output/report from the browser subagent into this new file.
5. Notify the user that the tests have been run and the report is saved.
