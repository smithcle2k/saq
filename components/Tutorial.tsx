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
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onDismiss} />

        {/* Card */}
        <motion.div
            className="relative w-full max-w-md glass-panel rounded-[2rem] shadow-2xl overflow-hidden border border-white/10"
            initial={{ y: 50, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20"></div>

            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-white/5 relative z-10">
                <h2 className="text-xl font-bold tracking-wide text-on-surface">HOW IT WORKS</h2>
                <button
                    onClick={onDismiss}
                    className="p-2.5 rounded-full text-on-surface-variant hover:text-primary bg-white/5 hover:bg-white/10 transition-colors"
                    aria-label="Close"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Sections */}
            <div className="px-8 py-6 space-y-6 overflow-y-auto max-h-[60vh] relative z-10">
                {sections.map(({ heading, body }) => (
                    <div key={heading}>
                        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1.5 drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]">
                            {heading}
                        </p>
                        <p className="text-base text-on-surface-variant leading-relaxed font-medium">{body}</p>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="px-8 pb-8 pt-6 border-t border-white/5 relative z-10">
                <button
                    onClick={onDismiss}
                    className="w-full h-14 bg-primary/20 border border-primary/40 text-primary font-bold tracking-wider text-lg rounded-2xl hover:bg-primary/30 hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] active:scale-95 transition-all"
                >
                    GET STARTED
                </button>
            </div>
        </motion.div>
    </motion.div>
);
