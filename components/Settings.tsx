import React, { useState } from 'react';
import { ArrowLeft, Plus, X, Trash2 } from 'lucide-react';

interface SettingsProps {
  exercises: string[];
  setExercises: React.Dispatch<React.SetStateAction<string[]>>;
  onClose: () => void;
}

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

  return (
    <div className="flex flex-col h-full max-w-md mx-auto bg-gray-900 p-4">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onClose}
          className="text-white p-2 hover:bg-gray-800 rounded-full transition-colors"
        >
          <ArrowLeft size={28} />
        </button>
        <h2 className="text-xl font-bold text-white uppercase tracking-wider">Custom Exercises</h2>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="bg-gray-800 p-4 rounded-lg mb-6 shadow-md border border-gray-700">
        <p className="text-gray-400 text-sm mb-2">
          Add exercises to be randomly announced during the "Work" interval.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newExercise}
            onChange={(e) => setNewExercise(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="E.g., Burpees"
            className="flex-1 bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:border-sky-500"
          />
          <button
            onClick={handleAdd}
            className="bg-sky-600 text-white p-3 rounded-lg font-bold hover:bg-sky-500 transition-colors"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {exercises.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No exercises added. Please add some!
          </div>
        ) : (
          <div className="space-y-2">
            {exercises.map((exercise, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm"
              >
                <span className="text-gray-900 font-bold text-lg">{exercise}</span>
                <button
                  onClick={() => handleRemove(index)}
                  className="text-red-500 hover:text-red-700 p-2"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-4 text-center">
        <button
            onClick={() => {
                setExercises(['Right', 'Left', 'Come back', 'Straight']);
            }}
            className="text-sky-400 text-sm underline hover:text-sky-300"
        >
            Reset to Defaults
        </button>
      </div>
    </div>
  );
};
