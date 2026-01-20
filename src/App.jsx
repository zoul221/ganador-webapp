import React, { useState, useEffect } from 'react';
import { Trash2, Download, Copy, RefreshCw, Database } from 'lucide-react';

export default function JerseyOrderApp() {
  const [orders, setOrders] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    size: '',
    nameOnJersey: '',
    isMuslimah: false,
    isLongSleeve: false,
    paid: false
  });
  const [scriptUrl, setScriptUrl] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  useEffect(() => {
    loadFromStorage();
  }, []);

  const loadFromStorage = async () => {
    try {
      const ordersResult = await window.storage.get('jerseyOrders');
      const urlResult = await window.storage.get('scriptUrl');
      
      if (ordersResult && ordersResult.value) {
        setOrders(JSON.parse(ordersResult.value));
      }
      if (urlResult && urlResult.value) {
        setScriptUrl(urlResult.value);
      }
    } catch (error) {
      console.log('No existing data found');
    }
  };

  const saveToStorage = async (newOrders) => {
    await window.storage.set('jerseyOrders', JSON.stringify(newOrders));
  };

  const saveScriptUrl = async (url) => {
    await window.storage.set('scriptUrl', url);
    setScriptUrl(url);
  };

  const syncToGoogleSheets = async (orderData) => {
    if (!scriptUrl) return;
    
    try {
      setLoading(true);
      setSyncStatus('Syncing to Google Sheets...');
      
      const response = await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });
      
      setSyncStatus('✓ Synced to Google Sheets');
      setTimeout(() => setSyncStatus(''), 3000);
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('✗ Sync failed (data saved locally)');
      setTimeout(() => setSyncStatus(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.number || !formData.size) {
      alert('Please fill in Name, Jersey Number, and Size');
      return;
    }
    
    const newOrder = {
      id: Date.now(),
      ...formData,
      timestamp: new Date().toISOString(),
      price: calculatePrice(formData)
    };
    
    const newOrders = [...orders, newOrder];
    setOrders(newOrders);
    await saveToStorage(newOrders);
    
    if (scriptUrl) {
      await syncToGoogleSheets(newOrder);
    }
    
    setFormData({
      name: '',
      number: '',
      size: '',
      nameOnJersey: '',
      isMuslimah: false,
      isLongSleeve: false,
      paid: false
    });
  };

  const deleteOrder = async (id) => {
    const newOrders = orders.filter(order => order.id !== id);
    setOrders(newOrders);
    await saveToStorage(newOrders);
  };

  const togglePaid = async (id) => {
    const newOrders = orders.map(order => 
      order.id === id ? { ...order, paid: !order.paid } : order
    );
    setOrders(newOrders);
    await saveToStorage(newOrders);
    
    if (scriptUrl) {
      const updatedOrder = newOrders.find(o => o.id === id);
      await syncToGoogleSheets(updatedOrder);
    }
  };

  const calculatePrice = (order) => {
    let price = order.size.includes('yr') ? 38 : 50;
    if (order.isLongSleeve) price += 5;
    if (order.isMuslimah) price += 10;
    if (['4XL', '5XL', '6XL'].includes(order.size)) price += 5;
    if (['7XL', '8XL'].includes(order.size)) price += 10;
    return price;
  };

  const exportToCSV = () => {
    const headers = ['No', 'Name', 'Jersey Number', 'Size', 'Name on Jersey', 'Options', 'Price (RM)', 'Paid', 'Timestamp'];
    const rows = orders.map((order, index) => {
      const options = [];
      if (order.isMuslimah) options.push('Muslimah');
      if (order.isLongSleeve) options.push('Long Sleeve');
      return [
        index + 1,
        order.name,
        order.number,
        order.size,
        order.nameOnJersey || '-',
        options.join(' + ') || '-',
        calculatePrice(order),
        order.paid ? 'Yes' : 'No',
        new Date(order.timestamp).toLocaleString()
      ];
    });
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ganador_jersey_orders_2026.csv';
    a.click();
  };

  const copyForWhatsApp = () => {
    let text = '*GANADOR JERSEY LIST 2026*\n\n*LIST:*\n';
    orders.forEach((order, index) => {
      const options = [];
      if (order.isMuslimah) options.push('Muslimah');
      if (order.isLongSleeve) options.push('Long Sleeve');
      const optionText = options.length > 0 ? ` (${options.join('+')})` : '';
      const jerseyName = order.nameOnJersey ? ` - ${order.nameOnJersey}` : '';
      const paidMark = order.paid ? ' ✅' : '';
      text += `${index + 1}. ${order.name} - ${order.number} - ${order.size}${optionText}${jerseyName}${paidMark}\n`;
    });
    
    text += '\n*‼️CUT OFF DATE AMBIL ORDER: 31st January 2026‼️*\n';
    text += '\n*Harga* -\nAdult: *RM 50 /pc*\nChild: *RM 38 /pc*\n';
    text += '*Add on*\nLong Sleeve : *RM 5*\nMuslimah : *RM 10*\n';
    text += '4XL - 6XL : *RM 5*\n7XL - 8XL : *RM 10*\n';
    text += '*🚚Delivery* : RM 5\n\n';
    text += '*PAYMENT INFO:*\nMAYBANK - 005121411539\nZulhilmi Omar\n';
    text += '_Reference: name - jersey_\n';
    text += '*‼️PLEASE PAY BEFORE: 5th FEBRUARY 2026‼️*';
    
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard! You can now paste into WhatsApp.');
  };

  const sizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL', '1/2 yr', '3/4 yr', '5/6 yr', '7/8 yr'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Database Setup Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="text-indigo-600" size={24} />
              <h2 className="text-xl font-bold text-gray-800">Google Sheets Database</h2>
            </div>
            <button
              onClick={() => setShowSetup(!showSetup)}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            >
              {showSetup ? 'Hide Setup' : scriptUrl ? 'Connected ✓' : 'Setup Database'}
            </button>
          </div>
          
          {showSetup && (
            <div className="space-y-4 border-t pt-4">
              <div className="bg-blue-50 p-4 rounded-md text-sm">
                <h3 className="font-semibold text-blue-900 mb-2">Setup Instructions:</h3>
                <ol className="list-decimal list-inside space-y-2 text-blue-800">
                  <li>Open Google Sheets and create a new spreadsheet</li>
                  <li>Go to Extensions → Apps Script</li>
                  <li>Delete any code and paste the script below</li>
                  <li>Click Deploy → New deployment → Select type: Web app</li>
                  <li>Execute as: Me, Who has access: Anyone</li>
                  <li>Click Deploy and copy the Web app URL</li>
                  <li>Paste the URL below and click Save</li>
                </ol>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-xs font-semibold text-gray-700 mb-2">Google Apps Script Code (copy this):</p>
                <pre className="text-xs bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
{`function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Add headers if first row is empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp', 'Name', 'Number', 'Size', 'Name on Jersey', 
                     'Long Sleeve', 'Muslimah', 'Price', 'Paid', 'ID']);
  }
  
  var data = JSON.parse(e.postData.contents);
  
  // Check if order exists (update) or new (append)
  var lastRow = sheet.getLastRow();
  var found = false;
  
  for (var i = 2; i <= lastRow; i++) {
    if (sheet.getRange(i, 10).getValue() == data.id) {
      // Update existing row
      sheet.getRange(i, 1, 1, 10).setValues([[
        new Date(data.timestamp),
        data.name,
        data.number,
        data.size,
        data.nameOnJersey || '',
        data.isLongSleeve ? 'Yes' : 'No',
        data.isMuslimah ? 'Yes' : 'No',
        data.price,
        data.paid ? 'Yes' : 'No',
        data.id
      ]]);
      found = true;
      break;
    }
  }
  
  if (!found) {
    // Append new row
    sheet.appendRow([
      new Date(data.timestamp),
      data.name,
      data.number,
      data.size,
      data.nameOnJersey || '',
      data.isLongSleeve ? 'Yes' : 'No',
      data.isMuslimah ? 'Yes' : 'No',
      data.price,
      data.paid ? 'Yes' : 'No',
      data.id
    ]);
  }
  
  return ContentService.createTextOutput(JSON.stringify({success: true}));
}`}
                </pre>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Paste your Google Sheets Web App URL here:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={scriptUrl}
                    onChange={(e) => setScriptUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => saveScriptUrl(scriptUrl)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                  >
                    Save URL
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {syncStatus && (
            <div className="mt-2 text-sm text-center text-gray-600">
              {syncStatus}
            </div>
          )}
        </div>

        {/* Order Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-indigo-900 mb-2">Ganador Jersey Order 2026</h1>
          <p className="text-gray-600 mb-4">Cut off date: 31st January 2026 | Payment by: 5th February 2026</p>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Your name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jersey Number *</label>
                <input
                  type="text"
                  value={formData.number}
                  onChange={(e) => setFormData({...formData, number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0-99"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Size *</label>
                <select
                  value={formData.size}
                  onChange={(e) => setFormData({...formData, size: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select size</option>
                  {sizes.map(size => <option key={size} value={size}>{size}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name on Jersey (optional)</label>
                <input
                  type="text"
                  value={formData.nameOnJersey}
                  onChange={(e) => setFormData({...formData, nameOnJersey: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Leave blank if none"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isLongSleeve}
                  onChange={(e) => setFormData({...formData, isLongSleeve: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Long Sleeve (+RM 5)</span>
              </label>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isMuslimah}
                  onChange={(e) => setFormData({...formData, isMuslimah: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Muslimah (+RM 10)</span>
              </label>
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors font-medium disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {loading && <RefreshCw size={16} className="animate-spin" />}
              Add Order
            </button>
          </div>
        </div>

        {orders.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Orders ({orders.length})</h2>
              <div className="flex gap-2">
                <button
                  onClick={copyForWhatsApp}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
                >
                  <Copy size={16} />
                  Copy for WhatsApp
                </button>
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  <Download size={16} />
                  Export CSV
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">No</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Number</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jersey Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Options</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order, index) => (
                    <tr key={order.id} className={order.paid ? 'bg-green-50' : ''}>
                      <td className="px-4 py-3 text-sm">{index + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium">{order.name}</td>
                      <td className="px-4 py-3 text-sm">{order.number}</td>
                      <td className="px-4 py-3 text-sm">{order.size}</td>
                      <td className="px-4 py-3 text-sm">{order.nameOnJersey || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        {order.isMuslimah && <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs mr-1">Muslimah</span>}
                        {order.isLongSleeve && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Long Sleeve</span>}
                        {!order.isMuslimah && !order.isLongSleeve && '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">RM {calculatePrice(order)}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => togglePaid(order.id)}
                            className={`px-3 py-1 rounded text-xs font-medium ${
                              order.paid 
                                ? 'bg-green-600 text-white hover:bg-green-700' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {order.paid ? '✅ Paid' : 'Mark Paid'}
                          </button>
                          <button
                            onClick={() => deleteOrder(order.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Total Orders:</span> {orders.length}
                </div>
                <div>
                  <span className="font-semibold">Paid:</span> {orders.filter(o => o.paid).length}
                </div>
                <div>
                  <span className="font-semibold">Pending:</span> {orders.filter(o => !o.paid).length}
                </div>
                <div>
                  <span className="font-semibold">Total Amount:</span> RM {orders.reduce((sum, o) => sum + calculatePrice(o), 0)}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 bg-white rounded-lg shadow-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-2">Payment Info:</h3>
          <p className="text-sm text-gray-600">MAYBANK - 005121411539</p>
          <p className="text-sm text-gray-600">Zulhilmi Omar</p>
          <p className="text-sm text-gray-600 italic">Reference: name - jersey</p>
        </div>
      </div>
    </div>
  );
}