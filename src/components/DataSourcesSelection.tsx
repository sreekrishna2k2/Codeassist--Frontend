import React from 'react';
import { useNavigate } from 'react-router-dom';

interface DataSourceCardProps {
  icon: string;
  title: string;
  subtitle: string;
  isAvailable: boolean;
  onClick?: () => void;
}

const DataSourceCard: React.FC<DataSourceCardProps> = ({ 
  icon, 
  title, 
  subtitle, 
  isAvailable, 
  onClick 
}) => {
  return (
    <div
      className={`p-6 rounded-lg border-2 transition-all duration-200 ${
        isAvailable
          ? 'border-blue-200 bg-blue-50 hover:border-blue-300 hover:bg-blue-100 cursor-pointer hover:shadow-md'
          : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
      }`}
      onClick={isAvailable ? onClick : undefined}
    >
      <div className="text-center">
        <div className={`w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center ${
          isAvailable ? 'bg-blue-100' : 'bg-gray-200'
        }`}>
          <span className="text-2xl">{icon}</span>
        </div>
        <h3 className={`text-lg font-semibold mb-2 ${
          isAvailable ? 'text-gray-900' : 'text-gray-500'
        }`}>
          {title}
        </h3>
        <p className={`text-sm mb-3 ${
          isAvailable ? 'text-gray-600' : 'text-gray-400'
        }`}>
          {subtitle}
        </p>
        <div className={`text-xs font-medium px-3 py-1 rounded-full inline-block ${
          isAvailable 
            ? 'bg-blue-600 text-white' 
            : 'bg-orange-100 text-orange-600'
        }`}>
          {isAvailable ? 'Available' : 'Coming Soon'}
        </div>
      </div>
    </div>
  );
};

const DataSourcesSelection: React.FC = () => {
  const navigate = useNavigate();

  const dataSources = [
    {
      icon: '📁',
      title: 'File Upload',
      subtitle: 'Upload CSV files',
      isAvailable: true,
      onClick: () => navigate('/upload?source=files')
    },
    {
      icon: '🗄️',
      title: 'MySQL',
      subtitle: 'Database connection',
      isAvailable: false
    },
    {
      icon: '🗄️',
      title: 'Oracle',
      subtitle: 'Database connection',
      isAvailable: false
    },
    {
      icon: '🔗',
      title: 'REST API',
      subtitle: 'API data source',
      isAvailable: false
    },
    {
      icon: '🤖',
      title: 'RPA Agent',
      subtitle: 'Automation agent',
      isAvailable: false
    },
    {
      icon: '🗄️',
      title: 'PostgreSQL',
      subtitle: 'Database connection',
      isAvailable: false
    }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Data Sources</h1>
          </div>
        </div>
      </div>

      {/* Data Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dataSources.map((source, index) => (
          <DataSourceCard
            key={index}
            icon={source.icon}
            title={source.title}
            subtitle={source.subtitle}
            isAvailable={source.isAvailable}
            onClick={source.onClick}
          />
        ))}
      </div>

      {/* Footer Text */}
      <div className="mt-8 text-center">
        <p className="text-gray-500 text-sm">
          Select a data source to begin your analysis. More options will be available soon.
        </p>
      </div>
    </div>
  );
};

export default DataSourcesSelection;

