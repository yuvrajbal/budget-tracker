import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Upload, DollarSign, TrendingUp, Calendar, Edit3, Check, X, AlertCircle, CheckCircle, CreditCard } from 'lucide-react';

// Use environment variable for API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Define types
interface Transaction {
  ID: number;
  Date: string;
  'Transaction Name': string;
  Category: string;
  Amount: string | number;
  'Account Type': string;
}

interface CategorySummary {
  spent: number;
  budget: number;
  remaining: number;
  percentage_used: number;
  transactions_count: number;
  over_budget: boolean;
}

interface Budgets {
  [category: string]: number;
}

interface Summary {
  [category: string]: CategorySummary;
}

// Chart data types
interface PieChartData {
  name: string;
  value: number;
  color: string;
}

interface BarChartData {
  category: string;
  budget: number;
  spent: number;
}

const BudgetTracker: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState<Summary>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budgets>({});
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [editingBudgets, setEditingBudgets] = useState<boolean>(false);
  const [tempBudgets, setTempBudgets] = useState<Budgets>({});
  const [editingTransaction, setEditingTransaction] = useState<number | null>(null);
  const [totals, setTotals] = useState<{totalSpent: number; totalBudget: number; remaining: number}>({ 
    totalSpent: 0, 
    totalBudget: 0,
    remaining: 0
  });

  const COLORS = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff88',
    '#ff0088', '#8800ff', '#00ffff', '#ff8800', '#8888ff'
  ];

  const categories = [
    'Groceries', 'Transportation', 'Dining & Restaurants', 'Utilities',
    'Entertainment', 'Shopping', 'Healthcare', 'Travel', 'Learning & Education', 'Other'
  ];

  // Fetch data functions
  const fetchSummary = async (month: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/summary?month=${month}`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (month: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions?month=${month}`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchBudgets = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/budgets`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      setBudgets(data);
      setTempBudgets(data);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    }
  };

  const fetchAvailableMonths = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/months`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      setAvailableMonths(data);
      
      // If no month is selected yet and we have available months, select the most recent one
      if (currentMonth === '' && data.length > 0) {
        setCurrentMonth(data[0]); // The API returns months sorted by newest first
      }
    } catch (error) {
      console.error('Error fetching months:', error);
    }
  };

  // Calculate totals from summary data
  const calculateTotals = (summaryData: Summary) => {
    const totalSpent = Object.values(summaryData).reduce((sum, category) => sum + category.spent, 0);
    const totalBudget = Object.values(summaryData).reduce((sum, category) => sum + category.budget, 0);
    const remaining = totalBudget - totalSpent;
    
    setTotals({
      totalSpent,
      totalBudget,
      remaining
    });
  };

  useEffect(() => {
    fetchSummary(currentMonth);
    fetchTransactions(currentMonth);
    fetchBudgets();
    fetchAvailableMonths();
  }, [currentMonth]);

  // Update totals whenever summary changes
  useEffect(() => {
    calculateTotals(summary);
  }, [summary]);

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, accountType: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('account_type', accountType);

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/upload-csv`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        alert(`Success! Processed ${result.total_transactions} transactions, added ${result.new_transactions} new ones.`);
        fetchSummary(currentMonth);
        fetchTransactions(currentMonth);
        fetchAvailableMonths();
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert('Upload failed: ' + error.message);
      } else {
        alert('Upload failed with unknown error');
      }
    } finally {
      setLoading(false);
      event.target.value = ''; // Reset file input
    }
  };

  // Update transaction category
  const updateTransactionCategory = async (transactionId: number, newCategory: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/${transactionId}/category`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category: newCategory }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setTransactions(prev =>
          prev.map(t =>
            t.ID === transactionId ? { ...t, Category: newCategory } : t
          )
        );
        setEditingTransaction(null);
        fetchSummary(currentMonth); // Refresh summary
      }
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Failed to update category. Please try again.');
    }
  };

  // Update budgets
  const saveBudgets = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/budgets`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tempBudgets),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setBudgets(tempBudgets);
        setEditingBudgets(false);
        fetchSummary(currentMonth); // Refresh summary
        alert('Budgets updated successfully');
      }
    } catch (error) {
      console.error('Error saving budgets:', error);
      alert('Failed to update budgets. Please try again.');
    }
  };

  // Prepare chart data
  const pieChartData: PieChartData[] = Object.entries(summary).map(([category, data], index) => ({
    name: category,
    value: data.spent,
    color: COLORS[index % COLORS.length]
  }));

  const barChartData: BarChartData[] = Object.entries(summary).map(([category, data]) => ({
    category: category.length > 10 ? category.substring(0, 10) + '...' : category,
    budget: data.budget,
    spent: data.spent,
  }));

  const getProgressColor = (percentage: number): string => {
    if (percentage <= 70) return 'bg-green-500';
    if (percentage <= 90) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusIcon = (data: CategorySummary): React.ReactElement => {
    if (data.over_budget) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  // Custom formatter for tooltips
  const currencyFormatter = (value: number): string => `$${value.toFixed(2)}`;

  const Dashboard = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(summary).map(([category, data]) => (
          <div
            key={category}
            className={`bg-white rounded-xl p-6 shadow-lg border-l-4 transition-transform hover:scale-105 ${
              data.over_budget ? 'border-red-500' : 'border-green-500'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-gray-800 text-sm">{category}</h3>
                <p className="text-2xl font-bold text-gray-900">${data.spent.toFixed(2)}</p>
              </div>
              {getStatusIcon(data)}
            </div>
            
            <div className="mb-3">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Budget: ${data.budget}</span>
                <span>{data.percentage_used.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(data.percentage_used)}`}
                  style={{ width: `${Math.min(data.percentage_used, 100)}%` }}
                ></div>
              </div>
            </div>
            
            <div className="flex justify-between text-xs text-gray-500">
              <span>{data.transactions_count} transactions</span>
              <span>
                {data.over_budget ? 
                  `Over by $${(data.spent - data.budget).toFixed(2)}` :
                  `$${data.remaining.toFixed(2)} left`
                }
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold mb-4 text-center">Spending by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => currencyFormatter(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold mb-4 text-center">Budget vs Actual</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip formatter={(value: number) => currencyFormatter(value)} />
              <Legend />
              <Bar dataKey="budget" fill="#8884d8" name="Budget" />
              <Bar dataKey="spent" fill="#82ca9d" name="Spent" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const TransactionsTab = () => (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold">Transactions for {currentMonth}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map((transaction, index) => (
              <tr key={transaction.ID || index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.Date}</td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{transaction['Transaction Name']}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {editingTransaction === transaction.ID ? (
                    <select
                      value={transaction.Category}
                      onChange={(e) => updateTransactionCategory(transaction.ID, e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {transaction.Category}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  ${typeof transaction.Amount === 'string' 
                    ? parseFloat(transaction.Amount || '0').toFixed(2) 
                    : transaction.Amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transaction['Account Type']}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {editingTransaction === transaction.ID ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingTransaction(null)}
                        className="p-1 bg-gray-100 rounded hover:bg-gray-200"
                      >
                        <X className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => updateTransactionCategory(transaction.ID, transaction.Category)}
                        className="p-1 bg-green-100 rounded hover:bg-green-200"
                      >
                        <Check className="w-4 h-4 text-green-600" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingTransaction(transaction.ID)}
                      className="p-1 bg-blue-50 rounded hover:bg-blue-100"
                    >
                      <Edit3 className="w-4 h-4 text-blue-600" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const BudgetTab = () => (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Budget Settings</h3>
        {editingBudgets ? (
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setTempBudgets(budgets);
                setEditingBudgets(false);
              }}
              className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 flex items-center"
            >
              <X className="w-4 h-4 mr-1" /> Cancel
            </button>
            <button
              onClick={saveBudgets}
              className="px-3 py-1 bg-green-100 rounded hover:bg-green-200 flex items-center"
            >
              <Check className="w-4 h-4 mr-1" /> Save
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingBudgets(true)}
            className="px-3 py-1 bg-blue-100 rounded hover:bg-blue-200 flex items-center"
          >
            <Edit3 className="w-4 h-4 mr-1" /> Edit Budgets
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(category => (
          <div key={category} className="border rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-gray-800">{category}</h4>
              {editingBudgets && (
                <span className="text-xs text-gray-500">Edit amount</span>
              )}
            </div>
            
            {editingBudgets ? (
              <div className="flex items-center">
                <span className="text-gray-600 mr-1">$</span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={tempBudgets[category] || 0}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setTempBudgets(prev => ({
                      ...prev,
                      [category]: value
                    }));
                  }}
                  className="w-full border rounded px-2 py-1"
                />
              </div>
            ) : (
              <div className="text-xl font-semibold text-gray-900">
                ${(budgets[category] || 0).toFixed(2)}
              </div>
            )}
            
            {!editingBudgets && summary[category] && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Used: ${summary[category].spent.toFixed(2)}</span>
                  <span>{summary[category].percentage_used.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getProgressColor(summary[category].percentage_used)}`}
                    style={{ width: `${Math.min(summary[category].percentage_used, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const UploadTab = () => {
    const [selectedAccountType, setSelectedAccountType] = useState<string>('TD');
    
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-6">Upload Transaction Data</h3>
        
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center mb-4">
            <Upload className="w-6 h-6 text-blue-500 mr-2" />
            <h4 className="font-medium text-gray-800">Upload Bank Statement</h4>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Bank Format</label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio h-4 w-4 text-blue-600"
                  name="accountType"
                  value="TD"
                  checked={selectedAccountType === 'TD'}
                  onChange={() => setSelectedAccountType('TD')}
                />
                <span className="ml-2">TD Bank</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio h-4 w-4 text-blue-600"
                  name="accountType"
                  value="AMEX"
                  checked={selectedAccountType === 'AMEX'}
                  onChange={() => setSelectedAccountType('AMEX')}
                />
                <span className="ml-2">American Express</span>
              </label>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Upload your bank statement CSV file to import transactions. Select the correct format for your bank.
          </p>
          
          <label className="flex items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:bg-gray-100">
            <input 
              type="file" 
              accept=".csv" 
              onChange={(e) => handleFileUpload(e, selectedAccountType)}
              className="hidden" 
              disabled={loading}
            />
            <div className="text-center">
              <Upload className="w-10 h-10 text-gray-500 mx-auto mb-2" />
              <span className="block text-sm font-medium text-gray-700 mb-1">
                {loading ? 'Uploading...' : 'Click to select CSV file'}
              </span>
              <span className="text-xs text-gray-500">
                Selected format: {selectedAccountType}
              </span>
            </div>
          </label>
        </div>

        
      </div>
    );
  };

  const TotalsTab = () => {
    // Calculate percentage of budget used
    const percentageUsed = totals.totalBudget > 0 
      ? (totals.totalSpent / totals.totalBudget) * 100 
      : 0;
    
    // Determine status color
    const getStatusColor = () => {
      if (percentageUsed > 100) return 'text-red-600';
      if (percentageUsed > 90) return 'text-yellow-600';
      return 'text-green-600';
    };

    // Format currency
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }).format(amount);
    };

    return (
      <div className="space-y-8">
        {/* Main totals card */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-6 text-center">Monthly Financial Summary</h3>
          
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
            <div className="text-center p-6 bg-blue-50 rounded-lg w-full md:w-1/3">
              <h4 className="text-sm font-medium text-gray-500 mb-1">Total Budget</h4>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(totals.totalBudget)}</p>
            </div>
            
            <div className="text-center p-6 bg-blue-50 rounded-lg w-full md:w-1/3">
              <h4 className="text-sm font-medium text-gray-500 mb-1">Total Spent</h4>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(totals.totalSpent)}</p>
            </div>
            
            <div className="text-center p-6 bg-blue-50 rounded-lg w-full md:w-1/3">
              <h4 className="text-sm font-medium text-gray-500 mb-1">Remaining</h4>
              <p className={`text-3xl font-bold ${totals.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totals.remaining)}
              </p>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Budget Usage</span>
              <span className={`text-sm font-semibold ${getStatusColor()}`}>
                {percentageUsed.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  percentageUsed > 100 ? 'bg-red-500' : 
                  percentageUsed > 90 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(percentageUsed, 100)}%` }}
              ></div>
            </div>
          </div>
          
          <div className="text-sm text-gray-600 mt-4">
            {percentageUsed > 100 ? (
              <p className="text-red-600 font-medium">
                You've exceeded your total budget by {formatCurrency(Math.abs(totals.remaining))}.
              </p>
            ) : percentageUsed > 90 ? (
              <p className="text-yellow-600 font-medium">
                You're approaching your budget limit. {formatCurrency(totals.remaining)} remaining.
              </p>
            ) : (
              <p className="text-green-600 font-medium">
                You're within budget. {formatCurrency(totals.remaining)} remaining.
              </p>
            )}
          </div>
        </div>
        
        {/* Category breakdown */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-6">Category Breakdown</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">% Used</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(summary).map(([category, data]) => (
                  <tr key={category} className={data.over_budget ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(data.budget)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(data.spent)}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${data.over_budget ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(data.remaining)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`text-sm mr-2 ${
                          data.percentage_used > 100 ? 'text-red-600' :
                          data.percentage_used > 90 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {data.percentage_used.toFixed(1)}%
                        </span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getProgressColor(data.percentage_used)}`}
                            style={{ width: `${Math.min(data.percentage_used, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">Total</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{formatCurrency(totals.totalBudget)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{formatCurrency(totals.totalSpent)}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${totals.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(totals.remaining)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`text-sm font-bold mr-2 ${getStatusColor()}`}>
                        {percentageUsed.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget Dashboard</h1>
          <p className="text-gray-600">Track your spending and stay on budget</p>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center">
          <select
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="mr-4 border rounded-md px-3 py-2 bg-white"
          >
            {availableMonths.map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
          
          {loading && (
            <div className="flex items-center text-blue-600">
              <span className="animate-spin mr-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
              <span>Loading...</span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 border-b">
        <nav className="flex flex-wrap space-x-2 md:space-x-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-4 px-1 font-medium text-sm border-b-2 ${
              activeTab === 'dashboard' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-1" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('totals')}
            className={`py-4 px-1 font-medium text-sm border-b-2 ${
              activeTab === 'totals' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <DollarSign className="w-4 h-4 inline mr-1" />
            Totals
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-4 px-1 font-medium text-sm border-b-2 ${
              activeTab === 'transactions' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <CreditCard className="w-4 h-4 inline mr-1" />
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('budgets')}
            className={`py-4 px-1 font-medium text-sm border-b-2 ${
              activeTab === 'budgets' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-1" />
            Budgets
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-4 px-1 font-medium text-sm border-b-2 ${
              activeTab === 'upload' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-1" />
            Upload
          </button>
        </nav>
      </div>

      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'totals' && <TotalsTab />}
      {activeTab === 'transactions' && <TransactionsTab />}
      {activeTab === 'budgets' && <BudgetTab />}
      {activeTab === 'upload' && <UploadTab />}
    </div>
  );
};

export default BudgetTracker;