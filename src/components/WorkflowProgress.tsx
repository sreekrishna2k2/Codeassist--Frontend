import React from 'react';

type Props = {
	currentStep?: number;
	steps?: string[];
};

const DEFAULT_STEPS = [
	'Upload',
	'Analyze',
	'Describe',
	'Explore',
	'Query',
];

export default function WorkflowProgress({ currentStep = 1, steps = DEFAULT_STEPS }: Props) {
	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
			{steps.map((label, idx) => {
				const step = idx + 1;
				const active = step === currentStep;
				const completed = step < currentStep;
				return (
					<div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
						<div
							style={{
								width: 22,
								height: 22,
								borderRadius: '50%',
								background: completed ? '#10b981' : active ? '#3b82f6' : '#e5e7eb',
								color: completed || active ? '#fff' : '#111827',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								fontSize: 12,
							}}
						>
							{step}
						</div>
						<span style={{ fontSize: 12, color: active ? '#111827' : '#6b7280', whiteSpace: 'nowrap' }}>{label}</span>
						{step !== steps.length && <div style={{ width: 24, height: 2, background: completed ? '#10b981' : '#e5e7eb' }} />}
					</div>
				);
			})}
		</div>
	);
}




