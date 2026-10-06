import React, { useState } from 'react';
import { Shield } from 'lucide-react';

export default function UserLogin({ onComplete }) {
  const [profile, setProfile] = useState({
    name: '',
    mobile: '',
    bloodGroup: '',
    allergies: '',
    medicalConditions: '',
    emergencyContact: ''
  });

  const handleChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('userProfile', JSON.stringify(profile));
    onComplete(profile);
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900 via-slate-950 to-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl shadow-[0_0_40px_rgba(6,182,212,0.15)] border border-cyan-500/30 w-full max-w-md text-slate-200">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-cyan-500/20 p-3 rounded-2xl text-cyan-400">
            <Shield size={32} />
          </div>
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tight">User Registration</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input required name="name" placeholder="Full Name" onChange={handleChange} className="w-full bg-white/5 border border-cyan-500/30 rounded-xl p-3 focus:ring-2 focus:ring-cyan-500 outline-none text-white placeholder-slate-400" />
          <input required name="mobile" placeholder="Mobile Number" onChange={handleChange} className="w-full bg-white/5 border border-cyan-500/30 rounded-xl p-3 focus:ring-2 focus:ring-cyan-500 outline-none text-white placeholder-slate-400" />
          <input required name="emergencyContact" placeholder="Emergency Contact Number" onChange={handleChange} className="w-full bg-white/5 border border-cyan-500/30 rounded-xl p-3 focus:ring-2 focus:ring-cyan-500 outline-none text-white placeholder-slate-400" />
          <select required name="bloodGroup" onChange={handleChange} className="w-full bg-white/5 border border-cyan-500/30 rounded-xl p-3 focus:ring-2 focus:ring-cyan-500 outline-none text-white [&>option]:bg-slate-900">
            <option value="" disabled selected>Select Blood Group</option>
            <option value="A+">A+</option><option value="A-">A-</option>
            <option value="B+">B+</option><option value="B-">B-</option>
            <option value="O+">O+</option><option value="O-">O-</option>
            <option value="AB+">AB+</option><option value="AB-">AB-</option>
          </select>
          <textarea name="allergies" placeholder="Allergies (Optional)" onChange={handleChange} className="w-full bg-white/5 border border-cyan-500/30 rounded-xl p-3 focus:ring-2 focus:ring-cyan-500 outline-none text-white placeholder-slate-400" rows="2"></textarea>
          <textarea name="medicalConditions" placeholder="Pre-existing Medical Conditions (Optional)" onChange={handleChange} className="w-full bg-white/5 border border-cyan-500/30 rounded-xl p-3 focus:ring-2 focus:ring-cyan-500 outline-none text-white placeholder-slate-400" rows="2"></textarea>
          <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-lg py-4 rounded-2xl shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all">
            Save Profile & Continue
          </button>
        </form>
      </div>
    </div>
  );
}
