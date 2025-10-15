import React from 'react';

interface TableData {
  name: string;
  hasDescriptions: boolean;
}

interface TableSidebarProps {
  tables: TableData[];
  selectedTable: string | null;
  onTableSelect: (tableName: string) => void;
}

const TableSidebar: React.FC<TableSidebarProps> = ({
  tables,
  selectedTable,
  onTableSelect,
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <h3 className="text-xs font-medium text-gray-900 mb-2">Tables</h3>
      
      {tables.length === 0 ? (
        <p className="text-gray-500 text-xs">No tables available</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tables.map((table) => (
            <button
              key={table.name}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center space-x-1 ${
                selectedTable === table.name
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => onTableSelect(table.name)}
            >
              <span>{table.name.replace(/_/g, ' ')}</span>
              {table.hasDescriptions && (
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full" title="Analysis complete" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TableSidebar;
