import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import TableSidebar from '../components/TableSidebar';
import SchemaAnalysisTable from '../components/SchemaAnalysisTable';
import TablePreview from '../components/TablePreview';
import { apiService } from '../services/api';

interface TableData {
  name: string;
  descriptionData?: any[];
  hasDescriptions: boolean;
}

interface SchemaAnalysisData {
  run_id: string;
  tables: {
    [tableName: string]: any[];
  };
}

const ExplorerPage: React.FC = () => {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [tables, setTables] = useState<TableData[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [schemaAnalysisData, setSchemaAnalysisData] = useState<SchemaAnalysisData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [descriptionsGenerated, setDescriptionsGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'schema' | 'preview'>('schema');

  useEffect(() => {
    if (runId) {
      loadAllRunData(runId);
    }
  }, [runId]);

  const loadAllRunData = async (runId: string) => {
    try {
      // Load all data in parallel for better performance
      await Promise.all([
        loadTables(runId),
        loadSchemaAnalysisData(runId)
      ]);
    } catch (error) {
      console.error('Error loading run data:', error);
    }
  };

  const loadTables = async (runId: string) => {
    try {
      setError(null);
      // Get the list of tables from the run
      const tablesData = await apiService.getTables(runId);
      const tableList: TableData[] = tablesData.map(table => ({
        name: table.name,
        hasDescriptions: table.hasDescriptions || false
      }));
      
      setTables(tableList);
      if (tableList.length > 0) {
        setSelectedTable(tableList[0].name);
      }
      
      // Check if descriptions are already generated
      const hasAllDescriptions = tableList.every(table => table.hasDescriptions);
      setDescriptionsGenerated(hasAllDescriptions);
    } catch (error) {
      console.error('Error loading tables:', error);
      setError('Failed to load tables. Please try again.');
    }
  };

  const loadSchemaAnalysisData = async (runId: string) => {
    try {
      setIsLoadingData(true);
      setError(null);
      console.log('Loading schema analysis data for run:', runId);
      const data = await apiService.getSchemaAnalysis(runId);
      console.log('Schema analysis data loaded:', data);
      setSchemaAnalysisData(data);
    } catch (error) {
      console.error('Error loading schema analysis data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load schema analysis data. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
  };

  const handleDescriptionUpdate = (fieldName: string, newDescription: string) => {
    // Update the local state to reflect the change immediately
    if (schemaAnalysisData && selectedTable) {
      const updatedData = { ...schemaAnalysisData };
      const tableFields = updatedData.tables[selectedTable];
      if (tableFields) {
        const fieldIndex = tableFields.findIndex((field: any) => field.column_name === fieldName);
        if (fieldIndex !== -1) {
          tableFields[fieldIndex].description = newDescription;
          setSchemaAnalysisData(updatedData);
        }
      }
    }
  };

  const selectedTableData = tables.find(table => table.name === selectedTable);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentStep={2} />
      
      <div className="flex">
        <main className="flex-1 p-6 overflow-hidden" style={{ height: 'calc(100vh - 72px)' }}>
          <div className="h-full flex flex-col">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
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
            

            <div className="flex flex-col gap-3 flex-1 min-h-0 mt-2">
              {/* Table Selection - Compact at very top */}
              <div className="flex-shrink-0">
                <TableSidebar
                  tables={tables}
                  selectedTable={selectedTable}
                  onTableSelect={handleTableSelect}
                />
              </div>


              {/* Main Content - Takes remaining space */}
              <div className="flex-1 min-h-0 flex flex-col">
                {/* Tabs */}
                <div className="mb-3 border-b border-gray-200 flex-shrink-0">
                  <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button
                      className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'schema' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                      onClick={() => setActiveTab('schema')}
                    >
                      Schema
                    </button>
                    <button
                      className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'preview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                      onClick={() => setActiveTab('preview')}
                    >
                      Preview
                    </button>
                  </nav>
                </div>
                
                {/* Content Area - Full height available */}
                <div className="flex-1 min-h-0">
                {(() => {
                  if (isLoadingData) {
                    return (
                      <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading schema analysis data...</p>
                      </div>
                    );
                  }
                  if (error) {
                    return (
                      <div className="bg-white p-8 rounded-lg border border-red-200 text-center">
                        <div className="text-red-600 mb-4">
                          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <button onClick={() => loadSchemaAnalysisData(runId!)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Retry</button>
                      </div>
                    );
                  }
                  if (!selectedTable) {
                    return (
                      <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
                        <p className="text-gray-500">Select a table to view its analysis and descriptions</p>
                      </div>
                    );
                  }
                  if (activeTab === 'schema') {
                    if (schemaAnalysisData && schemaAnalysisData.tables[selectedTable]) {
                      return (
                        <SchemaAnalysisTable
                          tableName={selectedTable}
                          fields={schemaAnalysisData.tables[selectedTable]}
                          runId={runId!}
                          onDescriptionUpdate={handleDescriptionUpdate}
                          density="compact"
                        />
                      );
                    }
                    return (
                      <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
                        <p className="text-gray-500">No schema analysis found for this table.</p>
                      </div>
                    );
                  }
                  return <TablePreview runId={runId!} tableName={selectedTable} />;
                })()}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ExplorerPage;
