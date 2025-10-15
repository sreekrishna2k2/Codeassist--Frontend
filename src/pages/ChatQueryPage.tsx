import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { apiService } from '../services/api';

interface ChatMessage {
  id: string;
  userQuery: string;
  sqlQuery: string;
  commentary: string;
  timestamp: string;
  executed?: boolean;
  resultCount?: number;
}

interface Table {
  name: string;
  selected: boolean;
}

const ChatQueryPage: React.FC = () => {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [generatedSql, setGeneratedSql] = useState('');
  const [isGeneratingSql, setIsGeneratingSql] = useState(false);
  const [isExecutingQuery, setIsExecutingQuery] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [resultColumns, setResultColumns] = useState<string[]>([]);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [commentary, setCommentary] = useState('');
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [queries, setQueries] = useState<{ query_id: string; user_query: string }[]>([]);
  const [lastSavedQueryId, setLastSavedQueryId] = useState<string | null>(null);
  const [refineInstruction, setRefineInstruction] = useState('');
  const [refineBaseQueryId, setRefineBaseQueryId] = useState<string | null>(null);
  const [resultsPage, setResultsPage] = useState(1);
  const [resultsPageSize] = useState(50);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editingHistoryText, setEditingHistoryText] = useState('');

  // Enhanced SQL formatter to improve readability and ensure only SQL is shown
  const prettySql = (sql: string) => {
    if (!sql) return '';
    
    // Clean up the SQL - remove any JSON artifacts or extra text
    let cleanSql = sql.trim();
    
    // Remove any JSON wrapper if present
    if (cleanSql.startsWith('{') && cleanSql.includes('"sql_query"')) {
      try {
        const parsed = JSON.parse(cleanSql);
        cleanSql = parsed.sql_query || cleanSql;
      } catch (e) {
        // If JSON parsing fails, try to extract SQL from the string
        const sqlMatch = cleanSql.match(/"sql_query"\s*:\s*"([^"]*)"/);
        if (sqlMatch) {
          cleanSql = sqlMatch[1];
        }
      }
    }
    
    // Remove any remaining JSON artifacts
    cleanSql = cleanSql.replace(/^\{?\s*"sql_query"\s*:\s*"/, '').replace(/"\s*\}?$/, '');
    
    // If SQL is already well-formatted (has proper line breaks), return as-is
    if (cleanSql.includes('\n') && cleanSql.split('\n').length > 3) {
      return cleanSql;
    }
    
    // Clean up whitespace and format
    let s = cleanSql
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .trim();
    
    // SQL keywords for formatting
    const keywords = [
      'SELECT','FROM','WHERE','INNER JOIN','LEFT JOIN','RIGHT JOIN','FULL JOIN','GROUP BY','ORDER BY','HAVING','LIMIT','OFFSET','UNION','UNION ALL','ON','AND','OR','CASE','WHEN','THEN','ELSE','END','AS'
    ];
    
    // Add line breaks before keywords
    keywords.forEach(k => {
      const re = new RegExp(`\\b${k}\\b`, 'gi');
      s = s.replace(re, `\n${k}`);
    });
    
    // Indent comma-separated columns after SELECT / GROUP BY / ORDER BY
    s = s.replace(/\n(SELECT|GROUP BY|ORDER BY)\s+([\s\S]*?)(?=\n[A-Z]|$)/g, (_m: string, head: string, body: string) => {
      const parts = body.split(',').map((p: string) => p.trim()).filter(Boolean);
      return `\n${head}\n  ${parts.join(',\n  ')}`;
    });
    
    // Uppercase keywords
    s = s.replace(/\b(select|from|where|inner join|left join|right join|full join|group by|order by|having|limit|offset|union all|union|on|and|or|case|when|then|else|end|as)\b/gi,
      (m) => m.toUpperCase());
    
    return s.trim();
  };

  const prettyCommentary = (text: string) => {
    if (!text) return '';
    try {
      // Try to parse JSON to avoid showing braces
      const trimmed = text.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const obj = JSON.parse(trimmed);
        if (obj.commentary) return obj.commentary as string;
      }
    } catch(_) {}
    return text.replace(/\\n/g,'\n').trim();
  };

  // Robustly extract SQL and commentary even when the LLM returns a mixed blob
  // Cases handled:
  // 1) Pure SQL
  // 2) JSON: { "sql_query": "...", "commentary": "..." }
  // 3) SQL followed by ,\n"commentary": "..."\n}
  const extractSqlAndCommentary = (sqlText: string, commentaryText?: string) => {
    let sqlOut = sqlText || '';
    let commOut = commentaryText || '';

    try {
      const blob = (sqlText || '').trim();
      
      // Handle case where sqlText contains JSON with both SQL and commentary
      if (blob.startsWith('{') && blob.includes('"sql_query"')) {
        const parsed = JSON.parse(blob);
        sqlOut = parsed.sql_query || sqlText;
        commOut = parsed.commentary || commentaryText || '';
      }
      // Handle case where commentary is in the SQL text
      else if (blob.includes('"commentary":')) {
        const sqlMatch = blob.match(/^([^{]*?)(?:\s*,\s*"commentary":\s*"([^"]*)"\s*})?$/);
        if (sqlMatch) {
          sqlOut = sqlMatch[1].trim();
          commOut = sqlMatch[2] || commentaryText || '';
        }
      }
      // Handle case where we have separate commentary text
      else if (commentaryText) {
        commOut = commentaryText;
      }
    } catch (e) {
      // If JSON parsing fails, use the original values
      sqlOut = sqlText || '';
      commOut = commentaryText || '';
    }

    return { sql: sqlOut, comm: commOut };
  };

  useEffect(() => {
    if (runId) {
      loadAllRunData(runId);
    }
  }, [runId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAllRunData = async (runId: string) => {
    try {
      // Load all data in parallel for better performance
      await Promise.all([
        loadTables(runId),
        loadChatHistory(runId),
        loadQueries(runId)
      ]);
      
      // If we have chat history, restore the latest query context
      if (chatHistory.length > 0) {
        const latestMessage = chatHistory[0];
        if (latestMessage.sqlQuery) {
          setGeneratedSql(prettySql(latestMessage.sqlQuery));
        }
        if (latestMessage.commentary) {
          setCommentary(prettyCommentary(latestMessage.commentary));
        }
      }
    } catch (error) {
      console.error('Error loading run data:', error);
    }
  };

  const loadTables = async (runId: string) => {
    try {
      const tablesData = await apiService.getTables(runId);
      const tableList: Table[] = tablesData.map(table => ({
        name: table.name,
        selected: true // Default to all selected
      }));
      
      setTables(tableList);
      setSelectedTables(tablesData.map(table => table.name));
    } catch (error) {
      console.error('Error loading tables:', error);
    }
  };

  const loadChatHistory = async (runId: string) => {
    try {
      const history = await apiService.getChatHistory(runId);
      setChatHistory(history);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const loadQueries = async (runId: string) => {
    try {
      const list = await apiService.getQueries(runId);
      setQueries(list);
      if (list.length > 0) setRefineBaseQueryId(list[list.length - 1].query_id);
    } catch (e) {
      console.error('Error loading queries:', e);
    }
  };

  const handleTableToggle = (tableName: string) => {
    setSelectedTables(prev => {
      if (prev.includes(tableName)) {
        return prev.filter(name => name !== tableName);
      } else {
        return [...prev, tableName];
      }
    });
  };

  const handleGenerateSql = async () => {
    if (!userQuery.trim() || !runId) return;
    
    setIsGeneratingSql(true);
    try {
      console.log('Generating SQL query...');
      const response = await apiService.generateQuery(runId, userQuery, selectedTables);
      console.log('SQL generation completed');
      
      const parsed = extractSqlAndCommentary(response.sql_query, response.commentary);
      setGeneratedSql(prettySql(parsed.sql));
      setCommentary(prettyCommentary(parsed.comm));
      
      // Add to chat history
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        userQuery,
        sqlQuery: response.sql_query,
        commentary: response.commentary,
        timestamp: new Date().toISOString(),
        executed: false
      };
      
      setChatHistory(prev => [newMessage, ...prev]);
      
      // Save to backend (chat only)
      await apiService.saveChatMessage(runId, newMessage);

      // Do NOT auto-save as a query here to avoid confusion; queries are saved on Run
      
      // Clear input
      setUserQuery('');
    } catch (error) {
      console.error('Error generating SQL:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error generating SQL query. Please try again.';
      alert(errorMessage);
    } finally {
      setIsGeneratingSql(false);
    }
  };

  const handleRefine = async () => {
    if (!runId || !refineInstruction.trim()) return;
    const baseId = refineBaseQueryId || lastSavedQueryId;
    if (!baseId) {
      alert('No base query to refine. Generate or select a query first.');
      return;
    }
    try {
      const result = await apiService.modifyQuery(runId, baseId, refineInstruction);
      const parsed = extractSqlAndCommentary(result.modified_sql_query || generatedSql, result.commentary);
      setGeneratedSql(prettySql(parsed.sql));
      setCommentary(prettyCommentary(parsed.comm));
      // Add a lightweight history entry showing refinement action
      const refineMsg: ChatMessage = {
        id: Date.now().toString(),
        userQuery: `Refined ${baseId}: ${refineInstruction}`,
        sqlQuery: parsed.sql,
        commentary: parsed.comm || 'Refinement preview (not saved as query).',
        timestamp: new Date().toISOString(),
        executed: false
      };
      setChatHistory(prev => [refineMsg, ...prev]);
      await apiService.saveChatMessage(runId!, refineMsg);
      await loadQueries(runId!);
      setRefineInstruction('');
    } catch (e) {
      console.error('Error refining query:', e);
      alert('Refine failed.');
    }
  };

  const handleExecuteQuery = async () => {
    if (!generatedSql.trim() || !runId) return;
    
    setIsExecutingQuery(true);
    try {
      // First save the query (reflecting inline edits)
      const saveResponse = await apiService.saveQuery(runId, generatedSql);
      setLastSavedQueryId(saveResponse.query_id);
      setRefineBaseQueryId(saveResponse.query_id);
      await loadQueries(runId);
      
      // Then execute it
      const executeResponse = await apiService.executeQuery(runId, saveResponse.query_id);
      
      // Load results
      const results = await apiService.getQueryResults(runId, executeResponse.result_file);
      setQueryResults(results.data);
      setResultColumns(results.columns);
      setResultsPage(1);
      
      // Update the latest chat message
      setChatHistory(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[0] = {
            ...updated[0],
            executed: true,
            resultCount: results.data.length
          };
        }
        return updated;
      });
      
    } catch (error) {
      console.error('Error executing query:', error);
      alert('Error executing query. Please check your SQL and try again.');
    } finally {
      setIsExecutingQuery(false);
    }
  };

  const handleExportResults = async () => {
    if (!queryResults.length || !runId) return;
    
    try {
      await apiService.exportResults(runId, queryResults);
    } catch (error) {
      console.error('Error exporting results:', error);
      alert('Error exporting results. Please try again.');
    }
  };

  // Save current SQL as a saved query without executing
  const handleSaveOnly = async () => {
    if (!generatedSql.trim() || !runId) return;
    try {
      const saveResp = await apiService.saveQuery(runId, generatedSql);
      setLastSavedQueryId(saveResp.query_id);
      setRefineBaseQueryId(saveResp.query_id);
      await loadQueries(runId);
      // Optionally, reflect in history as a saved action (no execution)
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        userQuery: `Saved as ${saveResp.query_id}`,
        sqlQuery: generatedSql,
        commentary: 'Saved query (not executed).',
        timestamp: new Date().toISOString(),
        executed: false
      };
      await apiService.saveChatMessage(runId, newMessage);
      setChatHistory(prev => [newMessage, ...prev]);
      alert(`Saved as ${saveResp.query_id}`);
    } catch (e) {
      console.error('Error saving query:', e);
      alert('Failed to save query.');
    }
  };

  const handleHistorySaveAsQuery = async (message: ChatMessage) => {
    if (!runId || !message.sqlQuery?.trim()) return;
    try {
      const saveResp = await apiService.saveQuery(runId, message.sqlQuery);
      setLastSavedQueryId(saveResp.query_id);
      setRefineBaseQueryId(saveResp.query_id);
      await loadQueries(runId);
      alert(`Saved ${saveResp.query_id} from history item.`);
    } catch (e) {
      console.error(e);
      alert('Failed to save query from history.');
    }
  };

  const handleHistoryRun = async (message: ChatMessage) => {
    if (!runId || !message.sqlQuery?.trim()) return;
    try {
      const saveResponse = await apiService.saveQuery(runId, message.sqlQuery);
      setLastSavedQueryId(saveResponse.query_id);
      setRefineBaseQueryId(saveResponse.query_id);
      await loadQueries(runId);
      const exec = await apiService.executeQuery(runId, saveResponse.query_id);
      const results = await apiService.getQueryResults(runId, exec.result_file);
      setGeneratedSql(prettySql(message.sqlQuery));
      setCommentary(prettyCommentary(message.commentary || ''));
      setQueryResults(results.data);
      setResultColumns(results.columns);
      setResultsPage(1);
    } catch (e) {
      console.error(e);
      alert('Failed to run query from history.');
    }
  };

  const handleStartEditHistory = (message: ChatMessage) => {
    setEditingHistoryId(message.id);
    setEditingHistoryText(message.userQuery || '');
  };

  const handleSaveEditHistory = async (message: ChatMessage) => {
    if (!runId) return;
    try {
      const updated: ChatMessage = {
        ...message,
        id: Date.now().toString(),
        userQuery: editingHistoryText + ' (edited)',
        timestamp: new Date().toISOString(),
      };
      await apiService.saveChatMessage(runId, updated);
      setChatHistory(prev => [updated, ...prev]);
      setEditingHistoryId(null);
      setEditingHistoryText('');
    } catch (e) {
      console.error(e);
      alert('Failed to save history edit.');
    }
  };

  const handleCancelEditHistory = () => {
    setEditingHistoryId(null);
    setEditingHistoryText('');
  };

  const handleDeleteHistory = async (message: ChatMessage) => {
    if (!runId) return;
    const confirmed = window.confirm('Delete this history item?');
    if (!confirmed) return;
    try {
      await apiService.deleteChatMessage(runId, message.id);
      setChatHistory(prev => prev.filter(m => m.id !== message.id));
    } catch (e) {
      console.error(e);
      alert('Failed to delete history.');
    }
  };

  const totalPages = Math.max(1, Math.ceil(queryResults.length / resultsPageSize));
  const pageStart = (resultsPage - 1) * resultsPageSize;
  const pageRows = queryResults.slice(pageStart, pageStart + resultsPageSize);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentStep={3} />
      
      <div className="flex">
        <main className="flex-1 p-6">
              <div>
            {/* Context Tables - Compact at top */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Context Tables</h3>
              <div className="flex flex-wrap gap-2">
                {tables.map(table => (
                  <button
                    key={table.name}
                    onClick={() => handleTableToggle(table.name)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedTables.includes(table.name)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {table.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Panel - NL input, refine, SQL, commentary */}
              <div className="space-y-3">
                {/* Chat History */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="p-3 border-b border-gray-200">
                    <button
                      onClick={() => setShowChatHistory(!showChatHistory)}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <h3 className="text-lg font-medium text-gray-900">History</h3>
                      <svg
                        className={`w-5 h-5 transform transition-transform ${
                          showChatHistory ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  
                  {showChatHistory && (
                    <div className="p-3 max-h-48 overflow-y-auto">
                      {chatHistory.length === 0 ? (
                        <p className="text-gray-500 text-sm">No prompts yet</p>
                      ) : (
                        <div className="space-y-3">
                          {chatHistory.map((message) => (
                            <div
                              key={message.id}
                              className="border-l-2 border-blue-200 pl-3 hover:bg-blue-50 rounded cursor-pointer"
                              onClick={() => {
                                setUserQuery(message.userQuery || '');
                                if (message.sqlQuery) setGeneratedSql(message.sqlQuery);
                                if (message.commentary) setCommentary(message.commentary);
                              }}
                              title="Click to restore this prompt and SQL"
                            >
                              <div className="text-sm text-gray-600 mb-1">
                                {new Date(message.timestamp).toLocaleString()}
                                {message.executed && (
                                  <span className="ml-2 text-green-600">✓ Executed ({message.resultCount} rows)</span>
                                )}
                              </div>
                              <div className="flex items-start justify-between gap-2">
                                {editingHistoryId === message.id ? (
                                  <input
                                    value={editingHistoryText}
                                    onChange={(e) => setEditingHistoryText(e.target.value)}
                                    className="flex-1 text-sm text-gray-800 border border-gray-300 rounded px-2 py-1"
                                  />
                                ) : (
                                  <div className="text-sm text-gray-800 mb-1 flex-1">{message.userQuery}</div>
                                )}
                                <div className="flex items-center gap-2">
                                  {editingHistoryId === message.id ? (
                                    <>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleSaveEditHistory(message); }}
                                        className="text-green-600 text-xs"
                                      >Save</button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleCancelEditHistory(); }}
                                        className="text-gray-500 text-xs"
                                      >Cancel</button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleStartEditHistory(message); }}
                                        className="text-blue-600 text-xs"
                                      >Edit</button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteHistory(message); }}
                                        className="text-red-600 text-xs"
                                      >Delete</button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleHistorySaveAsQuery(message); }}
                                        className="text-indigo-600 text-xs"
                                      >Save as Query</button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleHistoryRun(message); }}
                                        className="text-green-600 text-xs"
                                      >Run</button>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded">
                                {message.sqlQuery.substring(0, 120)}...
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Natural Language Input */}
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Ask in natural language</h3>
                  <textarea
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Ask in natural language"
                    className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleGenerateSql}
                    disabled={!userQuery.trim() || isGeneratingSql}
                    className={`mt-3 px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                      !userQuery.trim() || isGeneratingSql
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isGeneratingSql ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        <span>Generate SQL</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Refine Controls */}
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Refine SQL</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <select
                      value={refineBaseQueryId || ''}
                      onChange={(e) => setRefineBaseQueryId(e.target.value || null)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      <option value="">Select base query…</option>
                      {queries.map(q => (
                        <option key={q.query_id} value={q.query_id}>{q.query_id}</option>
                      ))}
                    </select>
                    <input
                      value={refineInstruction}
                      onChange={(e) => setRefineInstruction(e.target.value)}
                      placeholder="Refine with instruction"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded"
                    />
                    <button
                      onClick={handleRefine}
                      disabled={!refineInstruction.trim()}
                      className={`px-4 py-2 rounded-lg font-medium ${!refineInstruction.trim() ? 'bg-gray-300 text-gray-500' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
                    >
                      Apply
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">Refines the selected saved query using modify-query and replaces the current SQL.</p>
                </div>

                {/* SQL Output moved to right column */}

                {/* AI Commentary */}
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900">AI Commentary</h3>
                  </div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap">{commentary || 'No commentary yet.'}</div>
                </div>
              </div>

              {/* Right Panel - SQL and Results */}
              <div className="space-y-4">
                {/* SQL Output Box */}
                <div className="bg-white rounded-lg border border-gray-200 h-[500px] lg:h-[600px] flex flex-col">
                  <div className="p-3 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">SQL Query</h3>
                      <button 
                        onClick={() => setShowSqlModal(true)} 
                        className="p-1 text-gray-400 hover:text-gray-600" 
                        title="Expand SQL"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <div className="relative">
                      <textarea
                        value={generatedSql}
                        onChange={(e) => setGeneratedSql(e.target.value)}
                        placeholder="Generated SQL will appear here..."
                        className="w-full flex-1 p-3 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[350px] lg:min-h-[450px]"
                        style={{ whiteSpace: 'pre-wrap' }}
                      />
                      <div className="absolute top-2 right-2 text-xs text-gray-400">
                        {generatedSql.split('\n').length} lines
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        onClick={handleSaveOnly}
                        disabled={!generatedSql.trim()}
                        className={`px-4 py-2 rounded-lg font-medium ${
                          !generatedSql.trim() ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        Save as Query
                      </button>
                      <button
                        onClick={handleExecuteQuery}
                        disabled={!generatedSql.trim() || isExecutingQuery}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                          !generatedSql.trim() || isExecutingQuery
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {isExecutingQuery ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Running...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z" />
                            </svg>
                            <span>Run Query</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Results Box */}
                <div className="bg-white rounded-lg border border-gray-200 h-[300px] flex flex-col">
                  <div className="p-3 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">Query Results</h3>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">
                          {queryResults.length} rows
                        </span>
                        {queryResults.length > 0 && (
                          <button
                            onClick={handleExportResults}
                            className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Export CSV</span>
                          </button>
                        )}
                        <button 
                          onClick={() => setShowResultsModal(true)} 
                          className="p-1 text-gray-400 hover:text-gray-600" 
                          title="Expand Results"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-hidden">
                    {queryResults.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p>No results yet</p>
                          <p className="text-sm">Run a query to see results</p>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full overflow-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50 sticky top-0 z-30 shadow-sm">
                            <tr>
                              {resultColumns.map((column, index) => (
                                <th
                                  key={index}
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                                >
                                  {column}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {pageRows.map((row, rowIndex) => (
                              <tr key={rowIndex} className="hover:bg-gray-50">
                                {resultColumns.map((column, colIndex) => (
                                  <td
                                    key={colIndex}
                                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                                  >
                                    {row[column]}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {queryResults.length > resultsPageSize && (
                          <div className="flex items-center justify-center space-x-4 py-3 text-sm text-gray-700 bg-gray-50 border-t">
                            <button
                              onClick={() => setResultsPage(p => Math.max(1, p - 1))}
                              disabled={resultsPage === 1}
                              className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
                            >
                              Previous
                            </button>
                            <span>
                              Page {resultsPage} of {totalPages}
                            </span>
                            <button
                              onClick={() => setResultsPage(p => Math.min(totalPages, p + 1))}
                              disabled={resultsPage === totalPages}
                              className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* SQL Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white w-11/12 h-5/6 rounded-lg shadow-lg flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-medium">SQL (Landscape)</h3>
              <button onClick={() => setShowSqlModal(false)} className="text-gray-600 hover:text-gray-800">Close</button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              <div className="relative h-full">
                <textarea
                  value={generatedSql}
                  onChange={(e) => setGeneratedSql(e.target.value)}
                  className="w-full h-full p-3 border border-gray-300 rounded-lg font-mono text-sm resize-none"
                  style={{ whiteSpace: 'pre-wrap' }}
                />
                <div className="absolute top-2 right-2 text-xs text-gray-400 bg-white px-2 py-1 rounded">
                  {generatedSql.split('\n').length} lines
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {showResultsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white w-11/12 h-5/6 rounded-lg shadow-lg flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-medium">Results (Landscape)</h3>
              <button onClick={() => setShowResultsModal(false)} className="text-gray-600 hover:text-gray-800" title="Close">
                <svg className="w-5 h-5" viewBox="0 0 24 24" stroke="currentColor" fill="none">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              {queryResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No rows returned</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-30 shadow-sm">
                      <tr>
                        {resultColumns.map((column, index) => (
                          <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {queryResults.map((row, idx) => (
                        <tr key={idx}>
                          {resultColumns.map((column, colIndex) => (
                            <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row[column]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatQueryPage;

