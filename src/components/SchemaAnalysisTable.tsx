import React, { useState, useMemo } from 'react';
import { apiService } from '../services/api';

interface FieldData {
  column_name: string;
  data_type: string;
  inferred_type: string;
  total_count: number;
  non_null_count: number;
  null_count: number;
  null_percentage: number;
  unique_count: number;
  unique_percentage: number;
  min_value?: number | string;
  max_value?: number | string;
  mean_value?: number;
  median_value?: number;
  std_value?: number;
  description: string;
  unique_values?: string;
  histogram?: string;
}

interface SchemaAnalysisTableProps {
  tableName: string;
  fields: FieldData[];
  runId: string;
  onDescriptionUpdate?: (fieldName: string, newDescription: string) => void;
  density?: 'compact' | 'comfortable';
}

const SchemaAnalysisTable: React.FC<SchemaAnalysisTableProps> = ({
  tableName,
  fields,
  runId,
  onDescriptionUpdate,
  density = 'compact'
}) => {
  const headerPadding = density === 'compact' ? 'px-3 py-2' : 'px-6 py-3';
  const cellPadding = density === 'compact' ? 'px-3 py-2' : 'px-6 py-4';
  const tableTextSize = density === 'compact' ? 'text-[13px] md:text-sm' : 'text-sm';

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<keyof FieldData>('column_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const totalPages = Math.ceil(fields.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  // Sorting
  const sortedFields = useMemo(() => {
    return [...fields].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });
  }, [fields, sortField, sortDirection]);

  const paginatedFields = sortedFields.slice(startIndex, endIndex);

  const handleSort = (field: keyof FieldData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleEditDescription = (fieldName: string, currentDescription: string) => {
    setEditingField(fieldName);
    setEditingDescription(currentDescription);
  };

  const handleSaveDescription = async (fieldName: string) => {
    try {
      await apiService.updateFieldDescription(runId, tableName, fieldName, editingDescription);
      setEditingField(null);
      setEditingDescription('');
      if (onDescriptionUpdate) {
        onDescriptionUpdate(fieldName, editingDescription);
      }
    } catch (error) {
      console.error('Error updating description:', error);
      alert('Failed to update description. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditingDescription('');
  };

  const formatValue = (value: any, type: string) => {
    if (value === null || value === undefined || value === '') return '-';
    
    if (type === 'percentage') {
      if (typeof value === 'number' && isNaN(value)) return '-';
      return `${value.toFixed(1)}%`;
    }
    
    if (type === 'number') {
      if (typeof value === 'number' && isNaN(value)) return '-';
      return typeof value === 'number' ? value.toLocaleString() : value;
    }
    
    return String(value);
  };

  const getSortIcon = (field: keyof FieldData) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const formatHistogram = (histogram: string | undefined) => {
    if (!histogram) return 'No distribution data available';
    
    try {
      // Parse histogram data if it's JSON
      const parsed = typeof histogram === 'string' ? JSON.parse(histogram) : histogram;
      
      // Handle different histogram formats
      if (parsed && typeof parsed === 'object') {
        // Format with bins and counts
        if (parsed.bins && parsed.counts && Array.isArray(parsed.bins) && Array.isArray(parsed.counts)) {
          const maxCount = Math.max(...parsed.counts);
          return parsed.bins.map((bin: string, index: number) => {
            const count = parsed.counts[index] || 0;
            const bar = '█'.repeat(Math.min(Math.floor((count / maxCount) * 15), 15));
            const percentage = maxCount > 0 ? ((count / maxCount) * 100).toFixed(1) : '0.0';
            return `${bin}: ${count} (${percentage}%) ${bar}`;
          }).join('\n');
        }
        
        // Handle array format
        if (Array.isArray(parsed)) {
          const maxCount = Math.max(...parsed.map((item: any) => item.count || item.frequency || 0));
          return parsed.map((item: any, index: number) => {
            const bin = item.bin || item.range || `Bin ${index + 1}`;
            const count = item.count || item.frequency || 0;
            const bar = '█'.repeat(Math.min(Math.floor((count / maxCount) * 15), 15));
            const percentage = maxCount > 0 ? ((count / maxCount) * 100).toFixed(1) : '0.0';
            return `${bin}: ${count} (${percentage}%) ${bar}`;
          }).join('\n');
        }
      }
      
      return histogram;
    } catch {
      return histogram;
    }
  };

  const [selectedField, setSelectedField] = useState<FieldData | null>(null);
  const [showDistribution, setShowDistribution] = useState(false);

  const DistributionModal = ({ field, isOpen, onClose }: { field: FieldData; isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Field Distribution: {field.column_name}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded">
                <h4 className="font-medium text-gray-900 mb-2">Data Type</h4>
                <p className="text-sm text-gray-600">{field.inferred_type}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <h4 className="font-medium text-gray-900 mb-2">Total Records</h4>
                <p className="text-sm text-gray-600">{(field.total_count || 0).toLocaleString()}</p>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded">
                <h4 className="font-medium text-blue-900 mb-2">Valid Records</h4>
                <p className="text-sm text-blue-700">{((field.total_count || 0) - (field.null_count || 0)).toLocaleString()}</p>
                <p className="text-xs text-blue-600">({formatValue(100 - (field.null_percentage || 0), 'percentage')} valid)</p>
              </div>
              <div className="bg-red-50 p-3 rounded">
                <h4 className="font-medium text-red-900 mb-2">Missing Records</h4>
                <p className="text-sm text-red-700">{(field.null_count || 0).toLocaleString()}</p>
                <p className="text-xs text-red-600">({formatValue(field.null_percentage, 'percentage')} missing)</p>
              </div>
            </div>

            {/* Unique Values */}
            <div className="bg-green-50 p-3 rounded">
              <h4 className="font-medium text-green-900 mb-2">Unique Values</h4>
              <p className="text-sm text-green-700">{(field.unique_count || 0).toLocaleString()}</p>
              <p className="text-xs text-green-600">({formatValue(field.unique_percentage, 'percentage')} unique)</p>
            </div>

            {/* Numeric Statistics */}
            {(field.min_value !== undefined || field.max_value !== undefined || field.mean_value !== undefined) && (
              <div className="bg-purple-50 p-3 rounded">
                <h4 className="font-medium text-purple-900 mb-2">Numeric Statistics</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Min: {formatValue(field.min_value, 'number')}</div>
                  <div>Max: {formatValue(field.max_value, 'number')}</div>
                  <div>Mean: {formatValue(field.mean_value, 'number')}</div>
                  <div>Median: {formatValue(field.median_value, 'number')}</div>
                </div>
              </div>
            )}

            {/* Distribution Chart */}
            {field.histogram && (
              <div className="bg-gray-50 p-3 rounded">
                <h4 className="font-medium text-gray-900 mb-2">Value Distribution</h4>
                <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {formatHistogram(field.histogram)}
                </div>
              </div>
            )}

            {/* Description */}
            {field.description && (
              <div className="bg-yellow-50 p-3 rounded">
                <h4 className="font-medium text-yellow-900 mb-2">Description</h4>
                <p className="text-sm text-yellow-700">{field.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col h-full shadow">
      <div className={`${density === 'compact' ? 'px-4 py-3' : 'px-6 py-4'} border-b border-gray-200 flex-shrink-0`}>
        <h3 className={`font-semibold text-gray-900 capitalize ${density === 'compact' ? 'text-base' : 'text-lg'}`}>
          {tableName.replace(/_/g, ' ')} - Schema Analysis
        </h3>
        <p className={`${density === 'compact' ? 'text-xs' : 'text-sm'} text-gray-600 mt-1`}>
          {fields.length} fields • Page {currentPage} of {totalPages}
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className={`min-w-full table-fixed divide-y divide-gray-200 ${tableTextSize}`}>
          <thead className="bg-gray-50 sticky top-0 z-30 shadow-sm">
            <tr>
              <th 
                className={`${headerPadding} text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap`}
                onClick={() => handleSort('column_name')}
              >
                Field Name {getSortIcon('column_name')}
              </th>
              <th 
                className={`${headerPadding} text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap`}
                onClick={() => handleSort('inferred_type')}
              >
                Data Type {getSortIcon('inferred_type')}
              </th>
              <th 
                className={`${headerPadding} text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap`}
                onClick={() => handleSort('null_percentage')}
              >
                Null % {getSortIcon('null_percentage')}
              </th>
              <th 
                className={`${headerPadding} text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap`}
                onClick={() => handleSort('unique_percentage')}
              >
                Unique % {getSortIcon('unique_percentage')}
              </th>
              <th 
                className={`${headerPadding} text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap`}
                onClick={() => handleSort('min_value')}
              >
                Min Value {getSortIcon('min_value')}
              </th>
              <th 
                className={`${headerPadding} text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap`}
                onClick={() => handleSort('max_value')}
              >
                Max Value {getSortIcon('max_value')}
              </th>
              <th className={`${headerPadding} text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap`}>
                Description
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedFields.map((field, index) => (
              <tr key={field.column_name} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className={`${cellPadding} whitespace-nowrap font-medium text-gray-900`}>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-900">{field.column_name}</span>
                    <button
                      onClick={() => {
                        setSelectedField(field);
                        setShowDistribution(true);
                      }}
                      className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                      title="View distribution"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </button>
                  </div>
                </td>
                <td className={`${cellPadding} whitespace-nowrap text-gray-500`}>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-800">
                    {field.inferred_type}
                  </span>
                </td>
                <td className={`${cellPadding} whitespace-nowrap text-gray-500`}>
                  {formatValue(field.null_percentage, 'percentage')}
                </td>
                <td className={`${cellPadding} whitespace-nowrap text-gray-500`}>
                  {formatValue(field.unique_percentage, 'percentage')}
                </td>
                <td className={`${cellPadding} whitespace-nowrap text-gray-500`}>
                  {formatValue(field.min_value, 'number')}
                </td>
                <td className={`${cellPadding} whitespace-nowrap text-gray-500`}>
                  {formatValue(field.max_value, 'number')}
                </td>
                <td className={`${cellPadding} text-gray-500`}>
                  {editingField === field.column_name ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={editingDescription}
                        onChange={(e) => setEditingDescription(e.target.value)}
                        onBlur={() => handleSaveDescription(field.column_name)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveDescription(field.column_name);
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-[13px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                      />
                      <button onClick={() => handleSaveDescription(field.column_name)} className="text-green-600 hover:text-green-800 text-xs">✓</button>
                      <button onClick={handleCancelEdit} className="text-red-600 hover:text-red-800 text-xs">✕</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group">
                      <span className="flex-1 truncate">
                        {field.description || 'No description available'}
                      </span>
                      <button
                        onClick={() => handleEditDescription(field.column_name, field.description || '')}
                        className="ml-2 opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-800 text-xs"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
        {/* Sticky Pagination */}
        {totalPages > 1 && (
          <div className={`sticky bottom-0 ${density === 'compact' ? 'px-4 py-2' : 'px-6 py-3'} bg-white border-t border-gray-200 flex items-center justify-between rounded-b-lg shadow` }>
            <div className="flex items-center">
              <span className={`${density === 'compact' ? 'text-xs' : 'text-sm'} text-gray-700`}>
                Showing {startIndex + 1} to {Math.min(endIndex, fields.length)} of {fields.length} fields
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 ${density === 'compact' ? 'text-xs' : 'text-sm'} border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50`}
              >
                Previous
              </button>
              <span className={`${density === 'compact' ? 'text-xs' : 'text-sm'} text-gray-700`}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 ${density === 'compact' ? 'text-xs' : 'text-sm'} border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Distribution Modal */}
      {selectedField && (
        <DistributionModal
          field={selectedField}
          isOpen={showDistribution}
          onClose={() => {
            setShowDistribution(false);
            setSelectedField(null);
          }}
        />
      )}
    </div>
  );
};

export default SchemaAnalysisTable;
