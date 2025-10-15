import React, { useState, useEffect } from 'react';
import { apiService, DescriptionFile } from '../services/api';
import DescriptionEditor from './DescriptionEditor';

interface SchemaViewerProps {
  tableName: string;
  runId: string;
}

interface ColumnData {
  column_name: string;
  data_type: string;
  inferred_type: string;
  total_count: number;
  non_null_count: number;
  null_count: number;
  null_percentage: number;
  unique_count: number;
  unique_percentage: number;
  min_value?: any;
  max_value?: any;
  mean_value?: any;
  median_value?: any;
  std_value?: any;
  unique_values: string;
  histogram: string;
  has_histogram: boolean;
  description?: string;
}

const SchemaViewer: React.FC<SchemaViewerProps> = ({
  tableName,
  runId,
}) => {
  const [descriptionData, setDescriptionData] = useState<ColumnData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTableData();
  }, [tableName, runId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTableData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Try to load description data first (which includes schema data)
      const descriptions: DescriptionFile[] = await apiService.getDescriptions(runId);
      const descriptionFile = descriptions.find((desc: DescriptionFile) => 
        desc.filename.includes(tableName.replace('.csv', ''))
      );
      
      if (descriptionFile) {
        // Use the API service to download description file as text
        const csvText = await apiService.downloadDescriptionAsText(runId, descriptionFile.filename);
        const lines = csvText.split('\n');
        
        // Simple CSV parser that handles quoted values
        const parseCSVLine = (line: string): string[] => {
          const result = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };
        
        const headers = parseCSVLine(lines[0]);
        const data = lines.slice(1).filter(line => line.trim()).map(line => {
          const values = parseCSVLine(line);
          const row: any = {};
          headers.forEach((header, index) => {
            const value = values[index] || '';
            // Convert numeric fields to numbers
            if (['total_count', 'non_null_count', 'null_count', 'null_percentage', 'unique_count', 'unique_percentage', 'min_value', 'max_value', 'mean_value', 'median_value', 'std_value'].includes(header)) {
              row[header] = value === '' ? null : parseFloat(value);
            } else {
              row[header] = value;
            }
          });
          return row;
        });
        
        setDescriptionData(data);
      } else {
        // No description data available yet
        setDescriptionData([]);
      }
    } catch (err) {
      console.error('Error loading table data:', err);
      setError('Failed to load table data');
    } finally {
      setLoading(false);
    }
  };

  const renderHistogram = (histogramJson: string) => {
    if (!histogramJson) return null;
    
    try {
      const histogram = JSON.parse(histogramJson);
      if (!histogram.applicable) return null;
      
      return (
        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
          <div className="font-medium mb-1">Distribution:</div>
          {histogram.type === 'categorical' && (
            <div>
              {histogram.values?.slice(0, 5).map((value: string, index: number) => (
                <div key={index} className="flex justify-between">
                  <span>{value}</span>
                  <span>{histogram.counts?.[index]}</span>
                </div>
              ))}
              {histogram.values?.length > 5 && (
                <div className="text-gray-500">... and {histogram.values.length - 5} more</div>
              )}
            </div>
          )}
          {histogram.type === 'numeric' && (
            <div>
              <div>Bins: {histogram.bins?.length || 0}</div>
              <div>Range: {histogram.bin_edges?.[0]} - {histogram.bin_edges?.[histogram.bin_edges?.length - 1]}</div>
            </div>
          )}
        </div>
      );
    } catch {
      return null;
    }
  };

  const renderColumnData = (columns: ColumnData[]) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadTableData}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      );
    }

    if (columns.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">No data available for this table</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {columns.map((column, index) => (
          <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            {/* Column Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{column.column_name}</h3>
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    {column.inferred_type}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                    {column.data_type}
                  </span>
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="text-gray-500">Data Quality</div>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${
                    Number(column.null_percentage || 0) < 5 ? 'bg-green-500' : 
                    Number(column.null_percentage || 0) < 20 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-gray-700">
                    {Number(column.null_percentage || 0).toFixed(1)}% null
                  </span>
                </div>
              </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white p-3 rounded border">
                <div className="text-xs text-gray-500 font-medium">Total Records</div>
                <div className="text-lg font-semibold text-gray-900">
                  {Number(column.total_count || 0).toLocaleString()}
                </div>
              </div>
              
              <div className="bg-white p-3 rounded border">
                <div className="text-xs text-gray-500 font-medium">Unique Values</div>
                <div className="text-lg font-semibold text-gray-900">
                  {Number(column.unique_count || 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  ({Number(column.unique_percentage || 0).toFixed(1)}%)
                </div>
              </div>
              
              {column.min_value !== null && column.min_value !== undefined && (
                <div className="bg-white p-3 rounded border">
                  <div className="text-xs text-gray-500 font-medium">Min Value</div>
                  <div className="text-lg font-semibold text-gray-900">{column.min_value}</div>
                </div>
              )}
              
              {column.max_value !== null && column.max_value !== undefined && (
                <div className="bg-white p-3 rounded border">
                  <div className="text-xs text-gray-500 font-medium">Max Value</div>
                  <div className="text-lg font-semibold text-gray-900">{column.max_value}</div>
                </div>
              )}
              
              {column.mean_value !== null && column.mean_value !== undefined && (
                <div className="bg-white p-3 rounded border">
                  <div className="text-xs text-gray-500 font-medium">Average</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {Number(column.mean_value || 0).toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            {/* Sample Values */}
            {column.unique_values && (
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Sample Values</div>
                <div className="bg-white p-3 rounded border text-sm text-gray-600">
                  {column.unique_values}
                </div>
              </div>
            )}

            {/* Distribution */}
            {column.histogram && renderHistogram(column.histogram)}

            {/* AI Description */}
            {column.description && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">AI Description</span>
                </div>
                <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-gray-700">
                  {column.description}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {tableName.replace(/_/g, ' ').replace('.csv', '')}
            </h2>
            <p className="text-gray-600">
              Comprehensive data analysis with AI-powered field descriptions
            </p>
          </div>
          {descriptionData.length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Analysis Complete</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading table analysis...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-medium">Unable to load data</p>
              <p className="text-sm">{error}</p>
            </div>
            <button
              onClick={loadTableData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : descriptionData.length > 0 ? (
          <div>
            {/* Table Overview */}
            <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-lg font-medium text-blue-900 mb-2">Table Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-blue-600 font-medium">Total Columns</div>
                  <div className="text-blue-900">{descriptionData.length}</div>
                </div>
                <div>
                  <div className="text-blue-600 font-medium">Total Rows</div>
                  <div className="text-blue-900">{descriptionData[0]?.total_count?.toLocaleString() || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-blue-600 font-medium">Data Types</div>
                  <div className="text-blue-900">
                    {new Set(descriptionData.map(col => col.inferred_type)).size} unique
                  </div>
                </div>
                <div>
                  <div className="text-blue-600 font-medium">Status</div>
                  <div className="text-green-600 font-medium">✓ Analyzed</div>
                </div>
              </div>
            </div>

            {/* Column Analysis */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Column Analysis & Descriptions</h3>
              <p className="text-gray-600 mb-6">
                Each column below shows comprehensive statistics and AI-generated descriptions to help you understand your data structure.
              </p>
            </div>

            {renderColumnData(descriptionData)}
            
            {/* Description Editor */}
            <div className="mt-8">
              <DescriptionEditor
                tableName={tableName}
                runId={runId}
                columns={descriptionData}
                onUpdate={loadTableData}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium text-gray-500 mb-2">No Analysis Available</p>
              <p className="text-gray-400">Click "Generate AI Descriptions" to analyze this table</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchemaViewer;
