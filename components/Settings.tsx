import React, { useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, GripVertical, RotateCcw } from 'lucide-react';
import { DEFAULT_CUES } from '../utils/defaultCues';

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
      <div className="flex items-center gap-4 glass-panel rounded-xl p-4 transition-all hover:border-white/10 group">
        <button
          className="p-2 -ml-2 text-on-surface-variant cursor-grab active:cursor-grabbing touch-manipulation opacity-50 hover:opacity-100 hover:text-primary transition-all"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <GripVertical size={20} />
        </button>

        <span className="flex-1 text-on-surface font-medium text-lg tracking-wide">{exercise}</span>

        <button
          onClick={onRemove}
          className="p-2 text-on-surface-variant hover:text-phase-rest-DEFAULT opacity-50 hover:opacity-100 hover:bg-phase-rest-DEFAULT/10 rounded-full transition-all"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </Reorder.Item>
  );
};

export const Settings: React.FC<SettingsProps> = ({ exercises, setExercises, onClose }) => {
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
    setExercises(DEFAULT_CUES);
  };

  return (
    <div className="flex flex-col h-full max-w-md mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 mt-2">
        <button
          onClick={onClose}
          className="p-3 text-on-surface hover:text-primary glass-panel-interactive rounded-2xl transition-colors"
        >
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-xl font-bold tracking-wider text-on-surface">CUES</h2>
        <div className="w-12" />
      </div>

      {/* Add Exercise */}
      <div className="mb-6 glass-panel p-5 rounded-2xl">
        <p className="text-xs font-semibold tracking-wider text-primary uppercase mb-3">
          Add new cue
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={newExercise}
            onChange={(e) => setNewExercise(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Shuffle left"
            className="flex-1 bg-black/20 text-on-surface px-4 py-3.5 rounded-xl border border-white/5 focus:outline-none focus:border-primary focus:shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all font-medium placeholder:text-on-surface-variant/40"
          />
          <button
            onClick={handleAdd}
            disabled={!newExercise.trim()}
            className="bg-primary/20 text-primary border border-primary/40 px-4 rounded-xl disabled:opacity-30 disabled:border-transparent transition-all hover:bg-primary/30 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] flex items-center justify-center cursor-pointer"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      {/* Exercise List */}
      <div className="flex-1 overflow-y-auto pr-1">
        {exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-on-surface-variant glass-panel rounded-2xl">
            <p className="text-sm font-medium">No cues yet</p>
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={exercises}
            onReorder={handleReorder}
            className="space-y-3"
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
      <div className="mt-4 pt-6 pb-safe">
        <button
          onClick={handleReset}
          className="w-full flex items-center justify-center gap-2 py-4 text-sm font-semibold tracking-wide text-on-surface-variant hover:text-primary glass-panel-interactive rounded-xl transition-all"
        >
          <RotateCcw size={18} />
          RESTORE DEFAULTS
        </button>
      </div>
    </div>
  );
};
