// frontend/src/pages/NewComplaintPage.jsx
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Upload, X, Sparkles, MapPin, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { complaintsApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { CATEGORIES, PRIORITIES, ETA_MAP } from '../utils/helpers';

const KEYWORD_MAP = {
  water: 'Water', tap: 'Water', leak: 'Water', pipe: 'Water',
  wifi: 'WiFi', internet: 'WiFi', network: 'WiFi',
  mess: 'Mess', food: 'Mess', canteen: 'Mess', meal: 'Mess',
  power: 'Electricity', electricity: 'Electricity', light: 'Electricity', fan: 'Electricity',
  door: 'Maintenance', window: 'Maintenance', lock: 'Maintenance', broken: 'Maintenance',
  toilet: 'Sanitation', bathroom: 'Sanitation', clean: 'Sanitation',
  security: 'Security', guard: 'Security', theft: 'Security',
};

const suggestCategory = (text) => {
  const lower = text.toLowerCase();
  for (const [kw, cat] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(kw)) return cat;
  }
  return null;
};

const priorityInfo = {
  Low:    { color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20',  desc: 'Non-urgent, can wait 5–7 days' },
  Medium: { color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/20',  desc: 'Affects daily life, 2–4 days' },
  High:   { color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', desc: 'Significant disruption, 1–2 days' },
  Urgent: { color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20',       desc: 'Safety risk — addressed < 24 hrs' },
};

export default function NewComplaintPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '', description: '', category: '', priority: 'Medium',
    location: user?.room_number ? `Block ${user.block}, Room ${user.room_number}` : '',
    block: user?.block || '', roomNumber: user?.room_number || '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }));
  };

  // AI suggest on title blur
  const handleTitleBlur = () => {
    if (form.title.length >= 5) {
      const suggested = suggestCategory(form.title);
      if (suggested && suggested !== form.category) {
        setAiSuggestion(suggested);
      }
    }
  };

  const applyAiSuggestion = () => {
    set('category', aiSuggestion);
    setAiSuggestion(null);
    toast.success(`Category set to "${aiSuggestion}"`);
  };

  // Dropzone
  const onDrop = useCallback((accepted) => {
    const file = accepted[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = e => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    onDropRejected: ([{ errors }]) => toast.error(errors[0].message),
  });

  const removeImage = () => { setImageFile(null); setImagePreview(null); };

  const validate = () => {
    const errs = {};
    if (!form.title.trim())       errs.title = 'Title is required';
    if (!form.description.trim()) errs.description = 'Description is required';
    if (!form.category)           errs.category = 'Please select a category';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) { toast.error('Please fix the errors below'); return; }

    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      if (imageFile) fd.append('image', imageFile);

      const { data } = await complaintsApi.create(fd);
      toast.success('Complaint submitted! Confirmation email sent.');
      navigate(`/complaints/${data.complaint.id}`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to submit complaint';
      if (msg.includes('spam')) toast.error('⚠️ ' + msg, { duration: 5000 });
      else toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const pi = priorityInfo[form.priority];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Raise a Complaint</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Describe your issue clearly and we'll get it resolved.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            className={`input ${errors.title ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder="Brief, clear title (e.g. 'No water in Block A since morning')"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            onBlur={handleTitleBlur}
          />
          {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}

          {/* AI Suggestion */}
          {aiSuggestion && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 flex items-center gap-2 p-2.5 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800"
            >
              <Sparkles size={14} className="text-primary-500 flex-shrink-0" />
              <span className="text-xs text-primary-700 dark:text-primary-300 flex-1">
                AI suggests category: <strong>{aiSuggestion}</strong>
              </span>
              <button type="button" onClick={applyAiSuggestion} className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline">Apply</button>
              <button type="button" onClick={() => setAiSuggestion(null)} className="text-gray-400 hover:text-gray-600">
                <X size={12} />
              </button>
            </motion.div>
          )}
        </div>

        {/* Category + Priority */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              className={`input ${errors.category ? 'border-red-400' : ''}`}
              value={form.category}
              onChange={e => set('category', e.target.value)}
            >
              <option value="">Select category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Priority</label>
            <select
              className="input"
              value={form.priority}
              onChange={e => set('priority', e.target.value)}
            >
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* Priority info banner */}
        <div className={`flex items-start gap-2 p-3 rounded-xl ${pi.bg}`}>
          <AlertTriangle size={14} className={`${pi.color} flex-shrink-0 mt-0.5`} />
          <div className="text-xs">
            <span className={`font-medium ${pi.color}`}>{form.priority} Priority: </span>
            <span className="text-gray-600 dark:text-gray-400">{pi.desc} — estimated resolution <strong>{ETA_MAP[form.priority]}</strong></span>
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <MapPin size={13} className="inline mr-1" />
            Location
          </label>
          <div className="grid grid-cols-3 gap-3">
            <input
              className="input col-span-1"
              placeholder="Block (A/B/C)"
              value={form.block}
              onChange={e => set('block', e.target.value.toUpperCase())}
            />
            <input
              className="input col-span-1"
              placeholder="Room No."
              value={form.roomNumber}
              onChange={e => set('roomNumber', e.target.value)}
            />
            <input
              className="input col-span-1"
              placeholder="e.g. Bathroom"
              value={form.location}
              onChange={e => set('location', e.target.value)}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Description <span className="text-red-500">*</span>
            <span className="text-gray-400 font-normal ml-2 text-xs">({form.description.length}/1000)</span>
          </label>
          <textarea
            className={`input resize-none ${errors.description ? 'border-red-400' : ''}`}
            rows={4}
            placeholder="Describe the problem in detail — when it started, how many people are affected, any steps already taken…"
            value={form.description}
            onChange={e => set('description', e.target.value.slice(0, 1000))}
          />
          {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
        </div>

        {/* Image upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Attach Image <span className="text-gray-400 font-normal">(optional, max 5MB)</span>
          </label>

          {!imagePreview ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200
                ${isDragActive
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
            >
              <input {...getInputProps()} />
              <Upload size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isDragActive ? 'Drop it here!' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP up to 5MB</p>
            </div>
          ) : (
            <div className="img-preview">
              <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover" />
              <div className="img-preview-overlay">
                <button
                  type="button"
                  onClick={removeImage}
                  className="btn-danger px-4 py-2 text-sm"
                >
                  <X size={14} /> Remove
                </button>
              </div>
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                {imageFile?.name}
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary flex-1"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting…
              </>
            ) : (
              'Submit Complaint'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
