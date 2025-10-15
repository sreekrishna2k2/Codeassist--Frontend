import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import UploadSection from '../components/UploadSection';
import TableSelection from '../components/TableSelection';
import DataSourcesSelection from '../components/DataSourcesSelection';
import { apiService, Run, Table } from '../services/api';

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [runs, setRuns] = useState<Run[]>([]);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Determine current view based on URL parameters
  const currentView = searchParams.get('source') === 'files' ? 'fileUpload' : 'dataSources';

  // Load runs on component mount
  useEffect(() => {
    loadRuns();
  }, []);

  // Load tables when a run is selected
  useEffect(() => {
    if (currentRunId) {
      loadTables(currentRunId);
    }
  }, [currentRunId]);

  const loadRuns = async () => {
    try {
      const runsData = await apiService.getRuns();
      
      // Enhance run data with analysis status
      const enhancedRuns = await Promise.all(
        runsData.map(async (run) => {
          try {
            // Check if analysis exists
            const hasAnalysis = await checkRunAnalysisStatus(run.run_id);
            
            // Check if queries exist
            const queries = await apiService.getQueries(run.run_id);
            const hasQueries = queries && queries.length > 0;
            
            // Check if chat history exists
            const chatHistory = await apiService.getChatHistory(run.run_id);
            const hasChatHistory = chatHistory && chatHistory.length > 0;
            
            return {
              ...run,
              hasAnalysis,
              hasQueries,
              hasChatHistory
            };
          } catch (error) {
            console.log(`Error checking status for run ${run.run_id}:`, error);
            return {
              ...run,
              hasAnalysis: false,
              hasQueries: false,
              hasChatHistory: false
            };
          }
        })
      );
      
      setRuns(enhancedRuns);
    } catch (error) {
      console.error('Error loading runs:', error);
    }
  };

  const loadTables = async (runId: string) => {
    try {
      console.log('Loading tables for run:', runId);
      const tablesData = await apiService.getTables(runId);
      console.log('Loaded tables:', tablesData);
      setTables(tablesData);
    } catch (error) {
      console.error('Error loading tables:', error);
      setError('Failed to load tables. Please try again.');
    }
  };

  const handleNewRun = () => {
    setCurrentRunId(null);
    setTables([]);
    setUploadedFiles([]);
    setError(null);
    setSuccessMessage(null);
  };

  const handleLoadRun = async (runId: string) => {
    try {
      await apiService.loadRun(runId);
      setCurrentRunId(runId);
      
      // Check if this run already has analysis data
      const hasExistingAnalysis = await checkRunAnalysisStatus(runId);
      
      if (hasExistingAnalysis) {
        setSuccessMessage('Run loaded successfully! Analysis data already exists. Navigating to Explorer...');
        // Auto-navigate to Explorer page since analysis is complete
        setTimeout(() => {
          navigate(`/explorer/${runId}`);
        }, 1000);
      } else {
        setSuccessMessage('Run loaded successfully! Please analyze tables to continue.');
      }
    } catch (error) {
      console.error('Error loading run:', error);
      setError('Failed to load run. Please try again.');
    }
  };

  const checkRunAnalysisStatus = async (runId: string): Promise<boolean> => {
    try {
      // Check if schema analysis exists
      const schemaData = await apiService.getSchemaAnalysis(runId);
      return schemaData && Object.keys(schemaData.tables || {}).length > 0;
    } catch (error) {
      console.log('No existing analysis found for run:', runId);
      return false;
    }
  };

  const handleDeleteRun = async (runId: string) => {
    if (!window.confirm(`Are you sure you want to delete run "${runId}"? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log('Deleting run:', runId);
      await apiService.deleteRun(runId);
      console.log('Run deleted successfully');
      
      setSuccessMessage(`Run "${runId}" deleted successfully.`);
      
      // If we deleted the current run, clear it
      if (currentRunId === runId) {
        setCurrentRunId(null);
        setTables([]);
        setUploadedFiles([]);
        setError(null);
        setSuccessMessage('Current run cleared. Please select or create a new run.');
      }
      
      // Reload the runs list
      await loadRuns();
    } catch (error) {
      console.error('Error deleting run:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to delete run "${runId}": ${errorMessage}`);
    }
  };

  const handleFilesUploaded = async (files: File[]) => {
    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      // Pass current run ID if it exists, otherwise create new run
      const response = await apiService.uploadTables(files, currentRunId || undefined);
      setCurrentRunId(response.run_id);
      setUploadedFiles(prevFiles => [...prevFiles, ...files]); // Accumulate files
      setSuccessMessage(`Successfully uploaded ${files.length} file(s): ${files.map(f => f.name).join(', ')}`);
      
      // Load tables immediately after upload
      await loadTables(response.run_id);
      
      // Reload runs to update the list
      await loadRuns();
    } catch (error) {
      console.error('Error uploading files:', error);
      setError('Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = async (indexToRemove: number) => {
    const fileToRemove = uploadedFiles[indexToRemove];
    try {
      if (currentRunId && fileToRemove) {
        await apiService.deleteFile(currentRunId, fileToRemove.name); // Call backend to delete
      }
      setUploadedFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
      if (currentRunId) {
        await loadTables(currentRunId); // Reload tables to reflect change
      }
    } catch (error) {
      console.error('Error removing file:', error);
      setError(`Failed to remove file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTableToggle = (tableName: string) => {
    setTables(prevTables =>
      prevTables.map(table =>
        table.name === tableName
          ? { ...table, selected: !table.selected }
          : table
      )
    );
  };

  const handleSelectAll = () => {
    setTables(prevTables =>
      prevTables.map(table => ({ ...table, selected: true }))
    );
  };

  const handleClearAll = () => {
    setTables(prevTables =>
      prevTables.map(table => ({ ...table, selected: false }))
    );
  };

  const handleAnalyze = async () => {
    if (!currentRunId) return;
    setIsAnalyzing(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Step 1: Generate schema analysis
      setSuccessMessage('Step 1/2: Analyzing data schemas... This may take 1-2 minutes.');
      console.log('Starting schema analysis...');
      await apiService.generateSchema(currentRunId);
      console.log('Schema analysis completed.');
      
      // Step 2: Generate descriptions
      setSuccessMessage('Step 2/2: Generating AI descriptions... This may take 2-3 minutes.');
      console.log('Starting description generation...');
      try {
        await apiService.generateDescriptions(currentRunId);
        console.log('Description generation completed.');
        setSuccessMessage('Analysis completed successfully! Navigating to Explorer...');
      } catch (e) {
        console.warn('Generate descriptions failed (continuing):', e);
        setSuccessMessage('Schema analysis completed. Descriptions will be generated on demand.');
      }
      
      // Small delay to show completion message
      setTimeout(() => {
        navigate(`/explorer/${currentRunId}`);
      }, 1000);
      
    } catch (error) {
      console.error('Error analyzing tables:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze tables. Please try again.';
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBackToDataSources = () => {
    navigate('/upload');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="flex">
        <Sidebar
          onNewRun={handleNewRun}
          onLoadRun={handleLoadRun}
          onDeleteRun={handleDeleteRun}
          runs={runs}
        />
        
        <main className="flex-1 p-8">
          {currentView === 'dataSources' ? (
            <DataSourcesSelection />
          ) : (
            <>
              {/* Back to Data Sources Button */}
              <div className="mb-6">
                <button
                  onClick={handleBackToDataSources}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Back to Data Sources</span>
                </button>
              </div>

              {error && (
                <div className="mt-8 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="mt-8 mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-800">{successMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                <UploadSection
                  onFilesUploaded={handleFilesUploaded}
                  isUploading={isUploading}
                  uploadedFiles={uploadedFiles}
                  onRemoveFile={handleRemoveFile}
                />
                
                <TableSelection
                  tables={tables}
                  onTableToggle={handleTableToggle}
                  onSelectAll={handleSelectAll}
                  onClearAll={handleClearAll}
                  onAnalyze={handleAnalyze}
                  isAnalyzing={isAnalyzing}
                />

                {/* Debug info */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-4 p-2 bg-gray-100 text-xs">
                    <div>Tables count: {tables.length}</div>
                    <div>Current Run ID: {currentRunId || 'None'}</div>
                    <div>Tables: {JSON.stringify(tables.map(t => ({ name: t.name, selected: t.selected })), null, 2)}</div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default UploadPage;