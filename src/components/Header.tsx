import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

interface HeaderProps {
  currentStep?: number;
}

const Header: React.FC<HeaderProps> = ({ currentStep = 1 }) => {
  const navigate = useNavigate();
  const { runId } = useParams<{ runId: string }>();
  const location = useLocation();
  
  const steps = [
    { id: 1, name: 'Upload & Select', icon: '📁', path: '/upload' },
    { id: 2, name: 'Preview & Profile', icon: '{}', path: runId ? `/explorer/${runId}` : '/explorer' },
    { id: 3, name: 'Generate & Analyze', icon: '💬', path: runId ? `/chat-query/${runId}` : '/chat-query' },
  ];

  const handleStepClick = (stepId: number, path: string) => {
    // Only allow navigation to steps that are accessible
    if (stepId === 1) {
      // Always allow going back to upload page
      navigate(path);
    } else if (stepId === 2 && runId) {
      // Only allow going to explorer if we have a runId
      navigate(path);
    } else if (stepId === 3 && runId) {
      // Only allow going to chat query if we have a runId
      navigate(path);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Brand */}
        <div 
          className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/')}
        >
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-sm"></div>
          </div>
          <div>
            <span className="text-xl font-semibold text-gray-900">CodeAssist</span>
            {runId && (
              <p className="text-xs text-gray-500 -mt-1">
                {runId.replace('run_', 'Run ').replace(/_/g, ' ')}
              </p>
            )}
          </div>
        </div>

        {/* Workflow Progress - Hide on landing page */}
        {location.pathname !== '/' && (
          <div className="flex items-center space-x-8">
          {steps.map((step, index) => {
            const isAccessible = step.id === 1 || (step.id > 1 && runId);
            const isCurrentStep = currentStep === step.id;
            
            return (
              <React.Fragment key={step.id}>
                <div 
                  className={`flex items-center space-x-2 ${
                    isAccessible 
                      ? 'cursor-pointer hover:opacity-80 transition-opacity' 
                      : 'cursor-not-allowed opacity-50'
                  }`}
                  onClick={() => isAccessible && handleStepClick(step.id, step.path)}
                  title={isAccessible ? `Go to ${step.name}` : 'Complete previous steps first'}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                      isCurrentStep
                        ? 'bg-blue-600 text-white ring-2 ring-blue-200'
                        : currentStep > step.id
                        ? 'bg-green-600 text-white'
                        : isAccessible
                        ? 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step.icon
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-xs font-medium transition-colors ${
                        isCurrentStep
                          ? 'text-blue-600'
                          : currentStep > step.id
                          ? 'text-green-600'
                          : isAccessible
                          ? 'text-gray-500 hover:text-gray-700'
                          : 'text-gray-400'
                      }`}
                    >
                      {step.name}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            );
           })}
         </div>
        )}
      </div>
    </header>
  );
};

export default Header;

