#!/bin/bash
# Script to update imports in reorganized components

# Update imports in layout components
find src/components/layout -name "*.jsx" -type f -exec sed -i '' \
  -e "s|from '../ConfirmationModal'|from '../shared/ConfirmationModal'|g" \
  -e "s|from '../FeedbackModal'|from '../shared/FeedbackModal'|g" \
  -e "s|from '../GamificationComponents'|from '../shared/GamificationComponents'|g" \
  -e "s|from './ConfirmationModal'|from '../shared/ConfirmationModal'|g" \
  -e "s|from './FeedbackModal'|from '../shared/FeedbackModal'|g" \
  -e "s|from './GamificationComponents'|from '../shared/GamificationComponents'|g" \
  {} \;

# Update imports in views
find src/components/views -name "*.jsx" -type f -exec sed -i '' \
  -e "s|from '../Layout'|from '../layout/Layout'|g" \
  -e "s|from '../ChatWidget'|from '../layout/ChatWidget'|g" \
  -e "s|from '../SettingsModal'|from '../layout/SettingsModal'|g" \
  -e "s|from '../ConfirmationModal'|from '../shared/ConfirmationModal'|g" \
  -e "s|from '../FeedbackModal'|from '../shared/FeedbackModal'|g" \
  -e "s|from '../GamificationComponents'|from '../shared/GamificationComponents'|g" \
  -e "s|from '../Flashcard'|from '../vocabulary/Flashcard'|g" \
  -e "s|from '../GrammarTopicCard'|from '../grammar/GrammarTopicCard'|g" \
  -e "s|from '../GrammarLesson'|from '../grammar/GrammarLesson'|g" \
  -e "s|from '../GrammarExercise'|from '../grammar/GrammarExercise'|g" \
  -e "s|from '../GrammarLevelSelector'|from '../grammar/GrammarLevelSelector'|g" \
  -e "s|from './Layout'|from '../layout/Layout'|g" \
  -e "s|from './ChatWidget'|from '../layout/ChatWidget'|g" \
  -e "s|from './SettingsModal'|from '../layout/SettingsModal'|g" \
  -e "s|from './ConfirmationModal'|from '../shared/ConfirmationModal'|g" \
  -e "s|from './FeedbackModal'|from '../shared/FeedbackModal'|g" \
  -e "s|from './GamificationComponents'|from '../shared/GamificationComponents'|g" \
  -e "s|from './Flashcard'|from '../vocabulary/Flashcard'|g" \
  -e "s|from './GrammarTopicCard'|from '../grammar/GrammarTopicCard'|g" \
  -e "s|from './GrammarLesson'|from '../grammar/GrammarLesson'|g" \
  -e "s|from './GrammarExercise'|from '../grammar/GrammarExercise'|g" \
  -e "s|from './GrammarLevelSelector'|from '../grammar/GrammarLevelSelector'|g" \
  {} \;

# Update imports in grammar components
find src/components/grammar -name "*.jsx" -type f -exec sed -i '' \
  -e "s|from '../ConfirmationModal'|from '../shared/ConfirmationModal'|g" \
  -e "s|from './ConfirmationModal'|from '../shared/ConfirmationModal'|g" \
  {} \;

# Update imports in vocabulary components
find src/components/vocabulary -name "*.jsx" -type f -exec sed -i '' \
  -e "s|from '../ConfirmationModal'|from '../shared/ConfirmationModal'|g" \
  -e "s|from './ConfirmationModal'|from '../shared/ConfirmationModal'|g" \
  {} \;

# Update imports in library components (already in subfolder)
find src/components/library -name "*.jsx" -type f -exec sed -i '' \
  -e "s|from '../ConfirmationModal'|from '../shared/ConfirmationModal'|g" \
  -e "s|from '../FeedbackModal'|from '../shared/FeedbackModal'|g" \
  -e "s|from '../GamificationComponents'|from '../shared/GamificationComponents'|g" \
  {} \;

# Update imports in progress components (already in subfolder)
find src/components/progress -name "*.jsx" -type f -exec sed -i '' \
  -e "s|from '../ConfirmationModal'|from '../shared/ConfirmationModal'|g" \
  -e "s|from '../GamificationComponents'|from '../shared/GamificationComponents'|g" \
  {} \;

echo "Import paths updated successfully!"
