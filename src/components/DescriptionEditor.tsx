import React, { useState } from 'react';

interface ColumnData {
  column_name: string;
  description?: string;
}

interface DescriptionEditorProps {
  tableName: string;
  runId: string;
  columns: ColumnData[];
  onUpdate: () => void;
}

const DescriptionEditor: React.FC<DescriptionEditorProps> = ({
  tableName,
  runId,
  columns,
  onUpdate,
}) => {
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleEdit = (columnName: string, currentDescription: string) => {
    setEditingColumn(columnName);
    setEditValue(currentDescription || '');
  };

  const handleSave = async (columnName: string) => {
    setSaving(true);
    try {
      // Here you would call an API to update the description
      // For now, we'll simulate the save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // TODO: Implement actual API call to update description
      console.log(`Saving description for ${columnName}:`, editValue);
      
      setEditingColumn(null);
      setEditValue('');
      onUpdate(); // Refresh the data
    } catch (error) {
      console.error('Error saving description:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingColumn(null);
    setEditValue('');
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Descriptions</h3>
      <p className="text-sm text-gray-600 mb-6">
        Click on any description to edit it inline. Changes will be saved automatically.
      </p>
      
      <div className="space-y-4">
        {columns.map((column, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-2">{column.column_name}</h4>
                
                {editingColumn === column.column_name ? (
                  <div className="space-y-3">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Enter description for this column..."
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSave(column.column_name)}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={saving}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => handleEdit(column.column_name, column.description || '')}
                    className="cursor-pointer p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    {column.description ? (
                      <p className="text-gray-700">{column.description}</p>
                    ) : (
                      <p className="text-gray-400 italic">Click to add description...</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DescriptionEditor;
