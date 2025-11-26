# GEMINI Instructions

## Documentation Maintenance
When adding new features or modifying existing ones, you **MUST** update the following documents:

1.  **`docs/repository_structure.md`**:
    -   If you add a new file/component, add it to the appropriate section with a brief description of its goal.
    -   If you modify the purpose of a component, update its description.

2.  **`docs/visual_behavior_tests.md`**:
    -   If you add a new user-facing feature, add a corresponding manual verification step in the appropriate section.
    -   Ensure the test steps are clear and actionable.

## Testing
-   **Code Tests**: Whenever possible, add unit tests for new logic (utils, services, hooks). Run them to verify correctness.
-   **Visual Tests**: After implementing a feature, perform the manual steps listed in `docs/visual_behavior_tests.md` to ensure the UI behaves as expected.
