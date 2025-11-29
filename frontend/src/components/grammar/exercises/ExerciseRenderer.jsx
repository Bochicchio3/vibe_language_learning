import React from 'react';
import MultipleChoice from './MultipleChoice';
import GapFill from './GapFill';
import Reorder from './Reorder';

const ExerciseRenderer = ({ exercise, onAnswer, userAnswer, showResult }) => {
    switch (exercise.type) {
        case 'multiple_choice':
            return (
                <MultipleChoice
                    exercise={exercise}
                    onAnswer={onAnswer}
                    userAnswer={userAnswer}
                    showResult={showResult}
                />
            );
        case 'gap_fill':
            return (
                <GapFill
                    exercise={exercise}
                    onAnswer={onAnswer}
                    userAnswer={userAnswer}
                    showResult={showResult}
                />
            );
        case 'reorder':
            return (
                <Reorder
                    exercise={exercise}
                    onAnswer={onAnswer}
                    userAnswer={userAnswer}
                    showResult={showResult}
                />
            );
        default:
            return <div className="text-red-500">Unknown exercise type: {exercise.type}</div>;
    }
};

export default ExerciseRenderer;
