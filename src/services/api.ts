const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  backoffMultiplier: 2,
};

// Helper function for retry logic
const retryRequest = async (requestFn: () => Promise<Response>, maxRetries: number = RETRY_CONFIG.maxRetries): Promise<Response> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await requestFn();
      return response;
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        const delay = RETRY_CONFIG.retryDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
        console.log(`Request failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
};

export interface DescriptionFile {
  filename: string;
  path: string;
  size: number;
}

export interface Run {
  run_id: string;
  created_at: string;
  status: string;
  files_uploaded: number;
  queries_count: number;
  executions_count: number;
}

export interface Table {
  name: string;
  hasDescriptions?: boolean;
  selected: boolean;
}

export interface ChatMessage {
  id: string;
  userQuery: string;
  sqlQuery: string;
  commentary: string;
  timestamp: string;
  executed?: boolean;
  resultCount?: number;
}

export interface QueryResult {
  data: any[];
  columns: string[];
}

export const apiService = {
  // Diagnostics
  envCheck: async () => {
    const response = await fetch(`${API_BASE_URL}/env-check`);
    if (!response.ok) {
      throw new Error('Failed to get backend env');
    }
    return response.json();
  },

  testEnvironment: async () => {
    const backend = await apiService.envCheck().catch((e) => ({ error: e.message }));
    return {
      frontend: {
        apiBaseUrl: API_BASE_URL,
        env: {
          REACT_APP_API_BASE_URL: process.env.REACT_APP_API_BASE_URL || null,
        },
      },
      backend,
    };
  },
  // Upload and setup
  uploadTables: async (files: File[], runId?: string) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    // Add run_id as a form field if provided
    if (runId) {
      formData.append('run_id', runId);
    }
    
    const response = await fetch(`${API_BASE_URL}/upload-tables`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload tables');
    }
    
    return response.json();
  },

  // Schema and descriptions
  generateSchema: async (runId: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes
    
    try {
      const response = await retryRequest(async () => {
        return await fetch(`${API_BASE_URL}/generate-schema/${runId}`, {
          method: 'POST',
          signal: controller.signal,
        });
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Failed to generate schema');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Schema generation timed out. Please try again.');
      }
      throw error;
    }
  },

  generateDescriptions: async (runId: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes
    
    try {
      const response = await fetch(`${API_BASE_URL}/generate-descriptions/${runId}`, {
        method: 'POST',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Failed to generate descriptions');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Description generation timed out. Please try again.');
      }
      throw error;
    }
  },

  getDescriptions: async (runId: string): Promise<DescriptionFile[]> => {
    const response = await fetch(`${API_BASE_URL}/get-descriptions/${runId}`);
    
    if (!response.ok) {
      throw new Error('Failed to get descriptions');
    }
    
    return response.json();
  },

  getTables: async (runId: string): Promise<Table[]> => {
    console.log('API: Getting tables for run:', runId);
    const response = await fetch(`${API_BASE_URL}/get-tables/${runId}`);
    
    if (!response.ok) {
      console.error('API: Failed to get tables, status:', response.status);
      throw new Error('Failed to get tables');
    }
    
    const tables = await response.json();
    console.log('API: Raw tables response:', tables);
    
    // Ensure selected property is always a boolean, defaulting to true
    const processedTables = tables.map((table: any) => ({
      ...table,
      selected: Boolean(table.selected !== undefined ? table.selected : true)
    }));
    
    console.log('API: Processed tables:', processedTables);
    return processedTables;
  },

  // Query generation and execution
  generateQuery: async (runId: string, userQuery: string, selectedTables: string[]) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes
    
    try {
      const response = await fetch(`${API_BASE_URL}/generate-query/${runId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: userQuery,
          context_tables: selectedTables
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Failed to generate query');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Query generation timed out. Please try again.');
      }
      throw error;
    }
  },

  saveQuery: async (runId: string, sqlQuery: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds
    
    try {
      const response = await retryRequest(async () => {
        return await fetch(`${API_BASE_URL}/save-query/${runId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sql_query: sqlQuery }),
          signal: controller.signal,
        });
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Failed to save query');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Save query timed out. Please try again.');
      }
      throw error;
    }
  },

  executeQuery: async (runId: string, queryId: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes
    
    try {
      const response = await fetch(`${API_BASE_URL}/execute-query/${runId}/${queryId}`, {
        method: 'POST',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Failed to execute query');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Query execution timed out. Please try again.');
      }
      throw error;
    }
  },

  getQueryResults: async (runId: string, resultFile: string): Promise<QueryResult> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds
    
    try {
      const response = await retryRequest(async () => {
        return await fetch(`${API_BASE_URL}/get-query-results/${runId}/${resultFile}`, {
          signal: controller.signal,
        });
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Failed to get query results');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Loading results timed out. Please try again.');
      }
      throw error;
    }
  },

  // Chat history
  getChatHistory: async (runId: string): Promise<ChatMessage[]> => {
    const response = await fetch(`${API_BASE_URL}/get-chat-history/${runId}`);
    
    if (!response.ok) {
      return [];
    }
    
    return response.json();
  },

  saveChatMessage: async (runId: string, message: ChatMessage) => {
    const response = await fetch(`${API_BASE_URL}/save-chat-message/${runId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save chat message');
    }
    
    return response.json();
  },

  deleteChatMessage: async (runId: string, messageId: string) => {
    const response = await fetch(`${API_BASE_URL}/delete-chat-message/${runId}?message_id=${encodeURIComponent(messageId)}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error('Failed to delete chat message');
    }
    return response.json();
  },

  // Export functionality
  exportResults: async (runId: string, data: any[]) => {
    const response = await fetch(`${API_BASE_URL}/export-results/${runId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to export results');
    }
    
    // Trigger download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_results_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Legacy endpoints for compatibility
  getQueries: async (runId: string) => {
    const response = await fetch(`${API_BASE_URL}/get-queries/${runId}`);
    
    if (!response.ok) {
      return [];
    }
    
    return response.json();
  },

  modifyQuery: async (runId: string, queryId: string, instructions: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes
    
    try {
      const response = await retryRequest(async () => {
        return await fetch(`${API_BASE_URL}/modify-query/${runId}/${queryId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ instructions }),
          signal: controller.signal,
        });
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Failed to modify query');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Query modification timed out. Please try again.');
      }
      throw error;
    }
  },

  downloadDescription: async (runId: string, filename: string) => {
    window.open(`${API_BASE_URL}/download-description/${runId}/${filename}`, '_blank');
  },

  downloadDescriptionAsText: async (runId: string, filename: string): Promise<string> => {
    const response = await fetch(`${API_BASE_URL}/download-description/${runId}/${filename}`);
    
    if (!response.ok) {
      throw new Error('Failed to download description file');
    }
    
    return response.text();
  },

  downloadQuery: async (runId: string, queryId: string) => {
    window.open(`${API_BASE_URL}/download-query/${runId}/${queryId}`, '_blank');
  },

  downloadResult: async (runId: string, filename: string) => {
    window.open(`${API_BASE_URL}/download-result/${runId}/${filename}`, '_blank');
  },

  getRunInfo: async (runId: string) => {
    const response = await fetch(`${API_BASE_URL}/get-run-info/${runId}`);
    
    if (!response.ok) {
      throw new Error('Failed to get run info');
    }
    
    return response.json();
  },

  getRuns: async (): Promise<Run[]> => {
    const response = await fetch(`${API_BASE_URL}/get-runs`);
    
    if (!response.ok) {
      return [];
    }
    
    return response.json();
  },

  loadRun: async (runId: string) => {
    const response = await fetch(`${API_BASE_URL}/load-run/${runId}`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to load run');
    }
    
    return response.json();
  },

  deleteRun: async (runId: string) => {
    const response = await fetch(`${API_BASE_URL}/delete-run/${runId}`, { method: 'DELETE' });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to delete run');
    }
    return response.json();
  },

  deleteFile: async (runId: string, filename: string) => {
    const response = await fetch(`${API_BASE_URL}/delete-file/${runId}/${filename}`, { method: 'DELETE' });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to delete file');
    }
    return response.json();
  },

  // Schema analysis and description management
  getSchemaAnalysis: async (runId: string) => {
    const response = await fetch(`${API_BASE_URL}/get-schema-analysis/${runId}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || `HTTP ${response.status}: Failed to get schema analysis`;
      throw new Error(errorMessage);
    }
    
    return response.json();
  },

  updateFieldDescription: async (runId: string, tableName: string, fieldName: string, description: string) => {
    const response = await fetch(`${API_BASE_URL}/update-field-description/${runId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        table_name: tableName,
        field_name: fieldName,
        description: description
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update field description');
    }
    
    return response.json();
  },

  // CSV preview
  getTablePreview: async (runId: string, tableName: string, limit: number = 50) => {
    const url = `${API_BASE_URL}/preview-table/${encodeURIComponent(runId)}/${encodeURIComponent(tableName)}?limit=${limit}`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.detail || `Failed to get preview for ${tableName}`;
      throw new Error(message);
    }
    return response.json();
  },
};
