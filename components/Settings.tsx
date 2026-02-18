import React, { useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, GripVertical, RotateCcw } from 'lucide-react';

interface SettingsProps {
  exercises: string[];
  setExercises: React.Dispatch<React.SetStateAction<string[]>>;
  onClose: () => void;
}

interface ExerciseItemProps {
  exercise: string;
  onRemove: () => void;
}

const ExerciseItem: React.FC<ExerciseItemProps> = ({ exercise, onRemove }) => {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={exercise}
      dragListener={false}
      dragControls={dragControls}
      className="touch-manipulation"
    >
      <div className="flex items-center gap-3 bg-surface-container rounded-lg p-3">
        <button
          className="p-1 text-on-surface-variant cursor-grab active:cursor-grabbing touch-manipulation"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <GripVertical size={18} />
        </button>

        <span className="flex-1 text-on-surface">
          {exercise}
        </span>

        <button
          onClick={onRemove}
          className="p-1.5 text-on-surface-variant hover:text-phase-rest-DEFAULT transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </Reorder.Item>
  );
};

export const Settings: React.FC<SettingsProps> = ({
  exercises,
  setExercises,
  onClose,
}) => {
  const [newExercise, setNewExercise] = useState('');

  const handleAdd = () => {
    if (newExercise.trim()) {
      setExercises([...exercises, newExercise.trim()]);
      setNewExercise('');
    }
  };

  const handleRemove = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  const handleReorder = (newOrder: string[]) => {
    setExercises(newOrder);
  };

  const handleReset = () => {
    setExercises(['Right', 'Left', 'Come back', 'Straight']);
  };

  return (
    <div className="flex flex-col h-full max-w-md mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onClose}
          className="p-2 text-on-surface hover:bg-surface-container-high rounded-lg transition-colors"
        >
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-lg font-semibold text-on-surface">Exercises</h2>
        <div className="w-10" />
      </div>

      {/* Add Exercise */}
      <div className="mb-4">
        <p className="text-xs text-on-surface-variant mb-2">
          Called out during work intervals
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newExercise}
            onChange={(e) => setNewExercise(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Burpees"
            className="flex-1 bg-surface-container text-on-surface px-3 py-2.5 rounded-lg border border-outline-variant focus:outline-none focus:border-primary transition-colors text-sm placeholder:text-on-surface-variant/50"
          />
          <button
            onClick={handleAdd}
            disabled={!newExercise.trim()}
            className="bg-primary text-surface px-3 rounded-lg disabled:opacity-40"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Exercise List */}
      <div className="flex-1 overflow-y-auto">
        {exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-on-surface-variant">
            <p className="text-sm">No exercises yet</p>
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={exercises}
            onReorder={handleReorder}
            className="space-y-2"
          >
            {exercises.map((exercise, index) => (
              <ExerciseItem
                key={exercise + index}
                exercise={exercise}
                onRemove={() => handleRemove(index)}
              />
            ))}
          </Reorder.Group>
        )}
      </div>

      {/* Reset Button */}
      <div className="mt-4 pt-4 border-t border-outline-variant">
        <button
          onClick={handleReset}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-on-surface-variant hover:text-primary transition-colors"
        >
          <RotateCcw size={16} />
          Reset to defaults
        </button>
      </div>
    </div>
  );
};
