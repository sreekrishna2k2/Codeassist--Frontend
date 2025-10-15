import React, { useState } from 'react';

interface Table {
  name: string;
  selected: boolean;
}

interface TableSelectionProps {
  tables: Table[];
  onTableToggle: (tableName: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  hasExistingAnalysis?: boolean;
}

const TableSelection: React.FC<TableSelectionProps> = ({
  tables,
  onTableToggle,
  onSelectAll,
  onClearAll,
  onAnalyze,
  isAnalyzing,
  hasExistingAnalysis = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTables = tables.filter(table =>
    table.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCount = tables.filter(table => table.selected).length;

  return (
    <div className="bg-white p-8 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Available Tables</h2>
        <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <p className="text-gray-600 mb-6">
        {hasExistingAnalysis 
          ? "Tables with existing analysis data. Click 'Re-analyze' to update analysis or use the workflow navigation above to explore."
          : "Select the tables to analyze"
        }
      </p>

      {/* Search Bar */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search tables..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-4">
          <button
            onClick={onSelectAll}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Select all
          </button>
          <button
            onClick={onClearAll}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Clear
          </button>
        </div>
        <div className="text-sm text-gray-500">
          {selectedCount} of {tables.length} selected
        </div>
      </div>

      {/* Table List */}
      <div className="space-y-3 mb-8">
        {tables.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No tables uploaded yet</p>
            <p className="text-xs text-gray-400">Upload CSV files to see them here</p>
          </div>
        ) : filteredTables.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No tables match your search</p>
        ) : (
          filteredTables.map((table) => (
            <div
              key={table.name}
              className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
              onClick={() => onTableToggle(table.name)}
            >
              <input
                type="checkbox"
                checked={table.selected}
                onChange={() => onTableToggle(table.name)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-900 capitalize">
                {table.name.replace(/_/g, ' ')}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Analyze Button */}
      <div className="flex justify-end">
        <button
          onClick={onAnalyze}
          disabled={selectedCount === 0 || isAnalyzing}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            selectedCount === 0 || isAnalyzing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : hasExistingAnalysis
              ? 'bg-orange-600 hover:bg-orange-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isAnalyzing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Analyzing & Generating Descriptions...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>{hasExistingAnalysis ? 'Re-analyze Selected Tables' : 'Analyze Selected Tables'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default TableSelection;
