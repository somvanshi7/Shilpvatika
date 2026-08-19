import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function SettingsPage() {
  const { profile, changePassword } = useAuth();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [pwdMessage, setPwdMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('settings').select('*');
      if (error) throw error;
      
      const settingsObj = {};
      data.forEach(item => {
        settingsObj[item.key] = item.value;
      });
      setSettings(settingsObj);
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSettingChange(key, value) {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }

  function handleDefaultPayChange(category, value) {
    setSettings(prev => ({
      ...prev,
      default_day_pay: {
        ...prev.default_day_pay,
        [category]: Number(value)
      }
    }));
  }

  async function saveSettings() {
    try {
      setSaving(true);
      setMessage('');
      
      const updates = Object.keys(settings).map(key => ({
        key,
        value: settings[key]
      }));

      const { error } = await supabase.from('settings').upsert(updates);
      if (error) throw error;
      
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setMessage('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    setPwdMessage('');
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPwdMessage('Passwords do not match.');
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      setPwdMessage('Password must be at least 6 characters.');
      return;
    }

    try {
      await changePassword(passwordForm.newPassword);
      setPwdMessage('Password updated successfully!');
      setPasswordForm({ newPassword: '', confirmPassword: '' });
      setTimeout(() => setPwdMessage(''), 3000);
    } catch (err) {
      setPwdMessage('Failed to update password: ' + err.message);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Settings</h1>
        <p>System configuration, rates, and profile management</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* Business Settings */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Business Profile</h2>
          
          {loading ? (
            <div style={{ color: 'var(--gray-500)' }}>Loading settings...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-field">
                <label>Company Name</label>
                <input 
                  value={settings.company_name || ''} 
                  onChange={e => handleSettingChange('company_name', e.target.value)} 
                />
              </div>
              <div className="form-field">
                <label>Company Address</label>
                <textarea 
                  value={settings.company_address || ''} 
                  onChange={e => handleSettingChange('company_address', e.target.value)} 
                  rows="2"
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-300)' }}
                />
              </div>
              <div className="form-field">
                <label>Support Email</label>
                <input 
                  value={settings.company_email || ''} 
                  onChange={e => handleSettingChange('company_email', e.target.value)} 
                />
              </div>
              <div className="form-field">
                <label>Contact Number</label>
                <input 
                  value={settings.company_phone || ''} 
                  onChange={e => handleSettingChange('company_phone', e.target.value)} 
                  placeholder="e.g. +91 9876543210"
                />
              </div>
            </div>
          )}
        </div>

        {/* EMS Settings */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Default Rates</h2>
          
          {loading ? (
            <div style={{ color: 'var(--gray-500)' }}>Loading rates...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>Default day pay amounts when adding new employees.</p>
              
              {['Carpenter', 'Labor', 'Painter', 'Design Expert', 'Other'].map(cat => (
                <div key={cat} className="form-field" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <label style={{ width: '120px', marginBottom: 0 }}>{cat}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                    <span style={{ color: 'var(--gray-500)' }}>{settings.currency_symbol || '₹'}</span>
                    <input 
                      type="number" 
                      value={settings.default_day_pay?.[cat] || 0} 
                      onChange={e => handleDefaultPayChange(cat, e.target.value)} 
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Security / Password */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Security</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '1rem' }}>
            Logged in as <strong>{profile?.full_name}</strong>
          </p>
          
          {pwdMessage && (
            <div style={{ 
              padding: '0.75rem', 
              marginBottom: '1rem', 
              borderRadius: 'var(--radius-md)',
              background: pwdMessage.includes('success') ? 'var(--success-50)' : 'var(--error-50)',
              color: pwdMessage.includes('success') ? 'var(--success-700)' : 'var(--error-700)',
              fontSize: '0.875rem'
            }}>
              {pwdMessage}
            </div>
          )}

          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-field">
              <label>New Password</label>
              <input 
                type="password" 
                required 
                value={passwordForm.newPassword} 
                onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} 
              />
            </div>
            <div className="form-field">
              <label>Confirm Password</label>
              <input 
                type="password" 
                required 
                value={passwordForm.confirmPassword} 
                onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} 
              />
            </div>
            <button 
              type="submit"
              style={{ padding: '0.75rem 1.5rem', background: 'var(--gray-900)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 600, marginTop: '0.5rem' }}
            >
              Update Password
            </button>
          </form>
        </div>

      </div>

      {/* Save Settings Action Bar */}
      <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {message && (
            <span style={{ 
              fontWeight: 600,
              color: message.includes('success') ? 'var(--success-700)' : 'var(--error-700)'
            }}>
              {message}
            </span>
          )}
        </div>
        <button 
          onClick={saveSettings}
          disabled={saving || loading}
          style={{ padding: '0.75rem 2rem', background: 'var(--brand-600)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 600, opacity: (saving || loading) ? 0.7 : 1 }}
        >
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>

    </div>
  );
}
