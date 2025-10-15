import React, { useState } from 'react';

interface RunData {
  run_id: string;
  created_at: string;
  files_uploaded: number;
  hasAnalysis?: boolean;
  hasQueries?: boolean;
  hasChatHistory?: boolean;
}

interface SidebarProps {
  onNewRun: () => void;
  onLoadRun: (runId: string) => void;
  onDeleteRun?: (runId: string) => void;
  runs: RunData[];
}

const Sidebar: React.FC<SidebarProps> = ({ onNewRun, onLoadRun, onDeleteRun, runs }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={`bg-white border-r border-gray-200 h-screen overflow-y-auto transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Toggle Button */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg 
            className={`w-5 h-5 text-gray-600 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* New Run Button */}
      <div className="p-4">
        <button
          onClick={onNewRun}
          className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center justify-center transition-colors ${
            isCollapsed ? 'py-3 px-2' : 'py-3 px-4 space-x-2'
          }`}
          title={isCollapsed ? "New Run" : undefined}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          {!isCollapsed && (
            <>
              <span>New Run</span>
              <span className="text-xs bg-blue-500 px-2 py-1 rounded">⌘K</span>
            </>
          )}
        </button>
      </div>

      {/* History Section */}
      <div className="p-4">
        {!isCollapsed && (
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">History</h3>
        )}
        
        {runs.length === 0 ? (
          !isCollapsed && <p className="text-gray-400 text-sm">No previous runs</p>
        ) : (
          <div className="space-y-2">
            {runs.map((run) => {
              const isComplete = run.hasAnalysis;
              const hasQueries = run.hasQueries;
              const hasChat = run.hasChatHistory;
              
              return (
                <div
                  key={run.run_id}
                  className={`flex items-center justify-between hover:bg-gray-50 rounded-lg cursor-pointer group transition-colors ${
                    isCollapsed ? 'p-2' : 'p-3'
                  }`}
                  onClick={() => onLoadRun(run.run_id)}
                  title={isCollapsed ? `${run.run_id.replace('run_', '').replace(/_/g, ' ')} - ${run.files_uploaded} files` : undefined}
                >
                  {isCollapsed ? (
                    // Collapsed view - just show status dots
                    <div className="flex flex-col items-center space-y-1">
                      <div className={`w-3 h-3 rounded-full ${isComplete ? 'bg-green-500' : 'bg-gray-300'}`} 
                           title={isComplete ? 'Analysis complete - Click to open' : 'No analysis - Click to load'}></div>
                      {isComplete && (
                        <div className="flex flex-col space-y-1">
                          {hasQueries && <div className="w-2 h-2 bg-blue-500 rounded-full" title="Has queries"></div>}
                          {hasChat && <div className="w-2 h-2 bg-purple-500 rounded-full" title="Has chat history"></div>}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Expanded view - full details
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {run.run_id.replace('run_', '').replace(/_/g, ' ')}
                          </p>
                          {isComplete && (
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full" title="Analysis complete"></div>
                              {hasQueries && <div className="w-2 h-2 bg-blue-500 rounded-full" title="Has queries"></div>}
                              {hasChat && <div className="w-2 h-2 bg-purple-500 rounded-full" title="Has chat history"></div>}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(run.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-400">
                          {run.files_uploaded} file{run.files_uploaded !== 1 ? 's' : ''}
                          {isComplete ? ' • Ready to explore' : ' • Needs analysis'}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (onDeleteRun) {
                            onDeleteRun(run.run_id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-opacity"
                        title={`Delete run ${run.run_id}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;

