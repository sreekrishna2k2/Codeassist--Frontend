import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: "📊",
      title: "Smart Schema Analysis",
      description: "Automatically analyze your CSV data to understand structure, data types, and relationships between tables.",
      details: [
        "Comprehensive field statistics",
        "Data type inference",
        "Missing value analysis",
        "Unique value detection",
        "Numeric statistics (min, max, mean, median)"
      ]
    },
    {
      icon: "🤖",
      title: "AI-Powered Descriptions",
      description: "Generate intelligent field descriptions using advanced AI to understand your data context.",
      details: [
        "Contextual field explanations",
        "Business logic insights",
        "Data relationship mapping",
        "Automated documentation",
        "Customizable descriptions"
      ]
    },
    {
      icon: "💬",
      title: "Natural Language Queries",
      description: "Ask questions in plain English and get SQL queries generated automatically.",
      details: [
        "Plain English to SQL conversion",
        "Multi-table query support",
        "Complex relationship handling",
        "Query refinement capabilities",
        "Context-aware generation"
      ]
    },
    {
      icon: "🔍",
      title: "Interactive Data Explorer",
      description: "Explore your data with an intuitive interface showing schemas, previews, and field distributions.",
      details: [
        "Visual schema representation",
        "Data preview tables",
        "Field distribution analysis",
        "Interactive field exploration",
        "Real-time data insights"
      ]
    },
    {
      icon: "⚡",
      title: "Query Execution & Results",
      description: "Execute SQL queries and view results with advanced filtering, pagination, and export options.",
      details: [
        "One-click query execution",
        "Paginated result display",
        "CSV export functionality",
        "Result visualization",
        "Performance optimization"
      ]
    },
    {
      icon: "🔄",
      title: "Query Refinement",
      description: "Refine and improve your queries with AI assistance based on your specific requirements.",
      details: [
        "Iterative query improvement",
        "AI-powered suggestions",
        "Query history management",
        "Version control",
        "Smart recommendations"
      ]
    }
  ];

  const benefits = [
    {
      title: "Save 80% of Your Time",
      description: "No more manual SQL writing or data exploration. Get insights in minutes, not hours."
    },
    {
      title: "No SQL Knowledge Required",
      description: "Ask questions in plain English. Our AI handles the complex SQL generation for you."
    },
    {
      title: "Instant Data Understanding",
      description: "Get comprehensive analysis of your data structure and relationships automatically."
    },
    {
      title: "Professional Results",
      description: "Generate clean, optimized SQL queries with proper formatting and best practices."
    }
  ];

  const useCases = [
    {
      title: "Business Analysts",
      description: "Quickly analyze sales data, customer behavior, and business metrics without technical expertise.",
      icon: "📈"
    },
    {
      title: "Data Scientists",
      description: "Accelerate data exploration and hypothesis testing with automated schema analysis.",
      icon: "🔬"
    },
    {
      title: "Marketing Teams",
      description: "Understand customer data, campaign performance, and market trends effortlessly.",
      icon: "📢"
    },
    {
      title: "Product Managers",
      description: "Get insights from user data, feature usage, and product performance metrics.",
      icon: "📱"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-green-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Turn Your Data Into
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600">
                {" "}Insights
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              CodeAssist is the AI-powered data analysis platform that transforms your CSV files into actionable insights. 
              Ask questions in plain English, get SQL queries, and explore your data like never before.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/upload')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
              >
                Start Analyzing Data
              </button>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
              >
                See How It Works
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Powerful Features</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to analyze your data and generate insights, all in one platform.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 mb-6">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.details.map((detail, detailIndex) => (
                    <li key={detailIndex} className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Perfect For</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Whether you're a business analyst, data scientist, or just curious about your data, 
              SchemaPilot makes data analysis accessible to everyone.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {useCases.map((useCase, index) => (
              <div key={index} className="text-center p-6 rounded-lg border-2 border-gray-100 hover:border-blue-200 transition-colors">
                <div className="text-4xl mb-4">{useCase.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{useCase.title}</h3>
                <p className="text-gray-600">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gradient-to-r from-blue-50 to-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get started with SchemaPilot in just a few simple steps.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">1</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Upload Your Data</h3>
              <p className="text-gray-600">Upload your CSV files and let SchemaPilot automatically analyze the structure and relationships.</p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">2</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Ask Questions</h3>
              <p className="text-gray-600">Ask questions in plain English about your data. No SQL knowledge required!</p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">3</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Get Insights</h3>
              <p className="text-gray-600">Receive SQL queries, execute them, and export results. Get insights in minutes!</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Transform Your Data?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of users who are already using CodeAssist to unlock insights from their data.
          </p>
          <button
            onClick={() => navigate('/upload')}
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
          >
            Start Your Free Analysis
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">CodeAssist</h3>
            <p className="text-gray-400 mb-6">AI-Powered Data Analysis Platform</p>
            <div className="flex justify-center space-x-6">
              <button
                onClick={() => navigate('/')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Get Started
              </button>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Features
              </button>
            </div>
            <div className="mt-8 pt-8 border-t border-gray-800">
              <p className="text-gray-400 text-sm">
                © 2024 CodeAssist. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
