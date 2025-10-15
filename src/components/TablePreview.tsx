import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';

interface TablePreviewProps {
  runId: string;
  tableName: string;
}

const TablePreview: React.FC<TablePreviewProps> = ({ runId, tableName }) => {
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [limit, setLimit] = useState(50);

  const loadPreview = async (limitValue: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiService.getTablePreview(runId, tableName, limitValue);
      setColumns(res.columns || []);
      setRows(res.rows || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load preview');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (runId && tableName) {
      loadPreview(limit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, tableName]);

  // Compact density to match Schema table
  const headerPadding = 'px-3 py-2';
  const cellPadding = 'px-3 py-2';
  const tableTextSize = 'text-[13px] md:text-sm';

  const Tooltip = ({ content, children }: { content: string; children: React.ReactNode }) => {
    const [isVisible, setIsVisible] = useState(false);
    
    return (
      <div 
        className="relative inline-block"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
        {isVisible && (
          <div className="absolute z-50 w-96 p-4 text-sm bg-white text-gray-900 rounded-lg shadow-xl border border-gray-200 whitespace-pre-line"
               style={{
                 top: '100%',
                 left: '50%',
                 transform: 'translateX(-50%)',
                 marginTop: '8px',
                 maxHeight: '70vh',
                 overflowY: 'auto',
                 minWidth: '320px',
                 maxWidth: '90vw'
               }}>
            <div className="font-semibold text-blue-600 mb-3 text-base">📊 Column Analysis</div>
            <div className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">{content}</div>
          </div>
        )}
      </div>
    );
  };

  const getColumnStats = (columnName: string) => {
    const columnData = rows.map(row => row[columnName]).filter(val => val !== null && val !== undefined && val !== '');
    const uniqueValues = new Set(columnData);
    const nullCount = rows.length - columnData.length;
    
    return {
      totalRows: rows.length,
      nonNullCount: columnData.length,
      nullCount,
      nullPercentage: ((nullCount / rows.length) * 100).toFixed(1),
      uniqueCount: uniqueValues.size,
      uniquePercentage: ((uniqueValues.size / columnData.length) * 100).toFixed(1),
      sampleValues: Array.from(uniqueValues).slice(0, 10).join(', ')
    };
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col h-full shadow">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <h3 className="text-base font-semibold text-gray-900 capitalize">{tableName.replace(/_/g, ' ')} - Preview</h3>
        <div className="flex items-center space-x-2">
          <label className="text-xs text-gray-600">Rows:</label>
          <select
            value={limit}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              setLimit(v);
              loadPreview(v);
            }}
            className="border border-gray-300 rounded px-2 py-1 text-xs"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 text-center flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading preview...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center text-red-600 flex-1 flex items-center justify-center">{error}</div>
      ) : (
        <div className="flex-1 overflow-auto" style={{ maxHeight: '100%' }}>
          <div className="overflow-x-auto">
            <table className={`min-w-full table-fixed divide-y divide-gray-200 ${tableTextSize}`}>
            <thead className="bg-gray-50 sticky top-0 z-30 shadow-sm">
              <tr>
                {columns.map((col) => {
                  const stats = getColumnStats(col);
                  return (
                    <th key={col} className={`${headerPadding} text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap`}>
                      <Tooltip content={`🔍 Column: ${col}\n\n📊 Data Overview:\n• Total Rows: ${stats.totalRows}\n• Non-null Values: ${stats.nonNullCount}\n• Null Values: ${stats.nullCount} (${stats.nullPercentage}%)\n• Unique Values: ${stats.uniqueCount} (${stats.uniquePercentage}%)\n• Duplicate Values: ${stats.totalRows - stats.uniqueCount}\n\n🔍 Sample Values:\n${stats.sampleValues || 'No data available'}`}>
                        <span className="cursor-help hover:text-blue-600 transition-colors">{col}</span>
                      </Tooltip>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100'}>
                  {columns.map((col) => {
                    const cellValue = row[col] === null || row[col] === undefined || row[col] === '' ? '-' : String(row[col]);
                    const stats = getColumnStats(col);
                    return (
                      <td key={col} className={`${cellPadding} text-gray-700 whitespace-nowrap`}>
                        <Tooltip content={`🔍 Cell Value: ${cellValue}\n\n📊 Column Context:\n• Column: ${col}\n• Total Rows: ${stats.totalRows}\n• Unique Values: ${stats.uniqueCount}\n• Null Percentage: ${stats.nullPercentage}%\n• Duplicate Count: ${stats.totalRows - stats.uniqueCount}`}>
                          <span className="cursor-help hover:text-blue-600 transition-colors">{cellValue}</span>
                        </Tooltip>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TablePreview;


