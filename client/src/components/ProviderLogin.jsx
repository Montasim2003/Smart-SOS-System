import React, { useState } from 'react';
import { Shield } from 'lucide-react';

export default function ProviderLogin({ onLogin }) {
  const [credentials, setCredentials] = useState({ username: '', password: '', serviceType: 'Ambulance' });

  const handleChange = (e) => setCredentials({ ...credentials, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (credentials.username && credentials.password) {
      onLogin(credentials.serviceType);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900 via-slate-950 to-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl shadow-[0_0_40px_rgba(59,130,246,0.15)] border border-blue-500/30 w-full max-w-md text-slate-200">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-blue-500/20 p-3 rounded-2xl text-blue-400">
            <Shield size={32} />
          </div>
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 tracking-tight">Provider Portal</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <select name="serviceType" value={credentials.serviceType} onChange={handleChange} className="w-full bg-white/5 border border-blue-500/30 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none text-white [&>option]:bg-slate-900">
            <option value="Ambulance">Ambulance</option>
            <option value="Fire Service">Fire Service</option>
            <option value="Hospital">Hospital</option>
            <option value="Police">Police</option>
          </select>
          <input required name="username" placeholder="Username" onChange={handleChange} className="w-full bg-white/5 border border-blue-500/30 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-slate-400" />
          <input required type="password" name="password" placeholder="Password" onChange={handleChange} className="w-full bg-white/5 border border-blue-500/30 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-slate-400" />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg py-4 rounded-2xl shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all">
            Access Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
