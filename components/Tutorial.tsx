import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface TutorialProps {
    onDismiss: () => void;
}

interface Section {
    heading: string;
    body: string;
}

const sections: Section[] = [
    {
        heading: 'What is Interval Trainer?',
        body: 'A distraction-free timer built for explosive interval training — HIIT, boxing, sprints, and more. It counts down each phase and announces them aloud so you never have to look at the screen.',
    },
    {
        heading: 'Setting up your workout',
        body: 'Use the − and + buttons to set Prep, Rest, Cool Down and the number of Rounds. Hold either button to change the value quickly. Work time is fixed at 5 seconds — this timer is designed around short, all-out explosive bursts where every second counts.',
    },
    {
        heading: 'Exercises',
        body: 'Open Settings (the gear icon) to manage your exercise list. Add any movement you like and delete ones you no longer want. At the start of every work interval the app picks one at random and calls it out by voice — so you always know exactly what to do.',
    },
    {
        heading: 'During a workout',
        body: 'Tap Start when you are ready. The phases run automatically: Prep → Work → Rest, repeated for each round, then a Cool Down. Tap the pause button at any time to rest, or tap the X to exit early.',
    },
];

export const Tutorial: React.FC<TutorialProps> = ({ onDismiss }) => (
    <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
    >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onDismiss} />

        {/* Card */}
        <motion.div
            className="relative w-full max-w-sm bg-surface-container-high rounded-3xl shadow-2xl overflow-hidden"
            initial={{ y: 50, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-outline-variant">
                <h2 className="text-base font-semibold text-on-surface">How it works</h2>
                <button
                    onClick={onDismiss}
                    className="p-1.5 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors"
                    aria-label="Close"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Sections */}
            <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[70vh]">
                {sections.map(({ heading, body }) => (
                    <div key={heading}>
                        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                            {heading}
                        </p>
                        <p className="text-sm text-on-surface-variant leading-relaxed">{body}</p>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-3 border-t border-outline-variant">
                <button
                    onClick={onDismiss}
                    className="w-full h-12 bg-primary text-surface font-semibold rounded-xl active:opacity-90 transition-opacity"
                >
                    Got it
                </button>
            </div>
        </motion.div>
    </motion.div>
);
